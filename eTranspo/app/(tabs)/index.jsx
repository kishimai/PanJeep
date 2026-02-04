import { Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Layout } from '@/constants/layout';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedView>
          <ThemedText type="title">Hi, commuter</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Let’s plan your next trip.</ThemedText>
        </ThemedView>
        <ThemedView style={styles.headerPill}>
          <ThemedText style={styles.headerPillText}>Live updates</ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.hero}>
        <Pressable
          style={({ pressed }) => [styles.searchBar, pressed && styles.cardPressed]}
          onPress={() => Haptics.selectionAsync()}>
          <ThemedText type="defaultSemiBold">Where to?</ThemedText>
          <ThemedText style={styles.searchHint}>Search routes, terminals, stops</ThemedText>
        </Pressable>

        <ThemedView style={styles.mapCard}>
          <ThemedText type="defaultSemiBold">Live map preview</ThemedText>
          <ThemedText>Jeepneys updating every few minutes.</ThemedText>
          <ThemedView style={styles.mapLegend}>
            <ThemedView style={[styles.legendDot, styles.legendActive]} />
            <ThemedText>Active vehicles</ThemedText>
            <ThemedView style={[styles.legendDot, styles.legendInactive]} />
            <ThemedText>Planned routes</ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Today’s Snapshot</ThemedText>
        <ThemedView style={styles.snapshotRow}>
          <ThemedView style={styles.snapshotCard}>
            <ThemedText type="defaultSemiBold">Active Routes</ThemedText>
            <ThemedText style={styles.cardValue}>12</ThemedText>
            <ThemedText style={styles.cardMeta}>+2 since yesterday</ThemedText>
          </ThemedView>
          <ThemedView style={styles.snapshotCard}>
            <ThemedText type="defaultSemiBold">ETA Nearby</ThemedText>
            <ThemedText style={styles.cardValue}>3–6 min</ThemedText>
            <ThemedText style={styles.cardMeta}>Average across terminals</ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Quick Actions</ThemedText>
        <ThemedView style={styles.cardRow}>
          <Pressable
            style={({ pressed }) => [styles.smallCard, pressed && styles.cardPressed]}
            onPress={() => Haptics.selectionAsync()}>
            <ThemedText type="defaultSemiBold">Find Route</ThemedText>
            <ThemedText>Browse jeepney lines and terminals.</ThemedText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.smallCard, pressed && styles.cardPressed]}
            onPress={() => Haptics.selectionAsync()}>
            <ThemedText type="defaultSemiBold">Report Issue</ThemedText>
            <ThemedText>Flag route problems or safety concerns.</ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>
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
  hero: {
    gap: 16,
  },
  searchBar: {
    padding: 16,
    borderRadius: Layout.radii.chip,
    backgroundColor: Layout.colors.surface,
    borderWidth: 1,
    borderColor: Layout.colors.borderInput,
    gap: 4,
  },
  searchHint: {
    color: Layout.colors.textMuted,
  },
  mapCard: {
    padding: 18,
    borderRadius: Layout.radii.cardXL,
    borderWidth: 1,
    borderColor: Layout.colors.border,
    backgroundColor: Layout.colors.surface,
    gap: 10,
  },
  mapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendActive: {
    backgroundColor: Layout.colors.success,
  },
  legendInactive: {
    backgroundColor: Layout.colors.info,
  },
  section: {
    gap: 12,
  },
  snapshotRow: {
    flexDirection: 'row',
    gap: 12,
  },
  snapshotCard: {
    flex: 1,
    padding: 16,
    borderRadius: Layout.radii.chip,
    borderWidth: Layout.baseCard.borderWidth,
    borderColor: Layout.colors.borderSubtle,
    backgroundColor: Layout.baseCard.backgroundColor,
    gap: 6,
  },
  cardValue: {
    fontSize: 26,
  },
  cardMeta: {
    color: Layout.colors.textMuted,
    fontSize: 12,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  smallCard: {
    flex: 1,
    padding: 16,
    borderRadius: Layout.radii.chip,
    borderWidth: Layout.baseCard.borderWidth,
    borderColor: Layout.baseCard.borderColor,
    backgroundColor: Layout.baseCard.backgroundColor,
    gap: 6,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
