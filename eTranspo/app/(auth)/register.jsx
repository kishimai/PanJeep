import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    await Haptics.selectionAsync();

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
    }

    setLoading(false);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.hero}>
        <ThemedText type="title">Create your account</ThemedText>
        <ThemedText type="subtitle">Join the modern jeepney network.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">Email</ThemedText>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          value={email}
        />

        <ThemedText type="defaultSemiBold">Password</ThemedText>
        <TextInput
          onChangeText={setPassword}
          placeholder="Create a password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

        <Pressable style={styles.primaryButton} onPress={handleRegister} disabled={loading}>
          <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
            {loading ? 'Creating account…' : 'Create account'}
          </ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.footer}>
        <ThemedText>Already have an account?</ThemedText>
        <Link href="/(auth)/login" asChild>
          <Pressable
            onPress={async () => {
              await Haptics.selectionAsync();
            }}>
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
    gap: 24,
  },
  hero: {
    gap: 8,
    alignItems: 'center',
  },
  card: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(120, 120, 120, 0.15)',
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(120, 120, 120, 0.25)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#F9FAFB',
  },
  footer: {
    alignItems: 'center',
    gap: 6,
  },
  error: {
    color: '#DC2626',
  },
});
