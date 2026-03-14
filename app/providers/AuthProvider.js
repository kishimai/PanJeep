// app/providers/AuthProvider.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({
    session: null,
    isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            try {
                // Try to get current session
                const { data: { session: currentSession }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Error getting session:', error);
                    // If refresh token is invalid, clear the session
                    if (error.message.includes('Invalid Refresh Token')) {
                        await supabase.auth.signOut();
                    }
                }

                if (mounted) setSession(currentSession);
            } catch (error) {
                console.error('Auth initialization error:', error);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        initializeAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            if (mounted) setSession(newSession);
        });

        return () => {
            mounted = false;
            subscription?.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ session, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}