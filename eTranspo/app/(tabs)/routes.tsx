import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const routes = [
  {
    name: 'Quiapo – Baclaran',
    status: 'Active',
    eta: '5-8 min',
    stops: '31 stops',
  },
  {
    name: 'Monumento – Pasay Rotonda',
    status: 'Active',
    eta: '7-12 min',
    stops: '28 stops',
  },
  {
    name: 'Taft – Fairview',
    status: 'Limited',
    eta: '12-18 min',
    stops: '36 stops',
  },
];

export default function RoutesScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Routes</ThemedText>
        <ThemedText type="subtitle">Live routes in your region pilot.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        {routes.map((route) => (
          <ThemedView key={route.name} style={styles.card}>
            <ThemedText type="defaultSemiBold">{route.name}</ThemedText>
            <ThemedView style={styles.row}>
              <ThemedText>{route.status}</ThemedText>
              <ThemedText>{route.eta}</ThemedText>
              <ThemedText>{route.stops}</ThemedText>
            </ThemedView>
          </ThemedView>
        ))}
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Plan your ride</ThemedText>
        <ThemedView style={styles.card}>
          <ThemedText>Search routes, see transfers, and save favorites.</ThemedText>
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
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
