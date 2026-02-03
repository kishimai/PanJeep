import { Redirect } from 'expo-router';

import { useSupabaseSession } from '@/hooks/use-supabase-session';

export default function Index() {
  const { session, initializing } = useSupabaseSession();

  if (initializing) {
    return null;
  }

  return <Redirect href={session ? '/(tabs)' : '/(auth)/login'} />;
}
