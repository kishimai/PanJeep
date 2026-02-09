import { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Animated,
    Easing,
    Dimensions,
    Keyboard,
    TouchableWithoutFeedback,
} from "react-native";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";
import { useAuth } from '../providers/AuthProvider';
import { Feather } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

// Color palette - refined from UserEnter screen
const COLORS = {
    background: "#39A0ED", // Fresh blue background
    surface: "#FFFFFF", // White for cards/inputs
    text: "#1F2937", // Dark text for readability
    textMuted: "#6B7280", // Muted text
    textLight: "#FFFFFF", // White text
    textLightMuted: "rgba(255, 255, 255, 0.85)", // Slightly transparent white
    primary: "#39A0ED", // Blue for primary actions
    accent: "#F87171", // Softer red for errors (matches UserEnter)
    border: "#E5E7EB", // Light border
    borderFocused: "#39A0ED", // Solid blue border when focused
    shadow: "rgba(0, 0, 0, 0.1)",
};

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [formErrors, setFormErrors] = useState({ email: "", password: "" });

    // Individual focus states for animation
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    const authContext = useAuth();
    const session = authContext?.session ?? null;
    const isLoading = authContext?.isLoading ?? false;

    // Title animations
    const titleFade = useRef(new Animated.Value(0)).current;
    const titleSlide = useRef(new Animated.Value(20)).current;
    const titleScale = useRef(new Animated.Value(0.95)).current;

    // Form animations
    const formFade = useRef(new Animated.Value(0)).current;
    const formSlide = useRef(new Animated.Value(30)).current;
    const formScale = useRef(new Animated.Value(0.98)).current;

    // Button animation
    const buttonScale = useRef(new Animated.Value(1)).current;

    // Input focus animations - simplified to avoid native driver issues
    const emailFocusAnim = useRef(new Animated.Value(0)).current;
    const passwordFocusAnim = useRef(new Animated.Value(0)).current;

    // Simplified animations that don't use unsupported properties
    useEffect(() => {
        if (emailFocused) {
            Animated.spring(emailFocusAnim, {
                toValue: 1,
                tension: 250,
                friction: 15,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.spring(emailFocusAnim, {
                toValue: 0,
                tension: 250,
                friction: 15,
                useNativeDriver: true,
            }).start();
        }
    }, [emailFocused]);

    useEffect(() => {
        if (passwordFocused) {
            Animated.spring(passwordFocusAnim, {
                toValue: 1,
                tension: 250,
                friction: 15,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.spring(passwordFocusAnim, {
                toValue: 0,
                tension: 250,
                friction: 15,
                useNativeDriver: true,
            }).start();
        }
    }, [passwordFocused]);

    useEffect(() => {
        // If user is already logged in, redirect immediately
        if (session && !isLoading) {
            router.replace("/home.passenger");
            return;
        }

        // Title animation sequence
        Animated.parallel([
            Animated.timing(titleFade, {
                toValue: 1,
                duration: 600,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.spring(titleSlide, {
                toValue: 0,
                tension: 160,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.spring(titleScale, {
                toValue: 1,
                tension: 180,
                friction: 6,
                useNativeDriver: true,
            }),
        ]).start();

        // Delayed form animation
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(formFade, {
                    toValue: 1,
                    duration: 500,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.spring(formSlide, {
                    toValue: 0,
                    tension: 170,
                    friction: 10,
                    useNativeDriver: true,
                }),
                Animated.spring(formScale, {
                    toValue: 1,
                    tension: 190,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        }, 200);

    }, [session, isLoading]);

    const dismissKeyboard = () => {
        Keyboard.dismiss();
    };

    // --- IMPROVED VALIDATION & SIGN-IN FLOW ---
    const validateAndSignIn = async () => {
        // Clear previous errors
        const errors = { email: "", password: "" };
        let hasError = false;

        if (!email.trim()) {
            errors.email = "Email is required";
            hasError = true;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = "Please enter a valid email address";
            hasError = true;
        }

        if (!password) {
            errors.password = "Password is required";
            hasError = true;
        } else if (password.length < 6) {
            errors.password = "Password must be at least 6 characters";
            hasError = true;
        }

        setFormErrors(errors);
        if (hasError) return; // Stop here if there are errors

        // --- Proceed with sign-in ---
        // Button press animation
        Animated.sequence([
            Animated.spring(buttonScale, {
                toValue: 0.95,
                tension: 300,
                friction: 10,
                useNativeDriver: true,
            }),
            Animated.spring(buttonScale, {
                toValue: 1,
                tension: 300,
                friction: 10,
                useNativeDriver: true,
            }),
        ]).start();

        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (error) {
            Alert.alert(
                "Sign In Failed",
                "The email address or password is incorrect. Please try again.",
                [{ text: "OK", style: "cancel" }]
            );
            setLoading(false);
            return;
        }
        // Successful sign-in will be handled by the useEffect redirect
    };

    // --- ENHANCED FORGOT PASSWORD HANDLER ---
    const handleForgotPassword = async () => {
        if (!email.trim()) {
            // Provide immediate, inline feedback instead of an alert
            setFormErrors({ ...formErrors, email: "Enter your email to reset your password" });
            return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: 'your-app-scheme://reset-password',
        });

        if (error) {
            Alert.alert("Unable to Send", "Could not send a reset email. Please check the email address.");
        } else {
            // More supportive and clear success message
            Alert.alert(
                "Check Your Email",
                `If an account exists for ${email}, you will receive password reset instructions shortly.`,
                [{ text: "OK" }]
            );
        }
    };

    // --- PLACEHOLDER FOR BIOMETRIC LOGIN ---
    const handleBiometricLogin = () => {
        Alert.alert(
            "Simpler Login",
            "This would integrate with Face ID or Touch ID for instant, secure access.",
            [{ text: "OK" }]
        );
    };

    // Loading state
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.loadingDots}>
                    {[0, 1, 2].map((index) => (
                        <View key={index} style={styles.loadingDot} />
                    ))}
                </View>
                <Text style={styles.loadingText}>Checking your account...</Text>
            </View>
        );
    }

    return (
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.container}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardAvoid}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -500}
                >
                    {/* Lakbay Header Section - Always visible */}
                    <View style={styles.topSection}>
                        <Animated.View
                            style={[
                                styles.titleContainer,
                                {
                                    opacity: titleFade,
                                    transform: [
                                        { translateY: titleSlide },
                                        { scale: titleScale },
                                    ],
                                },
                            ]}
                        >
                            <Text style={styles.title}>Lakbay</Text>
                            <Text style={styles.subtitle}>Welcome back to your journey</Text>
                        </Animated.View>
                    </View>

                    {/* White Form Section */}
                    <View style={styles.bottomSection}>
                        <Animated.View
                            style={[
                                styles.formContainer,
                                {
                                    opacity: formFade,
                                    transform: [
                                        { translateY: formSlide },
                                        { scale: formScale },
                                    ],
                                },
                            ]}
                        >
                            {/* Email Input with Focus Animation */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Email Address</Text>
                                <Animated.View
                                    style={[
                                        styles.inputWrapper,
                                        emailFocused && styles.inputWrapperFocused,
                                        formErrors.email && styles.inputError,
                                        {
                                            transform: [{
                                                scale: emailFocusAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [1, 1.02]
                                                })
                                            }]
                                        }
                                    ]}
                                >
                                    <TextInput
                                        placeholder="you@example.com"
                                        placeholderTextColor={COLORS.textMuted}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        value={email}
                                        onChangeText={(text) => {
                                            setEmail(text);
                                            if (formErrors.email) setFormErrors({ ...formErrors, email: "" });
                                        }}
                                        onFocus={() => setEmailFocused(true)}
                                        onBlur={() => setEmailFocused(false)}
                                        style={styles.input}
                                        editable={!loading}
                                    />
                                </Animated.View>
                                {formErrors.email ? (
                                    <Text style={styles.errorText}>{formErrors.email}</Text>
                                ) : null}
                            </View>

                            {/* Password Input with Focus Animation */}
                            <View style={styles.inputGroup}>
                                <View style={styles.passwordLabelRow}>
                                    <Text style={styles.inputLabel}>Password</Text>
                                    <TouchableOpacity
                                        onPress={handleForgotPassword}
                                        disabled={loading}
                                    >
                                        <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                                    </TouchableOpacity>
                                </View>
                                <Animated.View
                                    style={[
                                        styles.passwordWrapper,
                                        passwordFocused && styles.inputWrapperFocused,
                                        formErrors.password && styles.inputError,
                                        {
                                            transform: [{
                                                scale: passwordFocusAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [1, 1.02]
                                                })
                                            }]
                                        }
                                    ]}
                                >
                                    <TextInput
                                        placeholder="Enter your password"
                                        placeholderTextColor={COLORS.textMuted}
                                        secureTextEntry={!passwordVisible}
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            if (formErrors.password) setFormErrors({ ...formErrors, password: "" });
                                        }}
                                        onFocus={() => setPasswordFocused(true)}
                                        onBlur={() => setPasswordFocused(false)}
                                        style={[styles.input, styles.passwordInput]}
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
                                            color={passwordFocused ? COLORS.primary : COLORS.textMuted}
                                        />
                                    </TouchableOpacity>
                                </Animated.View>
                                {formErrors.password ? (
                                    <Text style={styles.errorText}>{formErrors.password}</Text>
                                ) : null}
                            </View>

                            {/* Remember Me */}
                            <TouchableOpacity
                                style={styles.rememberMeContainer}
                                onPress={() => setRememberMe(!rememberMe)}
                                disabled={loading}
                            >
                                <View style={[
                                    styles.checkbox,
                                    rememberMe && styles.checkboxChecked
                                ]}>
                                    {rememberMe && (
                                        <Feather name="check" size={14} color={COLORS.textLight} />
                                    )}
                                </View>
                                <Text style={styles.rememberMeText}>Keep me signed in</Text>
                            </TouchableOpacity>

                            {/* Login Button with Animation - Updated to call new function */}
                            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                                <TouchableOpacity
                                    style={[
                                        styles.loginButton,
                                        loading && styles.loginButtonDisabled,
                                    ]}
                                    onPress={validateAndSignIn}
                                    disabled={loading}
                                    activeOpacity={0.9}
                                >
                                    {loading ? (
                                        <View style={styles.loadingIndicator}>
                                            <View style={styles.loadingDotSmall} />
                                            <View style={styles.loadingDotSmall} />
                                            <View style={styles.loadingDotSmall} />
                                        </View>
                                    ) : (
                                        <>
                                            <Text style={styles.loginButtonText}>Continue Journey</Text>
                                            <Feather name="arrow-right" size={20} color={COLORS.textLight} style={styles.loginButtonIcon} />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </Animated.View>
                        </Animated.View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    keyboardAvoid: {
        flex: 1,
    },
    topSection: {
        height: height * 0.35,
        backgroundColor: COLORS.background,
        paddingHorizontal: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 44,
        fontWeight: "800",
        color: COLORS.textLight,
        letterSpacing: 0.8,
        marginBottom: 12,
        textShadowColor: "rgba(0, 0, 0, 0.15)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: "500",
        color: COLORS.textLightMuted,
        letterSpacing: 0.4,
        textAlign: 'center',
    },
    bottomSection: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },
    formContainer: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 40,
    },
    inputGroup: {
        marginBottom: 28,
    },
    inputWrapper: {
        borderRadius: 14,
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    inputWrapperFocused: {
        borderColor: COLORS.borderFocused,
        backgroundColor: '#FFFFFF',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    passwordWrapper: {
        borderRadius: 14,
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: COLORS.border,
        overflow: 'hidden',
        position: 'relative',
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 10,
        letterSpacing: -0.2,
    },
    passwordLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    input: {
        paddingHorizontal: 18,
        paddingVertical: 18,
        fontSize: 16,
        color: COLORS.text,
        fontWeight: "500",
        letterSpacing: 0.2,
        backgroundColor: 'transparent',
    },
    passwordInput: {
        paddingRight: 50,
    },
    inputError: {
        borderColor: COLORS.accent,
    },
    errorText: {
        color: COLORS.accent,
        fontSize: 13,
        marginTop: 8,
        marginLeft: 4,
        fontWeight: "500",
    },
    visibilityToggle: {
        position: "absolute",
        right: 16,
        top: 18,
        padding: 4,
        zIndex: 10,
    },
    rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 8,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: COLORS.primary,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
    },
    rememberMeText: {
        fontSize: 15,
        color: COLORS.text,
        fontWeight: '500',
    },
    forgotPasswordText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: "600",
    },
    loginButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 18,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    loginButtonDisabled: {
        backgroundColor: "rgba(57, 160, 237, 0.7)",
        opacity: 0.8,
    },
    loginButtonText: {
        color: COLORS.textLight,
        fontSize: 17,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    loginButtonIcon: {
        marginLeft: 10,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
    },
    dividerText: {
        color: COLORS.textMuted,
        fontSize: 14,
        fontWeight: '500',
        marginHorizontal: 12,
    },
    loadingIndicator: {
        flexDirection: "row",
        alignItems: "center",
    },
    loadingDotSmall: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.textLight,
        marginHorizontal: 3,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingDots: {
        flexDirection: "row",
        marginBottom: 16,
    },
    loadingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.textLight,
        marginHorizontal: 4,
        opacity: 0.6,
    },
    loadingText: {
        fontSize: 14,
        color: COLORS.textLight,
        opacity: 0.8,
        fontWeight: "500",
    },
});