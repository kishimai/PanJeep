import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Link, Redirect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Layout } from '@/constants/layout';
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
          placeholderTextColor={Layout.colors.placeholder}
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
        />
        <ThemedText type="defaultSemiBold">Email</ThemedText>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="juan@email.com"
          placeholderTextColor={Layout.colors.placeholder}
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        <ThemedText type="defaultSemiBold">Password</ThemedText>
        <TextInput
          placeholder="••••••••"
          placeholderTextColor={Layout.colors.placeholder}
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
    padding: Layout.spacing.screen,
    justifyContent: 'center',
    gap: 28,
    backgroundColor: Layout.colors.appBackground,
  },
  hero: {
    alignItems: 'center',
    gap: 8,
  },
  card: {
    padding: 20,
    borderRadius: Layout.radii.cardLarge,
    borderWidth: Layout.baseCard.borderWidth,
    borderColor: Layout.baseCard.borderColor,
    backgroundColor: Layout.baseCard.backgroundColor,
    gap: 12,
  },
  input: {
    ...Layout.baseInput,
    color: Layout.colors.textPrimary,
    backgroundColor: Layout.colors.inputBackground,
  },
  button: {
    marginTop: 6,
    backgroundColor: Layout.colors.primary,
    paddingVertical: 14,
    borderRadius: Layout.radii.button,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: Layout.colors.surface,
  },
  error: {
    color: Layout.colors.danger,
  },
  footer: {
    alignItems: 'center',
    gap: 8,
  },
});
