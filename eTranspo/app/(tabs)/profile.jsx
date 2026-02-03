import { Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const handleSignOut = async () => {
    Haptics.selectionAsync();
    await supabase.auth.signOut();
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Profile</ThemedText>
        <ThemedText type="subtitle">Your commuter identity and preferences.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">Juan Dela Cruz</ThemedText>
        <ThemedText>Daily commuter · Student fare</ThemedText>
        <ThemedText>Preferred region: Metro Manila</ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Payment</ThemedText>
        <ThemedView style={styles.card}>
          <ThemedText>eWallet linked</ThemedText>
          <ThemedText>Auto-discount applied for student ID.</ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Safety & Support</ThemedText>
        <ThemedView style={styles.card}>
          <ThemedText>Emergency contacts ready</ThemedText>
          <ThemedText>Report issues directly from any trip.</ThemedText>
        </ThemedView>
      </ThemedView>

      <Pressable style={styles.signOut} onPress={handleSignOut}>
        <ThemedText type="defaultSemiBold" style={styles.signOutText}>
          Sign out
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 24,
  },
  header: {
    gap: 8,
  },
  section: {
    gap: 12,
  },
  card: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    gap: 6,
  },
  signOut: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  signOutText: {
    color: '#0F172A',
  },
});
