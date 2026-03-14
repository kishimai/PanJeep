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
    ActivityIndicator,
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

export default function Register() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [formErrors, setFormErrors] = useState({ email: "", password: "", confirm: "", name: "" });

    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [confirmFocused, setConfirmFocused] = useState(false);
    const [nameFocused, setNameFocused] = useState(false);

    const authContext = useAuth();
    const session = authContext?.session ?? null;
    const isLoading = authContext?.isLoading ?? false;
    const { profile, loading: profileLoading, refresh: refreshProfile } = useProfile(session);

    // Redirect if already a registered user (non‑guest)
    useEffect(() => {
        if (!isLoading && !profileLoading && session && profile && !profile.is_guest) {
            router.replace("/account.passenger");
        }
    }, [session, profile, isLoading, profileLoading]);

    // Animations (similar to login)
    const titleFade = useRef(new Animated.Value(0)).current;
    const titleSlide = useRef(new Animated.Value(20)).current;
    const titleScale = useRef(new Animated.Value(0.95)).current;
    const formFade = useRef(new Animated.Value(0)).current;
    const formSlide = useRef(new Animated.Value(30)).current;
    const formScale = useRef(new Animated.Value(0.98)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;

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

    const dismissKeyboard = () => Keyboard.dismiss();

    const validateForm = () => {
        const errors = { email: "", password: "", confirm: "", name: "" };
        let hasError = false;

        if (!fullName.trim()) {
            errors.name = "Full name is required";
            hasError = true;
        }

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

        if (password !== confirmPassword) {
            errors.confirm = "Passwords do not match";
            hasError = true;
        }

        setFormErrors(errors);
        return !hasError;
    };

    const handleUpgrade = async () => {
        if (!validateForm()) return;

        // Button press animation
        Animated.sequence([
            Animated.spring(buttonScale, { toValue: 0.95, tension: 300, friction: 10, useNativeDriver: true }),
            Animated.spring(buttonScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
        ]).start();

        setLoading(true);

        try {
            // 1. Upgrade the anonymous user to a real user with email/password
            const { data, error: updateError } = await supabase.auth.updateUser({
                email: email.trim(),
                password: password,
            });

            if (updateError) throw updateError;

            // 2. Update the profile in the `users` table
            const { error: profileError } = await supabase
                .from('users')
                .update({
                    email: email.trim(),
                    full_name: fullName.trim(),
                    is_guest: false,
                    upgraded_from_guest: true,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', session.user.id);

            if (profileError) throw profileError;

            // 3. Refresh the profile in context
            await refreshProfile();

            // 4. Redirect to account dashboard
            router.replace("/account.passenger");
        } catch (error) {
            console.error('Upgrade error:', error);
            Alert.alert(
                "Upgrade Failed",
                error.message || "Could not create account. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    if (isLoading || profileLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Setting up your account...</Text>
            </View>
        );
    }

    return (
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.container}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoid}>
                    <View style={styles.topSection}>
                        <Animated.View style={[styles.titleContainer, { opacity: titleFade, transform: [{ translateY: titleSlide }, { scale: titleScale }] }]}>
                            <Text style={styles.title}>Create Account</Text>
                            <Text style={styles.subtitle}>Upgrade your guest account</Text>
                        </Animated.View>
                    </View>

                    <View style={styles.bottomSection}>
                        <Animated.View style={[styles.formContainer, { opacity: formFade, transform: [{ translateY: formSlide }, { scale: formScale }] }]}>
                            {/* Full Name */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Full Name</Text>
                                <Animated.View style={[styles.inputWrapper, nameFocused && styles.inputWrapperFocused, formErrors.name && styles.inputError]}>
                                    <TextInput
                                        placeholder="Juan Dela Cruz"
                                        placeholderTextColor={COLORS.textMuted}
                                        value={fullName}
                                        onChangeText={(text) => { setFullName(text); if (formErrors.name) setFormErrors({ ...formErrors, name: "" }); }}
                                        onFocus={() => setNameFocused(true)}
                                        onBlur={() => setNameFocused(false)}
                                        style={styles.input}
                                        editable={!loading}
                                    />
                                </Animated.View>
                                {formErrors.name ? <Text style={styles.errorText}>{formErrors.name}</Text> : null}
                            </View>

                            {/* Email */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Email Address</Text>
                                <Animated.View style={[styles.inputWrapper, emailFocused && styles.inputWrapperFocused, formErrors.email && styles.inputError]}>
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

                            {/* Password */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Password</Text>
                                <Animated.View style={[styles.passwordWrapper, passwordFocused && styles.inputWrapperFocused, formErrors.password && styles.inputError]}>
                                    <TextInput
                                        placeholder="At least 6 characters"
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

                            {/* Confirm Password */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Confirm Password</Text>
                                <Animated.View style={[styles.passwordWrapper, confirmFocused && styles.inputWrapperFocused, formErrors.confirm && styles.inputError]}>
                                    <TextInput
                                        placeholder="Re‑enter password"
                                        placeholderTextColor={COLORS.textMuted}
                                        secureTextEntry={!confirmVisible}
                                        value={confirmPassword}
                                        onChangeText={(text) => { setConfirmPassword(text); if (formErrors.confirm) setFormErrors({ ...formErrors, confirm: "" }); }}
                                        onFocus={() => setConfirmFocused(true)}
                                        onBlur={() => setConfirmFocused(false)}
                                        style={[styles.input, styles.passwordInput]}
                                        editable={!loading}
                                    />
                                    <TouchableOpacity onPress={() => setConfirmVisible(!confirmVisible)} style={styles.visibilityToggle} disabled={loading}>
                                        <Feather name={confirmVisible ? "eye-off" : "eye"} size={20} color={confirmFocused ? COLORS.primary : COLORS.textMuted} />
                                    </TouchableOpacity>
                                </Animated.View>
                                {formErrors.confirm ? <Text style={styles.errorText}>{formErrors.confirm}</Text> : null}
                            </View>

                            {/* Submit Button */}
                            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                                <TouchableOpacity style={[styles.registerButton, loading && styles.registerButtonDisabled]} onPress={handleUpgrade} disabled={loading} activeOpacity={0.9}>
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <Text style={styles.registerButtonText}>Create Account</Text>
                                            <Feather name="arrow-right" size={20} color={COLORS.textLight} style={styles.registerButtonIcon} />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </Animated.View>

                            {/* Link back to login */}
                            <View style={styles.loginLinkContainer}>
                                <Text style={styles.loginLinkText}>Already have an account?</Text>
                                <TouchableOpacity onPress={() => router.push("/login")} disabled={loading}>
                                    <Text style={styles.loginLink}> Sign In</Text>
                                </TouchableOpacity>
                            </View>
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
    topSection: { height: height * 0.3, backgroundColor: COLORS.background, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
    titleContainer: { alignItems: 'center' },
    title: { fontSize: 40, fontWeight: "800", color: COLORS.textLight, letterSpacing: 0.8, marginBottom: 8, textShadowColor: "rgba(0, 0, 0, 0.15)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    subtitle: { fontSize: 16, fontWeight: "500", color: COLORS.textLightMuted, letterSpacing: 0.4, textAlign: 'center' },
    bottomSection: { flex: 1, backgroundColor: COLORS.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
    formContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 30, paddingBottom: 40 },
    inputGroup: { marginBottom: 20 },
    inputWrapper: { borderRadius: 14, backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: COLORS.border, overflow: 'hidden' },
    inputWrapperFocused: { borderColor: COLORS.borderFocused, backgroundColor: '#FFFFFF', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
    passwordWrapper: { borderRadius: 14, backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: COLORS.border, overflow: 'hidden', position: 'relative' },
    inputLabel: { fontSize: 15, fontWeight: "600", color: COLORS.text, marginBottom: 8, letterSpacing: -0.2 },
    input: { paddingHorizontal: 18, paddingVertical: 16, fontSize: 16, color: COLORS.text, fontWeight: "500", letterSpacing: 0.2, backgroundColor: 'transparent' },
    passwordInput: { paddingRight: 50 },
    inputError: { borderColor: COLORS.accent },
    errorText: { color: COLORS.accent, fontSize: 13, marginTop: 4, marginLeft: 4, fontWeight: "500" },
    visibilityToggle: { position: "absolute", right: 16, top: 14, padding: 4, zIndex: 10 },
    registerButton: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8, marginTop: 10 },
    registerButtonDisabled: { backgroundColor: "rgba(57, 160, 237, 0.7)", opacity: 0.8 },
    registerButtonText: { color: COLORS.textLight, fontSize: 17, fontWeight: "700", letterSpacing: 0.3 },
    registerButtonIcon: { marginLeft: 10 },
    loginLinkContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, marginBottom: 10 },
    loginLinkText: { fontSize: 15, color: COLORS.text.secondary },
    loginLink: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
    loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center" },
    loadingText: { fontSize: 16, color: COLORS.textLight, marginTop: 16, fontWeight: "500" },
});