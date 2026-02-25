import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

const ProfileContext = createContext();

export function ProfileProvider({ children }) {
    // Auth state
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Profile state
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);

    // Initialize auth and listen to changes
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setAuthLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setAuthLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Fetch profile whenever user changes
    useEffect(() => {
        if (!user) {
            setProfile(null);
            return;
        }

        const fetchProfile = async () => {
            setProfileLoading(true);
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;
                setProfile(data);
            } catch (err) {
                console.error('Error fetching profile:', err);
                setProfile(null);
            } finally {
                setProfileLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    // Auth methods
    const signIn = (data) => supabase.auth.signInWithPassword(data);
    const signUp = (data) => supabase.auth.signUp(data);
    const signOut = async () => {
        await supabase.auth.signOut();
        // Profile will be cleared automatically by the effect above
    };

    const value = {
        // Auth
        user,
        authLoading,
        signIn,
        signUp,
        signOut,
        // Profile
        profile,
        profileLoading,
        setProfile, // if you need to manually update profile
    };

    return (
        <ProfileContext.Provider value={value}>
            {children}
        </ProfileContext.Provider>
    );
}

export function useProfile() {
    return useContext(ProfileContext);
}