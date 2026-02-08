import { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    SafeAreaView,
} from "react-native";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";
import { useProfile } from "../lib/useProfile";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from '../providers/AuthProvider';
import { Session } from '@supabase/supabase-js';

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [formErrors, setFormErrors] = useState({ email: "", password: "" });
    const [isFocused, setIsFocused] = useState({ email: false, password: false });

    const authContext = useAuth();
    const session: Session | null = authContext?.session ?? null;
    const isLoading = authContext?.isLoading ?? false;

    const { profile, loading: loadingProfile } = useProfile(session);

    useEffect(() => {
        if (isLoading || loadingProfile) return;

        if (session && profile) {
            const timer = setTimeout(() => {
                const route = profile.role === "operator" ? "/home.operator" : "/home.passenger";
                router.replace(route);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [session, profile, isLoading, loadingProfile]);

    if (isLoading || loadingProfile) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Checking your account...</Text>
            </View>
        );
    }

    if (session && profile) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Welcome back! Redirecting...</Text>
            </View>
        );
    }

    const validateForm = () => {
        let isValid = true;
        const errors = { email: "", password: "" };

        if (!email.trim()) {
            errors.email = "Email is required";
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = "Please enter a valid email";
            isValid = false;
        }

        if (!password) {
            errors.password = "Password is required";
            isValid = false;
        } else if (password.length < 6) {
            errors.password = "Password must be at least 6 characters";
            isValid = false;
        }

        setFormErrors(errors);
        return isValid;
    };

    async function signIn() {
        if (!validateForm()) return;

        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (error) {
            Alert.alert(
                "Login Failed",
                error.message.includes("Invalid")
                    ? "Invalid email or password. Please try again."
                    : error.message,
                [{ text: "OK", style: "cancel" }]
            );
            setLoading(false);
            return;
        }

        setLoading(false);
    }

    const handleForgotPassword = async () => {
        if (!email) {
            Alert.alert(
                "Enter your email",
                "Please enter your email address to reset your password.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "OK" }
                ]
            );
            return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email);

        if (error) {
            Alert.alert("Error", error.message);
        } else {
            Alert.alert(
                "Check your email",
                "Password reset instructions have been sent to your email.",
                [{ text: "OK" }]
            );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoid}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.content}>
                        {/* Header Section */}
                        <View style={styles.header}>
                            <View style={styles.logoContainer}>
                                <MaterialCommunityIcons
                                    name="bus"
                                    size={44}
                                    color="#ffffff"
                                />
                            </View>
                            <Text style={styles.title}>Sign In</Text>
                            <Text style={styles.subtitle}>Welcome back to Lakbay</Text>
                        </View>

                        {/* Login Form */}
                        <View style={styles.card}>
                            <View style={styles.formContainer}>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Email</Text>
                                    <TextInput
                                        placeholder="Enter your email"
                                        placeholderTextColor="#94a3b8"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        keyboardType="email-address"
                                        value={email}
                                        onChangeText={(text) => {
                                            setEmail(text);
                                            if (formErrors.email) setFormErrors({...formErrors, email: ""});
                                        }}
                                        onFocus={() => setIsFocused({...isFocused, email: true})}
                                        onBlur={() => setIsFocused({...isFocused, email: false})}
                                        style={[
                                            styles.input,
                                            isFocused.email && styles.inputFocused,
                                            formErrors.email && styles.inputError,
                                        ]}
                                        editable={!loading}
                                    />
                                    {formErrors.email ? (
                                        <Text style={styles.errorText}>{formErrors.email}</Text>
                                    ) : null}
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Password</Text>
                                    <View style={styles.passwordContainer}>
                                        <TextInput
                                            placeholder="Enter your password"
                                            placeholderTextColor="#94a3b8"
                                            secureTextEntry={!passwordVisible}
                                            value={password}
                                            onChangeText={(text) => {
                                                setPassword(text);
                                                if (formErrors.password) setFormErrors({...formErrors, password: ""});
                                            }}
                                            onFocus={() => setIsFocused({...isFocused, password: true})}
                                            onBlur={() => setIsFocused({...isFocused, password: false})}
                                            style={[
                                                styles.input,
                                                styles.passwordInput,
                                                isFocused.password && styles.inputFocused,
                                                formErrors.password && styles.inputError,
                                            ]}
                                            editable={!loading}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setPasswordVisible(!passwordVisible)}
                                            style={styles.visibilityToggle}
                                            disabled={loading}
                                        >
                                            <Feather
                                                name={passwordVisible ? "eye-off" : "eye"}
                                                size={20}
                                                color={isFocused.password ? "#3b82f6" : "#94a3b8"}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    {formErrors.password ? (
                                        <Text style={styles.errorText}>{formErrors.password}</Text>
                                    ) : null}
                                </View>

                                <TouchableOpacity
                                    onPress={handleForgotPassword}
                                    style={styles.forgotPassword}
                                    disabled={loading}
                                >
                                    <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.loginButton,
                                        loading && styles.loginButtonDisabled,
                                    ]}
                                    onPress={signIn}
                                    disabled={loading}
                                    activeOpacity={0.9}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#ffffff" size="small" />
                                    ) : (
                                        <>
                                            <Text style={styles.loginButtonText}>Sign In</Text>
                                            <Feather name="arrow-right" size={20} color="#ffffff" />
                                        </>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.dividerContainer}>
                                    <View style={styles.divider} />
                                    <Text style={styles.dividerText}>Don't have an account?</Text>
                                    <View style={styles.divider} />
                                </View>

                                <TouchableOpacity
                                    style={styles.signupButton}
                                    onPress={() => router.push("/register")}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="user-plus" size={20} color="#3b82f6" />
                                    <Text style={styles.signupButtonText}>Create Account</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={() => router.back()}
                                    disabled={loading}
                                >
                                    <Feather name="arrow-left" size={18} color="#64748b" />
                                    <Text style={styles.backButtonText}>Back to app</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },
    keyboardAvoid: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8fafc",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: "#64748b",
        fontWeight: "500",
    },
    content: {
        width: "100%",
        maxWidth: 400,
        alignSelf: "center",
    },
    header: {
        alignItems: "center",
        marginBottom: 40,
    },
    logoContainer: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: "#3b82f6",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
        shadowColor: "#3b82f6",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    title: {
        fontSize: 32,
        fontWeight: "700",
        color: "#0f172a",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: "#64748b",
        textAlign: "center",
        fontWeight: "500",
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 20,
        padding: 28,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 5,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    formContainer: {
        width: "100%",
    },
    inputContainer: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 10,
    },
    input: {
        backgroundColor: "#f8fafc",
        borderWidth: 1.5,
        borderColor: "#e2e8f0",
        borderRadius: 12,
        paddingHorizontal: 18,
        paddingVertical: 16,
        fontSize: 16,
        color: "#0f172a",
        fontWeight: "500",
    },
    inputFocused: {
        borderColor: "#3b82f6",
        backgroundColor: "#ffffff",
    },
    inputError: {
        borderColor: "#ef4444",
    },
    errorText: {
        color: "#ef4444",
        fontSize: 13,
        marginTop: 8,
        fontWeight: "500",
    },
    passwordContainer: {
        position: "relative",
    },
    passwordInput: {
        paddingRight: 52,
    },
    visibilityToggle: {
        position: "absolute",
        right: 16,
        top: 16,
        padding: 6,
    },
    forgotPassword: {
        alignSelf: "flex-end",
        marginBottom: 32,
    },
    forgotPasswordText: {
        color: "#3b82f6",
        fontSize: 15,
        fontWeight: "600",
    },
    loginButton: {
        backgroundColor: "#3b82f6",
        borderRadius: 14,
        paddingVertical: 18,
        paddingHorizontal: 24,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 32,
        gap: 12,
        shadowColor: "#3b82f6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    loginButtonDisabled: {
        backgroundColor: "#93c5fd",
        shadowOpacity: 0.1,
    },
    loginButtonText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "600",
    },
    dividerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 32,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: "#e2e8f0",
    },
    dividerText: {
        color: "#94a3b8",
        paddingHorizontal: 16,
        fontSize: 14,
        fontWeight: "500",
    },
    signupButton: {
        backgroundColor: "#f0f9ff",
        borderRadius: 14,
        paddingVertical: 18,
        paddingHorizontal: 24,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
        gap: 12,
        borderWidth: 1.5,
        borderColor: "#dbeafe",
    },
    signupButtonText: {
        color: "#3b82f6",
        fontSize: 16,
        fontWeight: "600",
    },
    backButton: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 14,
        gap: 8,
    },
    backButtonText: {
        color: "#64748b",
        fontSize: 15,
        fontWeight: "500",
    },
});