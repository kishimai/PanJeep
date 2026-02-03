import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ProfileScreen() {
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
});
