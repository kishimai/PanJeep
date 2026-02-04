import { View, Text, StyleSheet } from "react-native";

const routes = [
    {
        id: "RTR-01",
        name: "Heritage Loop",
        description: "Intramuros • Rizal Park • National Museum",
    },
    {
        id: "RTR-02",
        name: "Bay City Connector",
        description: "MOA • CCP Complex • Roxas Boulevard",
    },
    {
        id: "RTR-03",
        name: "Northern District",
        description: "Quezon Ave • Banawe • SM North",
    },
];

export default function RoutesScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Routes Overview</Text>
            <Text style={styles.subtitle}>
                View the active jeepney routes prioritized by tourism corridors.
            </Text>

            <View style={styles.list}>
                {routes.map((route) => (
                    <View key={route.id} style={styles.card}>
                        <Text style={styles.cardTitle}>{route.name}</Text>
                        <Text style={styles.cardSubtitle}>{route.id}</Text>
                        <Text style={styles.cardBody}>{route.description}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
        padding: 20,
        gap: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: "#0F172A",
    },
    subtitle: {
        fontSize: 14,
        color: "#64748B",
        marginBottom: 8,
    },
    list: {
        gap: 12,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 16,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F172A",
    },
    cardSubtitle: {
        fontSize: 12,
        color: "#0F766E",
        fontWeight: "600",
        marginTop: 4,
    },
    cardBody: {
        fontSize: 13,
        color: "#475569",
        marginTop: 6,
        lineHeight: 18,
    },
});
