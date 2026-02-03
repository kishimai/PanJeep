import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">eTranspo</ThemedText>
        <ThemedText type="subtitle">Rapid jeepney modernization, region by region.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Today’s Snapshot</ThemedText>
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
        <ThemedText type="subtitle">Quick Actions</ThemedText>
        <ThemedView style={styles.cardRow}>
          <ThemedView style={styles.smallCard}>
            <ThemedText type="defaultSemiBold">Find Route</ThemedText>
            <ThemedText>Browse jeepney lines and terminals.</ThemedText>
          </ThemedView>
          <ThemedView style={styles.smallCard}>
            <ThemedText type="defaultSemiBold">Report Issue</ThemedText>
            <ThemedText>Flag route problems or safety concerns.</ThemedText>
          </ThemedView>
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
  },
  header: {
    gap: 8,
  },
  section: {
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(120, 120, 120, 0.2)',
    gap: 6,
  },
  cardValue: {
    fontSize: 24,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  smallCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(120, 120, 120, 0.2)',
    gap: 6,
  },
});
