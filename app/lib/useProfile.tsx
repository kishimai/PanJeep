import { useEffect, useState } from 'react';
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
}

export function useProfile(session: Session | null) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProfile() {
            if (!session) {
                // No session - try to get guest profile
                try {
                    const deviceId = await getOrCreateDeviceId();
                    const { data, error } = await supabase
                        .from('users')
                        .select('*')
                        .eq('device_id', deviceId)
                        .eq('is_guest', true)
                        .maybeSingle(); // Use maybeSingle to handle no rows

                    if (error && error.code !== 'PGRST116') { // Not "no rows found" error
                        console.error('Error fetching guest profile:', error);
                    }

                    setProfile(data || null);
                } catch (error) {
                    console.error('Error in guest profile fetch:', error);
                    setProfile(null);
                }
            } else {
                // Has session - fetch authenticated user profile
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (error) {
                    console.error('Error fetching profile:', error);
                    setProfile(null);
                } else {
                    setProfile(data);
                }
            }
            setLoading(false);
        }

        fetchProfile();
    }, [session]);

    return { profile, loading };
}