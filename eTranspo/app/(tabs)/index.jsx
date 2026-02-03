import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';

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
          <ThemedText>Metro Manila pilot coverage</ThemedText>
        </ThemedView>
        <ThemedView style={styles.card}>
          <ThemedText type="defaultSemiBold">Estimated Arrivals</ThemedText>
          <ThemedText style={styles.cardValue}>3–6 min</ThemedText>
          <ThemedText>Average ETA near key stops</ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Quick Actions
        </ThemedText>
        <ThemedView style={styles.cardRow}>
          <Pressable
            style={styles.actionCard}
            onPress={async () => {
              await Haptics.selectionAsync();
            }}>
            <ThemedText type="defaultSemiBold">Find Route</ThemedText>
            <ThemedText>Browse jeepney lines</ThemedText>
          </Pressable>
          <Pressable
            style={styles.actionCard}
            onPress={async () => {
              await Haptics.selectionAsync();
            }}>
            <ThemedText type="defaultSemiBold">Report Issue</ThemedText>
            <ThemedText>Safety & route feedback</ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 28,
    alignItems: 'center',
  },
  section: {
    width: '100%',
    maxWidth: 420,
    gap: 14,
  },
  sectionTitle: {
    textAlign: 'center',
  },
  card: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(120, 120, 120, 0.2)',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  cardValue: {
    fontSize: 24,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(120, 120, 120, 0.2)',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});
