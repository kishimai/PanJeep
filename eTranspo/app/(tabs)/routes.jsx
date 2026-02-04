import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Layout } from '@/constants/layout';

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
    backgroundColor: Layout.colors.appBackground,
  },
  card: {
    padding: 24,
    borderRadius: Layout.radii.card,
    borderWidth: Layout.baseCard.borderWidth,
    borderColor: Layout.baseCard.borderColor,
    backgroundColor: Layout.baseCard.backgroundColor,
    alignItems: 'center',
    gap: 8,
  },
  text: {
    textAlign: 'center',
  },
  subtext: {
    textAlign: 'center',
    color: Layout.colors.textMuted,
  },
});
