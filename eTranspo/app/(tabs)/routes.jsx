import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function RoutesScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle" style={styles.text}>
          Routes coming soon
        </ThemedText>
        <ThemedText style={styles.subtext}>
          We’re preparing detailed route maps and stop data.
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F1F5F9',
  },
  card: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    textAlign: 'center',
  },
  subtext: {
    textAlign: 'center',
    color: '#64748B',
  },
});
