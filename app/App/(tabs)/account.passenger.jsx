import { View, Text, Button, StyleSheet, TouchableOpacity } from "react-native";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";
import { useAuth } from '../../providers/AuthProvider'; // Your provider file
import { Feather } from "@expo/vector-icons";

export default function PassengerAccount() {
    const { session } = useAuth()

    async function signOut() {
        await supabase.auth.signOut();
        router.replace("/login");
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Account</Text>

            {session ? (
                // Logged in user
                <>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Account Settings</Text>
                        <TouchableOpacity style={styles.menuItem}>
                            <Feather name="user" size={20} color="#666" />
                            <Text style={styles.menuText}>Edit Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem}>
                            <Feather name="bell" size={20} color="#666" />
                            <Text style={styles.menuText}>Notifications</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem}>
                            <Feather name="shield" size={20} color="#666" />
                            <Text style={styles.menuText}>Privacy & Security</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                        <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>
                </>
            ) : (
                // Guest user
                <>
                    <View style={styles.guestCard}>
                        <Feather name="user" size={40} color="#4A90E2" />
                        <Text style={styles.guestTitle}>You're browsing as a guest</Text>
                        <Text style={styles.guestText}>
                            Create an account to save your preferences, track favorite routes, and access more features.
                        </Text>

                        <TouchableOpacity
                            style={styles.upgradeButton}
                            onPress={() => router.push("/register")}
                        >
                            <Text style={styles.upgradeButtonText}>Create Account</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={() => router.push("/login")}
                        >
                            <Text style={styles.loginButtonText}>Sign In</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Guest Features</Text>
                        <View style={styles.featureItem}>
                            <Feather name="check-circle" size={16} color="#10B981" />
                            <Text style={styles.featureText}>Browse all jeepney routes</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Feather name="check-circle" size={16} color="#10B981" />
                            <Text style={styles.featureText}>View real-time locations</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Feather name="check-circle" size={16} color="#10B981" />
                            <Text style={styles.featureText}>Check schedules and fares</Text>
                        </View>
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#F8FAFC",
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#1A1A1A",
        marginBottom: 30,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#666",
        marginBottom: 16,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    menuText: {
        fontSize: 16,
        color: "#1A1A1A",
        marginLeft: 12,
    },
    logoutButton: {
        backgroundColor: "#EF4444",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 20,
    },
    logoutButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "600",
    },
    guestCard: {
        backgroundColor: "#FFF",
        padding: 24,
        borderRadius: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginBottom: 30,
    },
    guestTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1A1A1A",
        marginTop: 16,
        marginBottom: 8,
        textAlign: "center",
    },
    guestText: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 24,
    },
    upgradeButton: {
        backgroundColor: "#4A90E2",
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        width: "100%",
        alignItems: "center",
        marginBottom: 12,
    },
    upgradeButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "600",
    },
    loginButton: {
        backgroundColor: "#F1F5F9",
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        width: "100%",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    loginButtonText: {
        color: "#4A90E2",
        fontSize: 16,
        fontWeight: "600",
    },
    featureItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    featureText: {
        fontSize: 14,
        color: "#1A1A1A",
        marginLeft: 12,
    },
});