import { useEffect } from "react";
import {
    View,
    Text,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from '../providers/AuthProvider';
import { useProfile } from "../lib/useProfile";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Session } from '@supabase/supabase-js';

export default function UserEnter() {
    const authContext = useAuth();
    const session: Session | null = authContext?.session ?? null;
    const isLoading = authContext?.isLoading ?? false;

    const { profile, loading: loadingProfile } = useProfile(session);

    useEffect(() => {
        if (isLoading || loadingProfile) return;

        // If user is already logged in, redirect to appropriate home
        if (session && profile) {
            const timer = setTimeout(() => {
                const route = profile.role === "operator" ? "/home.operator" : "/home.passenger";
                router.replace(route);
            }, 100);
            return () => clearTimeout(timer);
        }

        // If no session exists (first time or returning guest),
        // useProfile will handle guest creation automatically
        if (!session) {
            const timer = setTimeout(() => {
                // Redirect to passenger home as guest
                router.replace("/home.passenger");
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [session, profile, isLoading, loadingProfile]);

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    <MaterialCommunityIcons
                        name="bus"
                        size={48}
                        color="#3b82f6"
                    />
                </View>
                <Text style={styles.title}>Lakbay</Text>
                <Text style={styles.subtitle}>Your Travel Companion</Text>
                <ActivityIndicator size="large" color="#3b82f6" style={styles.spinner} />
                <Text style={styles.loadingText}>
                    {!session ? "Setting up your journey..." : "Loading your account..."}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8fafc",
    },
    content: {
        alignItems: "center",
        padding: 40,
    },
    logoContainer: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: "#eff6ff",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
        borderWidth: 2,
        borderColor: "#dbeafe",
    },
    title: {
        fontSize: 36,
        fontWeight: "700",
        color: "#1f2937",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: "#6b7280",
        textAlign: "center",
        marginBottom: 40,
    },
    spinner: {
        marginTop: 20,
        marginBottom: 16,
    },
    loadingText: {
        fontSize: 16,
        color: "#64748b",
        fontWeight: "500",
    },
});