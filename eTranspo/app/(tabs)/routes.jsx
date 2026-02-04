import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Layout } from '@/constants/layout';

export default function RoutesScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Routes</ThemedText>
        <ThemedText style={styles.subtext}>
          Plan trips faster with saved lines and smart suggestions.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">Suggested for you</ThemedText>
        <ThemedText style={styles.cardText}>
          Set your start and destination to unlock route options.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">Favorites</ThemedText>
        <ThemedText style={styles.cardText}>
          Save frequent routes for quick access.
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Layout.spacing.screen,
    gap: Layout.spacing.section,
    backgroundColor: Layout.colors.appBackground,
  },
  header: {
    gap: 8,
  },
  card: {
    padding: 24,
    borderRadius: Layout.radii.card,
    borderWidth: Layout.baseCard.borderWidth,
    borderColor: Layout.baseCard.borderColor,
    backgroundColor: Layout.baseCard.backgroundColor,
    gap: 8,
  },
  subtext: {
    color: Layout.colors.textMuted,
  },
  cardText: {
    color: Layout.colors.textMuted,
  },
});
