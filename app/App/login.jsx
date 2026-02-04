import { useState, useEffect, useRef } from "react";
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
    Image,
    Animated,
    Dimensions,
    StyleSheet,
} from "react-native";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";
import { useSession } from "../lib/useSession";
import { useProfile } from "../lib/useProfile";
import { Feather, Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [formErrors, setFormErrors] = useState({ email: "", password: "" });
    const [isFocused, setIsFocused] = useState({ email: false, password: false });

    const { session, loadingSession } = useSession();
    const { profile, loadingProfile } = useProfile(session);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const logoScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(logoScale, {
                toValue: 1.1,
                tension: 150,
                friction: 3,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Handle redirection based on session and profile
    useEffect(() => {
        if (loadingSession || loadingProfile) return;

        if (session && profile) {
            const timer = setTimeout(() => {
                const route = profile.role === "operator" ? "/home.operator" : "/home.passenger";
                router.replace(route);
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [session, profile, loadingSession, loadingProfile]);

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

        // Animate button press
        Animated.sequence([
            Animated.timing(logoScale, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(logoScale, {
                toValue: 1.1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();

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

    if (loadingSession) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
                <Text style={styles.loadingText}>Checking authentication...</Text>
            </View>
        );
    }

    if (session && loadingProfile) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
                <Text style={styles.loadingText}>Loading your profile...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Animated.View
                    style={[
                        styles.content,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {/* Logo/Header Section */}
                    <View style={styles.header}>
                        <Animated.View style={{ transform: [{ scale: logoScale }] }}>
                            <View style={styles.logoContainer}>
                                <Feather name="log-in" size={50} color="#4A90E2" />
                            </View>
                        </Animated.View>
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Sign in to continue your journey</Text>
                    </View>

                    {/* Form Section */}
                    <View style={styles.formContainer}>
                        {/* Email Input */}
                        <View style={styles.inputContainer}>
                            <View style={styles.inputLabelContainer}>
                                <Feather
                                    name="mail"
                                    size={16}
                                    color={isFocused.email ? "#4A90E2" : "#666"}
                                    style={styles.inputIcon}
                                />
                                <Text style={[
                                    styles.inputLabel,
                                    isFocused.email && styles.inputLabelFocused
                                ]}>
                                    Email Address
                                </Text>
                            </View>
                            <TextInput
                                placeholder="Enter your email"
                                placeholderTextColor="#999"
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

                        {/* Password Input */}
                        <View style={styles.inputContainer}>
                            <View style={styles.inputLabelContainer}>
                                <Feather
                                    name="lock"
                                    size={16}
                                    color={isFocused.password ? "#4A90E2" : "#666"}
                                    style={styles.inputIcon}
                                />
                                <Text style={[
                                    styles.inputLabel,
                                    isFocused.password && styles.inputLabelFocused
                                ]}>
                                    Password
                                </Text>
                            </View>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    placeholder="Enter your password"
                                    placeholderTextColor="#999"
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
                                        color="#666"
                                    />
                                </TouchableOpacity>
                            </View>
                            {formErrors.password ? (
                                <Text style={styles.errorText}>{formErrors.password}</Text>
                            ) : null}
                        </View>

                        {/* Forgot Password */}
                        <TouchableOpacity
                            onPress={handleForgotPassword}
                            style={styles.forgotPassword}
                            disabled={loading}
                        >
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={[
                                styles.loginButton,
                                loading && styles.loginButtonDisabled,
                                (!email || !password) && styles.loginButtonDisabled,
                            ]}
                            onPress={signIn}
                            disabled={loading || !email || !password}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.loginButtonText}>Sign In</Text>
                                    <Feather name="arrow-right" size={20} color="#FFF" />
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.dividerContainer}>
                            <View style={styles.divider} />
                            <Text style={styles.dividerText}>or</Text>
                            <View style={styles.divider} />
                        </View>

                        {/* Sign Up Section */}
                        <View style={styles.signupContainer}>
                            <Text style={styles.signupText}>Don't have an account?</Text>
                            <TouchableOpacity
                                onPress={() => router.push("/register")}
                                disabled={loading}
                            >
                                <Text style={styles.signupLink}>Create Account</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: "#666",
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    content: {
        width: "100%",
        maxWidth: 400,
        alignSelf: "center",
    },
    header: {
        alignItems: "center",
        marginBottom: 48,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: "#E8F2FF",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
        shadowColor: "#4A90E2",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    title: {
        fontSize: 32,
        fontWeight: "700",
        color: "#1A1A1A",
        marginBottom: 8,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    formContainer: {
        width: "100%",
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabelContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    inputIcon: {
        marginRight: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "500",
        color: "#666",
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    inputLabelFocused: {
        color: "#4A90E2",
    },
    input: {
        backgroundColor: "#FFF",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: "#1A1A1A",
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    inputFocused: {
        borderColor: "#4A90E2",
        borderWidth: 2,
        shadowColor: "#4A90E2",
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    inputError: {
        borderColor: "#FF6B6B",
    },
    errorText: {
        color: "#FF6B6B",
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    passwordContainer: {
        position: "relative",
    },
    passwordInput: {
        paddingRight: 50,
    },
    visibilityToggle: {
        position: "absolute",
        right: 16,
        top: 14,
        padding: 4,
    },
    forgotPassword: {
        alignSelf: "flex-end",
        marginBottom: 32,
    },
    forgotPasswordText: {
        color: "#4A90E2",
        fontSize: 14,
        fontWeight: "500",
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    loginButton: {
        backgroundColor: "#4A90E2",
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 32,
        shadowColor: "#4A90E2",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    loginButtonDisabled: {
        backgroundColor: "#A0C4FF",
        shadowOpacity: 0.1,
    },
    loginButtonText: {
        color: "#FFF",
        fontSize: 18,
        fontWeight: "600",
        marginRight: 8,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    dividerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 32,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: "#E2E8F0",
    },
    dividerText: {
        color: "#666",
        paddingHorizontal: 16,
        fontSize: 14,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    signupContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    signupText: {
        color: "#666",
        fontSize: 14,
        marginRight: 8,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    signupLink: {
        color: "#4A90E2",
        fontSize: 14,
        fontWeight: "600",
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
});