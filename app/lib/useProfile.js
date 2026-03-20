// app/lib/useProfile.js
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabase';

const profileCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useProfile(session) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isMounted = useRef(true);
    const fetchInProgress = useRef(false);

    const fetchProfile = useCallback(async () => {
        // If no session, we cannot have a profile (user is not signed in at all)
        if (!session) {
            if (isMounted.current) {
                setProfile(null);
                setLoading(false);
            }
            return;
        }

        if (fetchInProgress.current) return;
        fetchInProgress.current = true;
        setLoading(true);
        setError(null);

        const userId = session.user.id;
        const cacheKey = `user:${userId}`;

        try {
            // Check cache first
            const cached = profileCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                if (isMounted.current) {
                    setProfile(cached.profile);
                    setLoading(false);
                }
                fetchInProgress.current = false;
                return;
            }

            // Fetch from database
            let { data, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }

            // If no profile exists, create one
            if (!data) {
                const isGuest = !session.user.email; // anonymous users have no email
                const newProfile = {
                    id: userId,
                    is_guest: isGuest,
                    role: 'passenger',
                    email: session.user.email || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };

                const { data: inserted, error: insertError } = await supabase
                    .from('users')
                    .insert(newProfile)
                    .select()
                    .single();

                if (insertError) {
                    // If conflict (race condition), fetch the existing profile
                    if (insertError.code === '23505') {
                        const { data: existing } = await supabase
                            .from('users')
                            .select('*')
                            .eq('id', userId)
                            .single();
                        if (existing) data = existing;
                    } else {
                        throw insertError;
                    }
                } else {
                    data = inserted;
                }
            }

            // Cache and set state
            profileCache.set(cacheKey, { profile: data, timestamp: Date.now() });
            if (isMounted.current) {
                setProfile(data);
            }
        } catch (err) {
            console.error('Error in fetchProfile:', err);
            if (isMounted.current) {
                setError(err instanceof Error ? err : new Error(String(err)));
            }
        } finally {
            if (isMounted.current) setLoading(false);
            fetchInProgress.current = false;
        }
    }, [session]);

    // Initial fetch on mount and when session changes
    useEffect(() => {
        isMounted.current = true;
        fetchProfile();
        return () => {
            isMounted.current = false;
        };
    }, [fetchProfile]);

    // Manual refresh
    const refresh = useCallback(async () => {
        if (session) {
            profileCache.delete(`user:${session.user.id}`);
            await fetchProfile();
        }
    }, [session, fetchProfile]);

    // Update profile
    const updateProfile = useCallback(async (updates) => {
        if (!session?.user?.id) {
            return { success: false, error: new Error('Not authenticated') };
        }

        try {
            const { data, error: updateError } = await supabase
                .from('users')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', session.user.id)
                .select()
                .single();

            if (updateError) throw updateError;

            const updatedProfile = { ...profile, ...data };
            profileCache.set(`user:${session.user.id}`, { profile: updatedProfile, timestamp: Date.now() });
            if (isMounted.current) setProfile(updatedProfile);

            return { success: true };
        } catch (err) {
            console.error('Update profile error:', err);
            return { success: false, error: err };
        }
    }, [profile, session]);

    return { profile, loading, error, refresh, updateProfile };
}