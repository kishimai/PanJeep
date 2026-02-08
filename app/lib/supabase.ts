// app/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import 'react-native-get-random-values';

// These will be injected at build time by Expo
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Security check: Crash in development if variables are missing
if (__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
    throw new Error(
        'Missing Supabase environment variables. Please check your .env file.'
    );
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
});