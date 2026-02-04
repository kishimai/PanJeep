import { Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Layout } from '@/constants/layout';
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

      <ThemedView style={styles.heroCard}>
        <ThemedView style={styles.avatar}>
          <ThemedText type="defaultSemiBold" style={styles.avatarText}>
            JD
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.heroContent}>
          <ThemedText type="defaultSemiBold">Juan Dela Cruz</ThemedText>
          <ThemedText style={styles.mutedText}>Daily commuter · Student fare</ThemedText>
          <ThemedText style={styles.mutedText}>Preferred region: Metro Manila</ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.statsRow}>
        <ThemedView style={styles.statCard}>
          <ThemedText type="defaultSemiBold">24</ThemedText>
          <ThemedText style={styles.mutedText}>Trips this month</ThemedText>
        </ThemedView>
        <ThemedView style={styles.statCard}>
          <ThemedText type="defaultSemiBold">3</ThemedText>
          <ThemedText style={styles.mutedText}>Saved routes</ThemedText>
        </ThemedView>
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
    padding: Layout.spacing.screen,
    gap: 24,
    backgroundColor: Layout.colors.appBackground,
  },
  header: {
    gap: 8,
  },
  section: {
    gap: 12,
  },
  heroCard: {
    padding: 18,
    borderRadius: Layout.radii.card,
    borderWidth: Layout.baseCard.borderWidth,
    borderColor: Layout.baseCard.borderColor,
    backgroundColor: Layout.baseCard.backgroundColor,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  heroContent: {
    gap: 4,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Layout.radii.pill,
    backgroundColor: Layout.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Layout.colors.accent,
  },
  mutedText: {
    color: Layout.colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: Layout.radii.chip,
    borderWidth: Layout.baseCard.borderWidth,
    borderColor: Layout.colors.borderSubtle,
    backgroundColor: Layout.colors.surfaceMuted,
    gap: 4,
  },
  card: {
    padding: 18,
    borderRadius: Layout.radii.card,
    borderWidth: Layout.baseCard.borderWidth,
    borderColor: Layout.baseCard.borderColor,
    backgroundColor: Layout.baseCard.backgroundColor,
    gap: 6,
  },
  signOut: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: Layout.radii.button,
    borderWidth: 1,
    borderColor: Layout.colors.borderStrong,
    backgroundColor: Layout.colors.surface,
  },
  signOutText: {
    color: Layout.colors.textPrimary,
  },
});
