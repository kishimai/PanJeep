import { View, Text, StyleSheet, Pressable } from "react-native";

export default function ProfileScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>LR</Text>
                </View>
                <View>
                    <Text style={styles.name}>Lakbay Rider</Text>
                    <Text style={styles.role}>Operator Access</Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Account</Text>
                <Text style={styles.cardItem}>Email: rider@etranspo.ph</Text>
                <Text style={styles.cardItem}>Staff ID: OP-2041</Text>
                <Text style={styles.cardItem}>Region: Metro Manila</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Quick Actions</Text>
                <Pressable style={styles.actionButton}>
                    <Text style={styles.actionText}>Manage Alerts</Text>
                </Pressable>
                <Pressable style={styles.actionButton}>
                    <Text style={styles.actionText}>Trip Preferences</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
        padding: 20,
        gap: 16,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#0F766E",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: "#FFFFFF",
        fontSize: 20,
        fontWeight: "700",
    },
    name: {
        fontSize: 20,
        fontWeight: "700",
        color: "#0F172A",
    },
    role: {
        fontSize: 13,
        color: "#64748B",
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 18,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        gap: 10,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0F172A",
    },
    cardItem: {
        fontSize: 13,
        color: "#475569",
    },
    actionButton: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: "#F1F5F9",
    },
    actionText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#0F766E",
    },
});
