// app/lib/useProfile.js
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import { getOrCreateDeviceId } from './deviceId';

// Cache profiles by user ID or device ID
const profileCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function clearAllProfileCaches() {
    profileCache.clear();
}

export async function getProfileById(userId) {
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

export async function ensureGuestProfile() {
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

async function getCacheKey(session) {
    if (session) {
        return `user:${session.user.id}`;
    } else {
        const deviceId = await getOrCreateDeviceId();
        return `guest:${deviceId}`;
    }
}

async function getFromCache(session) {
    try {
        const key = await getCacheKey(session);
        const cached = profileCache.get(key);

        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.profile;
        }

        if (cached) {
            profileCache.delete(key);
        }

        return null;
    } catch (err) {
        return null;
    }
}

async function saveToCache(session, profileData) {
    try {
        const key = await getCacheKey(session);
        profileCache.set(key, {
            profile: profileData,
            timestamp: Date.now()
        });
    } catch (err) {
        console.warn('Failed to cache profile:', err);
    }
}

async function clearCache(session) {
    try {
        const key = await getCacheKey(session);
        profileCache.delete(key);
    } catch (err) {
        console.warn('Failed to clear cache:', err);
    }
}

export function useProfile(session) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isMounted = useRef(true);
    const refreshTimeoutRef = useRef(null);

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

            let profileData = null;

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
                let lastError = null;

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
                        lastError = err;
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

    const updateProfile = useCallback(async (updates) => {
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

            const updatedProfile = { ...profile, ...data };

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
                async () => {
                    await clearCache(session);

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
    const previousSessionId = useRef(null);

    useEffect(() => {
        const currentSessionId = session?.user?.id;

        if (currentSessionId !== previousSessionId.current) {
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