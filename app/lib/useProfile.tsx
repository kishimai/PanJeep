// lib/useProfile.js
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import { Session } from '@supabase/supabase-js';
import { getOrCreateDeviceId } from './deviceId';

export interface Profile {
    id: string;
    email: string | null;
    role: string;
    full_name: string | null;
    phone: string | null;
    is_guest: boolean;
    device_id: string | null;
    upgraded_from_guest: boolean;
    avatar_url?: string | null;
    created_at?: string;
    updated_at?: string;
}

interface UseProfileReturn {
    profile: Profile | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: Error }>;
}

// Cache profiles by user ID or device ID (moved outside component)
const profileCache = new Map<string, { profile: Profile | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

// Helper function to clear all profile caches (moved outside hook)
export function clearAllProfileCaches(): void {
    profileCache.clear();
}

// Helper to get profile by ID (moved outside hook)
export async function getProfileById(userId: string): Promise<Profile | null> {
    try {
        const cacheKey = `user:${userId}`;
        const cached = profileCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.profile;
        }

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching profile by ID:', error);
            return null;
        }

        // Cache the result
        profileCache.set(cacheKey, {
            profile: data,
            timestamp: Date.now()
        });

        return data;
    } catch (err) {
        console.error('Error in getProfileById:', err);
        return null;
    }
}

// Initialize guest profile if needed (moved outside hook)
export async function ensureGuestProfile(): Promise<Profile | null> {
    try {
        const deviceId = await getOrCreateDeviceId();

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('device_id', deviceId)
            .eq('is_guest', true)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            console.error('Error checking guest profile:', error);
            return null;
        }

        if (data) {
            return data;
        }

        // Create new guest profile
        const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert({
                device_id: deviceId,
                is_guest: true,
                role: 'passenger',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (createError) {
            console.error('Error creating guest profile:', createError);
            return null;
        }

        // Cache the new guest profile
        const cacheKey = `guest:${deviceId}`;
        profileCache.set(cacheKey, {
            profile: newProfile,
            timestamp: Date.now()
        });

        return newProfile;
    } catch (err) {
        console.error('Error in ensureGuestProfile:', err);
        return null;
    }
}

// Helper functions that don't use hooks
const getCacheKey = async (session: Session | null): Promise<string> => {
    if (session) {
        return `user:${session.user.id}`;
    } else {
        const deviceId = await getOrCreateDeviceId();
        return `guest:${deviceId}`;
    }
};

const getFromCache = async (session: Session | null): Promise<Profile | null> => {
    try {
        const key = await getCacheKey(session);
        const cached = profileCache.get(key);

        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.profile;
        }

        // Remove expired cache
        if (cached) {
            profileCache.delete(key);
        }

        return null;
    } catch (err) {
        return null;
    }
};

const saveToCache = async (session: Session | null, profileData: Profile | null): Promise<void> => {
    try {
        const key = await getCacheKey(session);
        profileCache.set(key, {
            profile: profileData,
            timestamp: Date.now()
        });
    } catch (err) {
        console.warn('Failed to cache profile:', err);
    }
};

const clearCache = async (session: Session | null): Promise<void> => {
    try {
        const key = await getCacheKey(session);
        profileCache.delete(key);
    } catch (err) {
        console.warn('Failed to clear cache:', err);
    }
};

// Main hook
export function useProfile(session: Session | null): UseProfileReturn {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const isMounted = useRef(true);
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const fetchProfile = useCallback(async () => {
        if (!isMounted.current) return;

        setLoading(true);
        setError(null);

        try {
            // Try cache first
            const cachedProfile = await getFromCache(session);
            if (cachedProfile !== null) {
                setProfile(cachedProfile);
                setLoading(false);
                return;
            }

            let profileData: Profile | null = null;

            if (!session) {
                // Fetch guest profile by device ID
                const deviceId = await getOrCreateDeviceId();

                const { data, error: guestError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('device_id', deviceId)
                    .eq('is_guest', true)
                    .maybeSingle();

                if (guestError) {
                    if (guestError.code === 'PGRST116') {
                        // No guest profile found - this is expected for first-time users
                        console.log('No guest profile found, this is a new device');
                    } else {
                        throw new Error(`Guest profile fetch failed: ${guestError.message}`);
                    }
                } else {
                    profileData = data;
                }
            } else {
                // Fetch authenticated user profile with retry logic
                let retries = 3;
                let lastError: Error | null = null;

                while (retries > 0) {
                    try {
                        const { data, error: userError } = await supabase
                            .from('users')
                            .select('*')
                            .eq('id', session.user.id)
                            .maybeSingle();

                        if (userError) {
                            if (userError.code === 'PGRST116') {
                                // No profile found - might need to create one
                                console.log('No user profile found, might need to create');
                                break;
                            }
                            throw new Error(`User profile fetch failed: ${userError.message}`);
                        }

                        profileData = data;
                        break; // Success, exit retry loop
                    } catch (err) {
                        lastError = err instanceof Error ? err : new Error(String(err));
                        retries--;

                        if (retries > 0) {
                            // Exponential backoff: 500ms, 1000ms, 2000ms
                            await new Promise(resolve =>
                                setTimeout(resolve, 500 * (3 - retries))
                            );
                        }
                    }
                }

                if (!profileData && lastError) {
                    throw lastError;
                }
            }

            // Save to cache
            await saveToCache(session, profileData);

            if (isMounted.current) {
                setProfile(profileData);
            }
        } catch (err) {
            console.error('Error in fetchProfile:', err);
            if (isMounted.current) {
                setError(err instanceof Error ? err : new Error(String(err)));
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    }, [session]);

    const updateProfile = useCallback(async (updates: Partial<Profile>) => {
        if (!profile?.id && !session?.user?.id) {
            return { success: false, error: new Error('No profile ID available for update') };
        }

        try {
            const profileId = profile?.id || session?.user?.id;

            const { data, error: updateError } = await supabase
                .from('users')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profileId)
                .select()
                .single();

            if (updateError) {
                throw new Error(`Profile update failed: ${updateError.message}`);
            }

            // Update local state and cache
            const updatedProfile = { ...profile, ...data } as Profile;

            await saveToCache(session, updatedProfile);

            if (isMounted.current) {
                setProfile(updatedProfile);
            }

            return { success: true };
        } catch (err) {
            console.error('Error updating profile:', err);
            return {
                success: false,
                error: err instanceof Error ? err : new Error(String(err))
            };
        }
    }, [profile, session]);

    const refresh = useCallback(async () => {
        await clearCache(session);
        await fetchProfile();
    }, [session, fetchProfile]);

    // Subscribe to profile changes
    useEffect(() => {
        if (!profile?.id) return;

        const subscription = supabase
            .channel('profile-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'users',
                    filter: `id=eq.${profile.id}`
                },
                async (payload) => {
                    console.log('Profile changed:', payload);

                    // Clear cache and refresh
                    await clearCache(session);

                    // Debounce refresh to avoid multiple rapid updates
                    if (refreshTimeoutRef.current) {
                        clearTimeout(refreshTimeoutRef.current);
                    }

                    refreshTimeoutRef.current = setTimeout(() => {
                        if (isMounted.current) {
                            fetchProfile();
                        }
                    }, 300);
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
        };
    }, [profile?.id, session, fetchProfile]);

    // Main fetch effect
    useEffect(() => {
        isMounted.current = true;

        fetchProfile();

        return () => {
            isMounted.current = false;
        };
    }, [fetchProfile]);

    // Refresh profile when session changes significantly
    const previousSessionId = useRef<string | null>(null);

    useEffect(() => {
        const currentSessionId = session?.user?.id;

        if (currentSessionId !== previousSessionId.current) {
            // Session changed (login/logout), clear cache and refetch
            clearCache(session);
            fetchProfile();
            previousSessionId.current = currentSessionId;
        }
    }, [session?.user?.id, fetchProfile]);

    return {
        profile,
        loading,
        error,
        refresh,
        updateProfile
    };
}