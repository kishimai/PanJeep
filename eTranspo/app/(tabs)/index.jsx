import { Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
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
          </ThemedView>
          <ThemedView style={styles.snapshotCard}>
            <ThemedText type="defaultSemiBold">ETA Nearby</ThemedText>
            <ThemedText style={styles.cardValue}>3–6 min</ThemedText>
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
    padding: 20,
    gap: 24,
    backgroundColor: '#F1F5F9',
  },
  hero: {
    gap: 16,
  },
  searchBar: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    gap: 4,
  },
  searchHint: {
    color: '#64748B',
  },
  mapCard: {
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#22C55E',
  },
  legendInactive: {
    backgroundColor: '#38BDF8',
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  cardValue: {
    fontSize: 26,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  smallCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
