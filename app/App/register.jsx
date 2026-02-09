import { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Easing, // ADD THIS IMPORT
    Dimensions,
    StyleSheet,
    Keyboard,
    TouchableWithoutFeedback,
} from "react-native";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

// Elegant blue color palette
const COLORS = {
    background: "#39A0ED", // Blue background matching login
    surface: "#FFFFFF",
    text: "#1E293B",
    textLight: "#FFFFFF",
    textMuted: "#64748B",
    primary: "#39A0ED", // Consistent blue for primary elements
    accent: "#F87171",
    border: "#E2E8F0",
    success: "#10B981",
    subtleBlue: "#EFF6FF", // Very light blue for inputs
};

export default function Register() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [formErrors, setFormErrors] = useState({
        email: "",
        password: "",
        confirmPassword: "",
    });

    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);

    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;

    // Elegant animations
    const formSlide = useRef(new Animated.Value(height * 0.1)).current;
    const formOpacity = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Smooth entrance animation
        Animated.parallel([
            Animated.timing(formOpacity, {
                toValue: 1,
                duration: 500,
                easing: Easing.out(Easing.cubic), // Fixed line
                useNativeDriver: true,
            }),
            Animated.spring(formSlide, {
                toValue: 0,
                tension: 100,
                friction: 15,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Password strength calculation
    useEffect(() => {
        const length = password.length >= 6;
        const uppercase = /[A-Z]/.test(password);
        const number = /\d/.test(password);
        const match = password === confirmPassword && password.length > 0;

        const strength = [length, uppercase, number, match].filter(Boolean).length;
        setPasswordStrength(strength);
    }, [password, confirmPassword]);

    const validateAndSignUp = async () => {
        if (!acceptTerms) {
            Alert.alert("Accept Terms", "Please accept the terms to continue.");
            return;
        }

        const errors = { email: "", password: "", confirmPassword: "" };
        let hasError = false;

        if (!email.trim()) {
            errors.email = "Email is required";
            hasError = true;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = "Enter a valid email";
            hasError = true;
        }

        if (!password) {
            errors.password = "Password is required";
            hasError = true;
        } else if (!passwordRegex.test(password)) {
            errors.password = "Check password requirements";
            hasError = true;
        }

        if (!confirmPassword) {
            errors.confirmPassword = "Confirm your password";
            hasError = true;
        } else if (password !== confirmPassword) {
            errors.confirmPassword = "Passwords don't match";
            hasError = true;
        }

        setFormErrors(errors);
        if (hasError) return;

        // Elegant button press animation
        Animated.sequence([
            Animated.spring(buttonScale, {
                toValue: 0.97,
                tension: 180,
                friction: 6,
                useNativeDriver: true,
            }),
            Animated.spring(buttonScale, {
                toValue: 1,
                tension: 180,
                friction: 6,
                useNativeDriver: true,
            }),
        ]).start();

        await signUp();
    };

    const getPasswordStrengthColor = () => {
        switch (passwordStrength) {
            case 0: return "#FCA5A5";
            case 1: return "#FDBA74";
            case 2: return "#FCD34D";
            case 3: return "#86EFAC";
            case 4: return COLORS.success;
            default: return COLORS.accent;
        }
    };

    // Show password help in an elegant alert
    const showPasswordRequirements = () => {
        Alert.alert(
            "Password Requirements",
            "For your security, please create a password with:\n\n• At least 6 characters\n• One uppercase letter (A-Z)\n• One number (0-9)\n• Both passwords must match",
            [{ text: "Understood", style: "default" }]
        );
    };

    async function signUp() {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: { data: { role: "passenger" } },
            });

            if (error) {
                if (error.message.includes("already registered")) {
                    Alert.alert(
                        "Account Exists",
                        "This email is already registered.\n\nWould you like to sign in instead?",
                        [
                            { text: "Cancel", style: "cancel" },
                            { text: "Sign In", onPress: () => router.replace("/login") },
                        ]
                    );
                    setLoading(false);
                    return;
                }
                throw new Error(error.message);
            }

            // Create user profile
            const { error: profileError } = await supabase
                .from("users")
                .insert({
                    id: data.user?.id,
                    email: data.user?.email,
                    role: "passenger",
                    created_at: new Date().toISOString(),
                })
                .select();

            if (profileError) {
                console.error("Profile error:", profileError);
                Alert.alert(
                    "Almost Complete",
                    "Your account has been created.\n\nYou can now sign in to continue.",
                    [{ text: "Sign In", onPress: () => router.replace("/login") }]
                );
                setLoading(false);
                return;
            }

            Alert.alert(
                "Check Your Email",
                "Registration successful!\n\nPlease check your email to confirm your account before signing in.",
                [{ text: "Got it", onPress: () => router.replace("/login") }]
            );
        } catch (err) {
            console.error("Register error:", err);
            Alert.alert(
                "Registration Failed",
                err.message || "Please check your information and try again."
            );
        } finally {
            setLoading(false);
        }
    }

    const dismissKeyboard = () => Keyboard.dismiss();

    return (
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.container}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardAvoid}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                >
                    {/* Elegant Header with Blue Background */}
                    <View style={styles.header}>
                        <View style={styles.titleContainer}>
                            <Text style={styles.title}>Join Lakbay</Text>
                            <Text style={styles.subtitle}>Begin your journey with us</Text>
                        </View>
                    </View>

                    {/* Elegant White Form Card */}
                    <Animated.View
                        style={[
                            styles.formCard,
                            {
                                opacity: formOpacity,
                                transform: [{ translateY: formSlide }],
                            },
                        ]}
                    >
                        {/* Email Field */}
                        <View style={styles.field}>
                            <View style={styles.fieldLabelRow}>
                                <Text style={styles.fieldLabel}>Email Address</Text>
                                <Feather name="mail" size={16} color={COLORS.textMuted} />
                            </View>
                            <View style={[
                                styles.inputContainer,
                                emailFocused && styles.inputFocused,
                                formErrors.email && styles.inputError,
                            ]}>
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
                            </View>
                            {formErrors.email ? (
                                <View style={styles.errorContainer}>
                                    <Feather name="alert-circle" size={14} color={COLORS.accent} />
                                    <Text style={styles.errorText}>{formErrors.email}</Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Password Field with Elegant Help Button */}
                        <View style={styles.field}>
                            <View style={styles.fieldLabelRow}>
                                <View style={styles.labelWithHelp}>
                                    <Text style={styles.fieldLabel}>Password</Text>
                                    <TouchableOpacity
                                        onPress={showPasswordRequirements}
                                        style={styles.helpIcon}
                                        disabled={loading}
                                    >
                                        <Feather name="help-circle" size={16} color={COLORS.primary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={[
                                styles.inputContainer,
                                passwordFocused && styles.inputFocused,
                                formErrors.password && styles.inputError,
                            ]}>
                                <TextInput
                                    placeholder="Create a secure password"
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
                                    style={styles.eyeButton}
                                    disabled={loading}
                                >
                                    <Feather
                                        name={passwordVisible ? "eye-off" : "eye"}
                                        size={18}
                                        color={passwordFocused ? COLORS.primary : COLORS.textMuted}
                                    />
                                </TouchableOpacity>
                            </View>
                            {formErrors.password ? (
                                <View style={styles.errorContainer}>
                                    <Feather name="alert-circle" size={14} color={COLORS.accent} />
                                    <Text style={styles.errorText}>{formErrors.password}</Text>
                                </View>
                            ) : null}

                            {/* Elegant Strength Indicator */}
                            {password.length > 0 && (
                                <View style={styles.strengthContainer}>
                                    <View style={styles.strengthBar}>
                                        <View style={[
                                            styles.strengthFill,
                                            {
                                                width: `${passwordStrength * 25}%`,
                                                backgroundColor: getPasswordStrengthColor(),
                                            }
                                        ]} />
                                    </View>
                                    <Text style={[
                                        styles.strengthText,
                                        { color: getPasswordStrengthColor() }
                                    ]}>
                                        {passwordStrength === 4 ? "Strong" :
                                            passwordStrength >= 2 ? "Good" :
                                                "Needs improvement"}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Confirm Password Field */}
                        <View style={styles.field}>
                            <View style={styles.fieldLabelRow}>
                                <Text style={styles.fieldLabel}>Confirm Password</Text>
                                <Feather name="shield" size={16} color={COLORS.textMuted} />
                            </View>
                            <View style={[
                                styles.inputContainer,
                                confirmPasswordFocused && styles.inputFocused,
                                formErrors.confirmPassword && styles.inputError,
                            ]}>
                                <TextInput
                                    placeholder="Re-enter your password"
                                    placeholderTextColor={COLORS.textMuted}
                                    secureTextEntry={!confirmPasswordVisible}
                                    value={confirmPassword}
                                    onChangeText={(text) => {
                                        setConfirmPassword(text);
                                        if (formErrors.confirmPassword) setFormErrors({ ...formErrors, confirmPassword: "" });
                                    }}
                                    onFocus={() => setConfirmPasswordFocused(true)}
                                    onBlur={() => setConfirmPasswordFocused(false)}
                                    style={[styles.input, styles.passwordInput]}
                                    editable={!loading}
                                />
                                <TouchableOpacity
                                    onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                                    style={styles.eyeButton}
                                    disabled={loading}
                                >
                                    <Feather
                                        name={confirmPasswordVisible ? "eye-off" : "eye"}
                                        size={18}
                                        color={confirmPasswordFocused ? COLORS.primary : COLORS.textMuted}
                                    />
                                </TouchableOpacity>
                            </View>
                            {formErrors.confirmPassword ? (
                                <View style={styles.errorContainer}>
                                    <Feather name="alert-circle" size={14} color={COLORS.accent} />
                                    <Text style={styles.errorText}>{formErrors.confirmPassword}</Text>
                                </View>
                            ) : null}

                            {/* Elegant Match Indicator */}
                            {password.length > 0 && confirmPassword.length > 0 && (
                                <View style={styles.matchContainer}>
                                    <Feather
                                        name={password === confirmPassword ? "check-circle" : "x-circle"}
                                        size={16}
                                        color={password === confirmPassword ? COLORS.success : COLORS.accent}
                                    />
                                    <Text style={[
                                        styles.matchText,
                                        { color: password === confirmPassword ? COLORS.success : COLORS.accent }
                                    ]}>
                                        {password === confirmPassword ? "Passwords match" : "Passwords don't match"}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Elegant Terms Agreement */}
                        <TouchableOpacity
                            style={styles.termsContainer}
                            onPress={() => setAcceptTerms(!acceptTerms)}
                            disabled={loading}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.checkbox,
                                acceptTerms && styles.checkboxChecked,
                            ]}>
                                {acceptTerms && (
                                    <Feather name="check" size={12} color="#FFFFFF" />
                                )}
                            </View>
                            <Text style={styles.termsText}>
                                I agree to the Terms of Service and Privacy Policy
                            </Text>
                        </TouchableOpacity>

                        {/* Elegant Create Button without purple shadow */}
                        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                            <TouchableOpacity
                                style={[
                                    styles.createButton,
                                    loading && styles.buttonDisabled,
                                    (!acceptTerms || passwordStrength < 3) && styles.buttonInactive,
                                ]}
                                onPress={validateAndSignUp}
                                disabled={loading || !acceptTerms || passwordStrength < 3}
                                activeOpacity={0.9}
                            >
                                {loading ? (
                                    <View style={styles.loading}>
                                        <View style={styles.loadingDot} />
                                        <View style={styles.loadingDot} />
                                        <View style={styles.loadingDot} />
                                    </View>
                                ) : (
                                    <>
                                        <Text style={styles.buttonText}>Create Account</Text>
                                        <Feather name="arrow-right" size={18} color="#FFFFFF" style={styles.buttonIcon} />
                                    </>
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                    </Animated.View>
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
    header: {
        height: height * 0.25,
        paddingHorizontal: 24,
        justifyContent: 'flex-end',
        paddingBottom: 30,
    },
    titleContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 36,
        fontWeight: "800",
        color: COLORS.textLight,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: "rgba(255, 255, 255, 0.85)",
        fontWeight: "500",
    },
    formCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 40,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 8,
    },
    field: {
        marginBottom: 28,
    },
    fieldLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    labelWithHelp: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fieldLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.text,
        marginRight: 8,
    },
    helpIcon: {
        padding: 2,
    },
    inputContainer: {
        backgroundColor: COLORS.subtleBlue,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
    inputFocused: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.surface,
    },
    inputError: {
        borderColor: COLORS.accent,
        backgroundColor: '#FEF2F2',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        paddingVertical: 16,
        paddingHorizontal: 16,
        fontWeight: '500',
    },
    passwordInput: {
        paddingRight: 44,
    },
    eyeButton: {
        position: 'absolute',
        right: 16,
        padding: 4,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    errorText: {
        color: COLORS.accent,
        fontSize: 13,
        marginLeft: 6,
        fontWeight: '500',
    },
    strengthContainer: {
        marginTop: 12,
    },
    strengthBar: {
        height: 4,
        backgroundColor: COLORS.border,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 6,
    },
    strengthFill: {
        height: '100%',
        borderRadius: 2,
    },
    strengthText: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'right',
    },
    matchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingHorizontal: 4,
    },
    matchText: {
        fontSize: 13,
        marginLeft: 8,
        fontWeight: '500',
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 8,
        padding: 12,
        backgroundColor: COLORS.subtleBlue,
        borderRadius: 12,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: COLORS.primary,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    termsText: {
        fontSize: 14,
        color: COLORS.text,
        flex: 1,
        lineHeight: 20,
    },
    createButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 18,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        // Elegant shadow without purple tint
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
    },
    buttonDisabled: {
        backgroundColor: '#A0C4FF',
        opacity: 0.8,
    },
    buttonInactive: {
        backgroundColor: '#CBD5E1',
        shadowOpacity: 0,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: "600",
        letterSpacing: 0.3,
    },
    buttonIcon: {
        marginLeft: 10,
    },
    loading: {
        flexDirection: "row",
        alignItems: "center",
    },
    loadingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
        marginHorizontal: 3,
    },
});