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
import { useProfile } from "../lib/useProfile";
import { Feather } from "@expo/vector-icons";

const { height } = Dimensions.get("window");

const COLORS = {
    background: "#39A0ED",
    surface: "#FFFFFF",
    text: "#1F2937",
    textMuted: "#6B7280",
    textLight: "#FFFFFF",
    textLightMuted: "rgba(255, 255, 255, 0.85)",
    primary: "#39A0ED",
    accent: "#F87171",
    border: "#E5E7EB",
    borderFocused: "#39A0ED",
};

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [formErrors, setFormErrors] = useState({ email: "", password: "" });

    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    const authContext = useAuth();
    const session = authContext?.session ?? null;
    const isLoading = authContext?.isLoading ?? false;
    const { profile, loading: profileLoading } = useProfile(session);

    // Animations
    const titleFade = useRef(new Animated.Value(0)).current;
    const titleSlide = useRef(new Animated.Value(20)).current;
    const titleScale = useRef(new Animated.Value(0.95)).current;
    const formFade = useRef(new Animated.Value(0)).current;
    const formSlide = useRef(new Animated.Value(30)).current;
    const formScale = useRef(new Animated.Value(0.98)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;
    const emailFocusAnim = useRef(new Animated.Value(0)).current;
    const passwordFocusAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(titleFade, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.spring(titleSlide, { toValue: 0, tension: 160, friction: 8, useNativeDriver: true }),
            Animated.spring(titleScale, { toValue: 1, tension: 180, friction: 6, useNativeDriver: true }),
        ]).start();

        setTimeout(() => {
            Animated.parallel([
                Animated.timing(formFade, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.spring(formSlide, { toValue: 0, tension: 170, friction: 10, useNativeDriver: true }),
                Animated.spring(formScale, { toValue: 1, tension: 190, friction: 8, useNativeDriver: true }),
            ]).start();
        }, 200);
    }, []);

    useEffect(() => {
        Animated.spring(emailFocusAnim, {
            toValue: emailFocused ? 1 : 0,
            tension: 250,
            friction: 15,
            useNativeDriver: true,
        }).start();
    }, [emailFocused]);

    useEffect(() => {
        Animated.spring(passwordFocusAnim, {
            toValue: passwordFocused ? 1 : 0,
            tension: 250,
            friction: 15,
            useNativeDriver: true,
        }).start();
    }, [passwordFocused]);

    // Redirect only if the user is a registered (non‑guest) user
    useEffect(() => {
        if (!isLoading && !profileLoading && session && profile && !profile.is_guest) {
            // User is authenticated and not a guest → go to account dashboard
            router.replace("/account.passenger");
        }
    }, [session, profile, isLoading, profileLoading]);

    const dismissKeyboard = () => Keyboard.dismiss();

    const validateAndSignIn = async () => {
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
        if (hasError) return;

        Animated.sequence([
            Animated.spring(buttonScale, { toValue: 0.95, tension: 300, friction: 10, useNativeDriver: true }),
            Animated.spring(buttonScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
        ]).start();

        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (error) {
            Alert.alert("Sign In Failed", "The email address or password is incorrect.");
            setLoading(false);
        }
        // Success: session changes, useEffect above will redirect when profile loads
    };

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            setFormErrors({ ...formErrors, email: "Enter your email to reset your password" });
            return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) {
            Alert.alert("Unable to Send", "Could not send a reset email.");
        } else {
            Alert.alert("Check Your Email", `If an account exists for ${email}, you will receive password reset instructions.`);
        }
    };

    if (isLoading || profileLoading) {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.loadingDots}>
                    {[0, 1, 2].map(i => <View key={i} style={styles.loadingDot} />)}
                </View>
                <Text style={styles.loadingText}>Checking your account...</Text>
            </View>
        );
    }

    return (
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.container}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoid}>
                    <View style={styles.topSection}>
                        <Animated.View style={[styles.titleContainer, { opacity: titleFade, transform: [{ translateY: titleSlide }, { scale: titleScale }] }]}>
                            <Text style={styles.title}>Lakbay</Text>
                            <Text style={styles.subtitle}>Welcome back to your journey</Text>
                        </Animated.View>
                    </View>

                    <View style={styles.bottomSection}>
                        <Animated.View style={[styles.formContainer, { opacity: formFade, transform: [{ translateY: formSlide }, { scale: formScale }] }]}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Email Address</Text>
                                <Animated.View style={[styles.inputWrapper, emailFocused && styles.inputWrapperFocused, formErrors.email && styles.inputError, { transform: [{ scale: emailFocusAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) }] }]}>
                                    <TextInput
                                        placeholder="you@example.com"
                                        placeholderTextColor={COLORS.textMuted}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        value={email}
                                        onChangeText={(text) => { setEmail(text); if (formErrors.email) setFormErrors({ ...formErrors, email: "" }); }}
                                        onFocus={() => setEmailFocused(true)}
                                        onBlur={() => setEmailFocused(false)}
                                        style={styles.input}
                                        editable={!loading}
                                    />
                                </Animated.View>
                                {formErrors.email ? <Text style={styles.errorText}>{formErrors.email}</Text> : null}
                            </View>

                            <View style={styles.inputGroup}>
                                <View style={styles.passwordLabelRow}>
                                    <Text style={styles.inputLabel}>Password</Text>
                                    <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
                                        <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                                    </TouchableOpacity>
                                </View>
                                <Animated.View style={[styles.passwordWrapper, passwordFocused && styles.inputWrapperFocused, formErrors.password && styles.inputError, { transform: [{ scale: passwordFocusAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) }] }]}>
                                    <TextInput
                                        placeholder="Enter your password"
                                        placeholderTextColor={COLORS.textMuted}
                                        secureTextEntry={!passwordVisible}
                                        value={password}
                                        onChangeText={(text) => { setPassword(text); if (formErrors.password) setFormErrors({ ...formErrors, password: "" }); }}
                                        onFocus={() => setPasswordFocused(true)}
                                        onBlur={() => setPasswordFocused(false)}
                                        style={[styles.input, styles.passwordInput]}
                                        editable={!loading}
                                    />
                                    <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} style={styles.visibilityToggle} disabled={loading}>
                                        <Feather name={passwordVisible ? "eye-off" : "eye"} size={20} color={passwordFocused ? COLORS.primary : COLORS.textMuted} />
                                    </TouchableOpacity>
                                </Animated.View>
                                {formErrors.password ? <Text style={styles.errorText}>{formErrors.password}</Text> : null}
                            </View>

                            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                                <TouchableOpacity style={[styles.loginButton, loading && styles.loginButtonDisabled]} onPress={validateAndSignIn} disabled={loading} activeOpacity={0.9}>
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
    container: { flex: 1, backgroundColor: COLORS.background },
    keyboardAvoid: { flex: 1 },
    topSection: { height: height * 0.35, backgroundColor: COLORS.background, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
    titleContainer: { alignItems: 'center' },
    title: { fontSize: 44, fontWeight: "800", color: COLORS.textLight, letterSpacing: 0.8, marginBottom: 12, textShadowColor: "rgba(0, 0, 0, 0.15)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    subtitle: { fontSize: 16, fontWeight: "500", color: COLORS.textLightMuted, letterSpacing: 0.4, textAlign: 'center' },
    bottomSection: { flex: 1, backgroundColor: COLORS.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
    formContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
    inputGroup: { marginBottom: 28 },
    inputWrapper: { borderRadius: 14, backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: COLORS.border, overflow: 'hidden' },
    inputWrapperFocused: { borderColor: COLORS.borderFocused, backgroundColor: '#FFFFFF', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
    passwordWrapper: { borderRadius: 14, backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: COLORS.border, overflow: 'hidden', position: 'relative' },
    inputLabel: { fontSize: 15, fontWeight: "600", color: COLORS.text, marginBottom: 10, letterSpacing: -0.2 },
    passwordLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    input: { paddingHorizontal: 18, paddingVertical: 18, fontSize: 16, color: COLORS.text, fontWeight: "500", letterSpacing: 0.2, backgroundColor: 'transparent' },
    passwordInput: { paddingRight: 50 },
    inputError: { borderColor: COLORS.accent },
    errorText: { color: COLORS.accent, fontSize: 13, marginTop: 8, marginLeft: 4, fontWeight: "500" },
    visibilityToggle: { position: "absolute", right: 16, top: 18, padding: 4, zIndex: 10 },
    forgotPasswordText: { color: COLORS.primary, fontSize: 14, fontWeight: "600" },
    loginButton: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 18, flexDirection: "row", justifyContent: "center", alignItems: "center", shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8 },
    loginButtonDisabled: { backgroundColor: "rgba(57, 160, 237, 0.7)", opacity: 0.8 },
    loginButtonText: { color: COLORS.textLight, fontSize: 17, fontWeight: "700", letterSpacing: 0.3 },
    loginButtonIcon: { marginLeft: 10 },
    loadingIndicator: { flexDirection: "row", alignItems: "center" },
    loadingDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textLight, marginHorizontal: 3 },
    loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center" },
    loadingDots: { flexDirection: "row", marginBottom: 16 },
    loadingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.textLight, marginHorizontal: 4, opacity: 0.6 },
    loadingText: { fontSize: 14, color: COLORS.textLight, opacity: 0.8, fontWeight: "500" },
});