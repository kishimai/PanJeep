import { Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Today’s Snapshot
        </ThemedText>
        <ThemedView style={styles.card}>
          <ThemedText type="defaultSemiBold">Active Routes</ThemedText>
          <ThemedText style={styles.cardValue}>12</ThemedText>
          <ThemedText>Routes live across Metro Manila pilot areas.</ThemedText>
        </ThemedView>
        <ThemedView style={styles.card}>
          <ThemedText type="defaultSemiBold">Estimated Arrivals</ThemedText>
          <ThemedText style={styles.cardValue}>3–6 min</ThemedText>
          <ThemedText>Average ETA for nearby stops.</ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Quick Actions
        </ThemedText>
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
    padding: 24,
    justifyContent: 'center',
    gap: 28,
  },
  section: {
    gap: 14,
    alignItems: 'center',
  },
  sectionTitle: {
    textAlign: 'center',
  },
  card: {
    width: '100%',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
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
    borderColor: 'rgba(148, 163, 184, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    gap: 6,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
