import { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useRouter } from "expo-router";

const circles = [
    { size: 240, top: -90, left: -70, color: "rgba(14, 116, 144, 0.25)" },
    { size: 180, bottom: -60, right: -40, color: "rgba(34, 197, 94, 0.18)" },
    { size: 120, top: 80, right: -40, color: "rgba(59, 130, 246, 0.2)" },
];

export default function LoginScreen() {
    const router = useRouter();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");

    return (
        <View style={styles.container}>
            {circles.map((circle, index) => (
                <View
                    key={`circle-${index}`}
                    style={[
                        styles.circle,
                        {
                            width: circle.size,
                            height: circle.size,
                            borderRadius: circle.size / 2,
                            backgroundColor: circle.color,
                            top: circle.top,
                            left: circle.left,
                            right: circle.right,
                            bottom: circle.bottom,
                        },
                    ]}
                />
            ))}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.card}
            >
                <Text style={styles.appTitle}>Lakbay</Text>
                <Text style={styles.subtitle}>Authorized LGUs and operators only</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email or Staff ID</Text>
                    <TextInput
                        placeholder="Enter your email or staff ID"
                        placeholderTextColor="#94A3B8"
                        value={identifier}
                        onChangeText={setIdentifier}
                        style={styles.input}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        placeholder="Enter your password"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                        style={styles.input}
                    />
                </View>

                <Pressable
                    style={styles.primaryButton}
                    onPress={() => router.replace("/(tabs)/home")}
                >
                    <Text style={styles.primaryButtonText}>Sign In</Text>
                </Pressable>

                <Pressable
                    style={styles.secondaryButton}
                    onPress={() => router.push("/(auth)/register")}
                >
                    <Text style={styles.secondaryButtonText}>
                        Don’t have an account? Create one
                    </Text>
                </Pressable>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    circle: {
        position: "absolute",
    },
    card: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        paddingHorizontal: 24,
        paddingVertical: 32,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 5,
        gap: 18,
    },
    appTitle: {
        fontSize: 28,
        fontWeight: "700",
        textAlign: "center",
        color: "#0F172A",
    },
    subtitle: {
        textAlign: "center",
        color: "#64748B",
        marginBottom: 8,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1E293B",
    },
    input: {
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#F8FAFC",
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: "#0F172A",
    },
    primaryButton: {
        backgroundColor: "#0F766E",
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        marginTop: 4,
    },
    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },
    secondaryButton: {
        alignItems: "center",
        paddingVertical: 6,
    },
    secondaryButtonText: {
        color: "#0F766E",
        fontWeight: "600",
    },
});
