import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Profile</ThemedText>
        <ThemedText>Commuter preferences and payments</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">Juan Dela Cruz</ThemedText>
        <ThemedText>Daily commuter · Student fare</ThemedText>
        <ThemedText>Preferred region: Metro Manila</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">Payments</ThemedText>
        <ThemedText>eWallet linked</ThemedText>
        <ThemedText>Auto-discount enabled</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">Safety</ThemedText>
        <ThemedText>Emergency contacts ready</ThemedText>
        <ThemedText>Report issues from any trip</ThemedText>
      </ThemedView>

      <Pressable
        style={styles.signOut}
        onPress={async () => {
          await Haptics.selectionAsync();
          await supabase.auth.signOut();
        }}>
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
    padding: 20,
    gap: 16,
  },
  header: {
    gap: 6,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(120, 120, 120, 0.2)',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  signOut: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(120, 120, 120, 0.3)',
  },
  signOutText: {
    color: '#111827',
  },
});
