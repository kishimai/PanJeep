import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Link, Redirect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Layout } from '@/constants/layout';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const { session } = useSupabaseSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  const handleLogin = async () => {
    Haptics.selectionAsync();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
    }

    setLoading(false);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.brandRow}>
        <ThemedView style={styles.brandBadge}>
          <ThemedText type="defaultSemiBold" style={styles.brandText}>
            eTranspo
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.brandHint}>
          <ThemedText style={styles.brandHintText}>Smart routes, calmer rides</ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.hero}>
        <ThemedText type="title">Welcome back</ThemedText>
        <ThemedText type="subtitle">Sign in to track routes and ride smarter.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
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
          onPress={handleLogin}
          disabled={loading}>
          <ThemedText type="defaultSemiBold" style={styles.buttonText}>
            {loading ? 'Signing in…' : 'Sign In'}
          </ThemedText>
        </Pressable>

        <ThemedText style={styles.helperText}>
          Use your commuter email to sync passes and favorite routes.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.footer}>
        <ThemedText>New to eTranspo?</ThemedText>
        <Link href="/(auth)/register" asChild>
          <Pressable onPress={() => Haptics.selectionAsync()}>
            <ThemedText type="link">Create an account</ThemedText>
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
