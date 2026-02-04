import { View, Text, StyleSheet } from "react-native";

export default function HomeScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Good day, Lakbay Rider</Text>
            <Text style={styles.subtitle}>
                Keep track of your next ride and the latest route advisories.
            </Text>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Today’s Highlights</Text>
                <Text style={styles.cardBody}>
                    Real-time jeepney coverage is active across key tourism
                    corridors. Check Routes for live updates.
                </Text>
            </View>

            <View style={styles.row}>
                <View style={[styles.smallCard, styles.primaryCard]}>
                    <Text style={styles.smallCardTitle}>Live Routes</Text>
                    <Text style={styles.smallCardValue}>18</Text>
                </View>
                <View style={[styles.smallCard, styles.secondaryCard]}>
                    <Text style={styles.smallCardTitle}>Active Stops</Text>
                    <Text style={styles.smallCardValue}>56</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
        padding: 20,
        gap: 18,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: "#0F172A",
    },
    subtitle: {
        fontSize: 14,
        color: "#64748B",
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F172A",
        marginBottom: 8,
    },
    cardBody: {
        fontSize: 14,
        color: "#475569",
        lineHeight: 20,
    },
    row: {
        flexDirection: "row",
        gap: 12,
    },
    smallCard: {
        flex: 1,
        borderRadius: 18,
        padding: 16,
    },
    primaryCard: {
        backgroundColor: "#0F766E",
    },
    secondaryCard: {
        backgroundColor: "#1D4ED8",
    },
    smallCardTitle: {
        color: "#E2E8F0",
        fontSize: 12,
        fontWeight: "600",
    },
    smallCardValue: {
        color: "#FFFFFF",
        fontSize: 24,
        fontWeight: "700",
        marginTop: 6,
    },
});
