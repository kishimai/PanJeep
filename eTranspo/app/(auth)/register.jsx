import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Link, Redirect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { supabase } from '@/lib/supabase';

export default function RegisterScreen() {
  const { session } = useSupabaseSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  const handleRegister = async () => {
    Haptics.selectionAsync();
    setLoading(true);
    setError('');

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
    }

    setLoading(false);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.hero}>
        <ThemedText type="title">Create account</ThemedText>
        <ThemedText type="subtitle">Start tracking routes and cashless trips.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">Full name</ThemedText>
        <TextInput
          placeholder="Juan Dela Cruz"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
        />
        <ThemedText type="defaultSemiBold">Email</ThemedText>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="juan@email.com"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        <ThemedText type="defaultSemiBold">Password</ThemedText>
        <TextInput
          placeholder="••••••••"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleRegister}
          disabled={loading}>
          <ThemedText type="defaultSemiBold" style={styles.buttonText}>
            {loading ? 'Creating…' : 'Create account'}
          </ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.footer}>
        <ThemedText>Already have an account?</ThemedText>
        <Link href="/(auth)/login" asChild>
          <Pressable onPress={() => Haptics.selectionAsync()}>
            <ThemedText type="link">Sign in</ThemedText>
          </Pressable>
        </Link>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 28,
    backgroundColor: '#F1F5F9',
  },
  hero: {
    alignItems: 'center',
    gap: 8,
  },
  card: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  button: {
    marginTop: 6,
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#FFFFFF',
  },
  error: {
    color: '#DC2626',
  },
  footer: {
    alignItems: 'center',
    gap: 8,
  },
});
