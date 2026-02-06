import { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Animated,
    Dimensions,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

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
    const [isFocused, setIsFocused] = useState({
        email: false,
        password: false,
        confirmPassword: false,
    });
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [requirements, setRequirements] = useState({
        length: false,
        uppercase: false,
        number: false,
        match: false,
    });

    // Password: min 6 chars, 1 uppercase, 1 number
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const checkmarkScale = useRef(new Animated.Value(0)).current;

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
        ]).start();
    }, []);

    // Password strength calculation
    useEffect(() => {
        const newRequirements = {
            length: password.length >= 6,
            uppercase: /[A-Z]/.test(password),
            number: /\d/.test(password),
            match: password === confirmPassword && password.length > 0,
        };
        setRequirements(newRequirements);

        // Calculate strength (0-4)
        const strength = Object.values(newRequirements).filter(Boolean).length;
        setPasswordStrength(strength);
    }, [password, confirmPassword]);

    // Validate form
    const validateForm = () => {
        const errors = { email: "", password: "", confirmPassword: "" };
        let isValid = true;

        // Email validation
        if (!email.trim()) {
            errors.email = "Email is required";
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = "Please enter a valid email";
            isValid = false;
        }

        // Password validation
        if (!password) {
            errors.password = "Password is required";
            isValid = false;
        } else if (!passwordRegex.test(password)) {
            errors.password = "Password doesn't meet requirements";
            isValid = false;
        }

        // Confirm password validation
        if (!confirmPassword) {
            errors.confirmPassword = "Please confirm your password";
            isValid = false;
        } else if (password !== confirmPassword) {
            errors.confirmPassword = "Passwords don't match";
            isValid = false;
        }

        setFormErrors(errors);
        return isValid;
    };

    const getPasswordStrengthColor = () => {
        switch (passwordStrength) {
            case 0:
                return "#FF6B6B";
            case 1:
                return "#FFA726";
            case 2:
                return "#FFD166";
            case 3:
                return "#4ECDC4";
            case 4:
                return "#4CAF50";
            default:
                return "#FF6B6B";
        }
    };

    const getPasswordStrengthText = () => {
        switch (passwordStrength) {
            case 0:
                return "Very Weak";
            case 1:
                return "Weak";
            case 2:
                return "Fair";
            case 3:
                return "Good";
            case 4:
                return "Strong";
            default:
                return "";
        }
    };

    async function signUp() {
        if (!validateForm()) return;

        setLoading(true);

        try {
            // 1️⃣ Create auth user
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        role: "passenger",
                    },
                },
            });

            if (error) {
                // Handle specific error cases
                if (error.message.includes("already registered")) {
                    Alert.alert(
                        "Account Exists",
                        "This email is already registered. Please sign in instead.",
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

            const user = data.user;
            if (!user) {
                // Email confirmation required - Success animation
                Animated.spring(checkmarkScale, {
                    toValue: 1,
                    tension: 150,
                    friction: 3,
                    useNativeDriver: true,
                }).start();

                setTimeout(() => {
                    Alert.alert(
                        "Check Your Email",
                        "Registration successful! Please check your email to confirm your account before logging in.",
                        [
                            {
                                text: "Go to Login",
                                onPress: () => router.replace("/login"),
                            },
                        ]
                    );
                }, 500);
                return;
            }

            //inserting directly without edge function
            const { error: profileError } = await supabase
                .from("users")
                .insert({
                    id: user.id,
                    email: user.email,
                    role: "passenger",
                    created_at: new Date().toISOString(),
                })
                .select();

            if (profileError) {
                console.error("Profile insertion error:", profileError);
                if (profileError.code === '23505') {
                    Alert.alert(
                        "Profile Already Exists",
                        "Your account was created, but profile already exists.",
                        [
                            {
                                text: "Continue to Login",
                                onPress: () => router.replace("/login"),
                            },
                        ]
                    );
                } else if (profileError.message.includes("row-level security")) {
                    Alert.alert(
                        "Permission Issue",
                        "Your account was created, but couldn't create profile due to security settings.",
                        [
                            {
                                text: "Contact Support",
                                onPress: () => router.replace("/login"),
                            },
                            {
                                text: "Try Login",
                                style: "default",
                                onPress: () => router.replace("/login"),
                            },
                        ]
                    );
                } else {
                    Alert.alert(
                        "Partial Success",
                        "Account created but profile setup incomplete. You can still sign in and contact support.",
                        [
                            {
                                text: "Continue to Login",
                                onPress: () => router.replace("/login"),
                            },
                        ]
                    );
                }
                setLoading(false);
                return;
            }

            const {
                data: { user: currentUser },
            } = await supabase.auth.getUser();

            if (currentUser && currentUser.email_confirmed_at) {
                // User email is already confirmed - auto login
                const { error: loginError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (loginError) {
                    Alert.alert(
                        "Success",
                        "Account created! Please log in manually.",
                        [
                            {
                                text: "OK",
                                onPress: () => router.replace("/login"),
                            },
                        ]
                    );
                } else {
                    // Success animation
                    Animated.spring(checkmarkScale, {
                        toValue: 1,
                        tension: 150,
                        friction: 3,
                        useNativeDriver: true,
                    }).start();

                    setTimeout(() => {
                        router.replace("/(tabs)");
                    }, 800);
                }
            } else {
                Animated.spring(checkmarkScale, {
                    toValue: 1,
                    tension: 150,
                    friction: 3,
                    useNativeDriver: true,
                }).start();

                setTimeout(() => {
                    Alert.alert(
                        "Check Your Email",
                        "Registration successful! Please check your email to confirm your account before logging in.",
                        [
                            {
                                text: "Go to Login",
                                onPress: () => router.replace("/login"),
                            },
                        ]
                    );
                }, 500);
            }
        } catch (err) {
            console.error("Register error:", err);
            Alert.alert(
                "Registration Failed",
                err.message || "An error occurred during registration. Please try again."
            );
        } finally {
            setLoading(false);
        }
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
                    {/* Success Checkmark (Hidden by default) */}
                    <Animated.View
                        style={[
                            styles.successOverlay,
                            {
                                opacity: checkmarkScale,
                                transform: [{ scale: checkmarkScale }],
                            },
                        ]}
                    >
                        <View style={styles.successContainer}>
                            <Feather name="check-circle" size={80} color="#4CAF50" />
                            <Text style={styles.successText}>Account Created!</Text>
                            <Text style={styles.successSubtext}>Redirecting...</Text>
                        </View>
                    </Animated.View>

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                            disabled={loading}
                        >
                            <Feather name="arrow-left" size={24} color="#4A90E2" />
                        </TouchableOpacity>
                        <View style={styles.logoContainer}>
                            <Feather name="user-plus" size={50} color="#4A90E2" />
                        </View>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join us and start your journey</Text>
                    </View>

                    {/* Form */}
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
                                <Text
                                    style={[
                                        styles.inputLabel,
                                        isFocused.email && styles.inputLabelFocused,
                                    ]}
                                >
                                    Email Address
                                </Text>
                            </View>
                            <TextInput
                                placeholder="your@email.com"
                                placeholderTextColor="#999"
                                autoCapitalize="none"
                                autoComplete="email"
                                keyboardType="email-address"
                                value={email}
                                onChangeText={(text) => {
                                    setEmail(text);
                                    if (formErrors.email)
                                        setFormErrors({ ...formErrors, email: "" });
                                }}
                                onFocus={() => setIsFocused({ ...isFocused, email: true })}
                                onBlur={() => setIsFocused({ ...isFocused, email: false })}
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
                                <Text
                                    style={[
                                        styles.inputLabel,
                                        isFocused.password && styles.inputLabelFocused,
                                    ]}
                                >
                                    Password
                                </Text>
                            </View>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    placeholder="Create a strong password"
                                    placeholderTextColor="#999"
                                    secureTextEntry={!passwordVisible}
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        if (formErrors.password)
                                            setFormErrors({ ...formErrors, password: "" });
                                    }}
                                    onFocus={() => setIsFocused({ ...isFocused, password: true })}
                                    onBlur={() => setIsFocused({ ...isFocused, password: false })}
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

                            {/* Password Strength Indicator */}
                            {password.length > 0 && (
                                <View style={styles.strengthContainer}>
                                    <View style={styles.strengthBar}>
                                        {[1, 2, 3, 4].map((index) => (
                                            <View
                                                key={index}
                                                style={[
                                                    styles.strengthSegment,
                                                    {
                                                        backgroundColor:
                                                            index <= passwordStrength
                                                                ? getPasswordStrengthColor()
                                                                : "#E2E8F0",
                                                    },
                                                ]}
                                            />
                                        ))}
                                    </View>
                                    <Text
                                        style={[
                                            styles.strengthText,
                                            { color: getPasswordStrengthColor() },
                                        ]}
                                    >
                                        {getPasswordStrengthText()}
                                    </Text>
                                </View>
                            )}

                            {/* Password Requirements */}
                            <View style={styles.requirementsContainer}>
                                <Text style={styles.requirementsTitle}>
                                    Password must include:
                                </Text>
                                <View style={styles.requirementItem}>
                                    <Feather
                                        name={requirements.length ? "check-circle" : "circle"}
                                        size={14}
                                        color={requirements.length ? "#4CAF50" : "#666"}
                                    />
                                    <Text
                                        style={[
                                            styles.requirementText,
                                            requirements.length && styles.requirementMet,
                                        ]}
                                    >
                                        At least 6 characters
                                    </Text>
                                </View>
                                <View style={styles.requirementItem}>
                                    <Feather
                                        name={requirements.uppercase ? "check-circle" : "circle"}
                                        size={14}
                                        color={requirements.uppercase ? "#4CAF50" : "#666"}
                                    />
                                    <Text
                                        style={[
                                            styles.requirementText,
                                            requirements.uppercase && styles.requirementMet,
                                        ]}
                                    >
                                        One uppercase letter
                                    </Text>
                                </View>
                                <View style={styles.requirementItem}>
                                    <Feather
                                        name={requirements.number ? "check-circle" : "circle"}
                                        size={14}
                                        color={requirements.number ? "#4CAF50" : "#666"}
                                    />
                                    <Text
                                        style={[
                                            styles.requirementText,
                                            requirements.number && styles.requirementMet,
                                        ]}
                                    >
                                        One number
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Confirm Password Input */}
                        <View style={styles.inputContainer}>
                            <View style={styles.inputLabelContainer}>
                                <Feather
                                    name="lock"
                                    size={16}
                                    color={isFocused.confirmPassword ? "#4A90E2" : "#666"}
                                    style={styles.inputIcon}
                                />
                                <Text
                                    style={[
                                        styles.inputLabel,
                                        isFocused.confirmPassword && styles.inputLabelFocused,
                                    ]}
                                >
                                    Confirm Password
                                </Text>
                            </View>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    placeholder="Re-enter your password"
                                    placeholderTextColor="#999"
                                    secureTextEntry={!confirmPasswordVisible}
                                    value={confirmPassword}
                                    onChangeText={(text) => {
                                        setConfirmPassword(text);
                                        if (formErrors.confirmPassword)
                                            setFormErrors({ ...formErrors, confirmPassword: "" });
                                    }}
                                    onFocus={() =>
                                        setIsFocused({ ...isFocused, confirmPassword: true })
                                    }
                                    onBlur={() =>
                                        setIsFocused({ ...isFocused, confirmPassword: false })
                                    }
                                    style={[
                                        styles.input,
                                        styles.passwordInput,
                                        isFocused.confirmPassword && styles.inputFocused,
                                        formErrors.confirmPassword && styles.inputError,
                                    ]}
                                    editable={!loading}
                                />
                                <TouchableOpacity
                                    onPress={() =>
                                        setConfirmPasswordVisible(!confirmPasswordVisible)
                                    }
                                    style={styles.visibilityToggle}
                                    disabled={loading}
                                >
                                    <Feather
                                        name={confirmPasswordVisible ? "eye-off" : "eye"}
                                        size={20}
                                        color="#666"
                                    />
                                </TouchableOpacity>
                            </View>
                            {formErrors.confirmPassword ? (
                                <Text style={styles.errorText}>{formErrors.confirmPassword}</Text>
                            ) : null}

                            {/* Password Match Indicator */}
                            {password.length > 0 && confirmPassword.length > 0 && (
                                <View style={styles.matchContainer}>
                                    <Feather
                                        name={requirements.match ? "check" : "x"}
                                        size={16}
                                        color={requirements.match ? "#4CAF50" : "#FF6B6B"}
                                    />
                                    <Text
                                        style={[
                                            styles.matchText,
                                            { color: requirements.match ? "#4CAF50" : "#FF6B6B" },
                                        ]}
                                    >
                                        {requirements.match ? "Passwords match" : "Passwords don't match"}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Terms and Conditions */}
                        <View style={styles.termsContainer}>
                            <Text style={styles.termsText}>
                                By creating an account, you agree to our{" "}
                                <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                                <Text style={styles.termsLink}>Privacy Policy</Text>
                            </Text>
                        </View>

                        {/* Create Account Button */}
                        <TouchableOpacity
                            style={[
                                styles.createButton,
                                loading && styles.createButtonDisabled,
                                (passwordStrength < 3 || !email || !confirmPassword) &&
                                styles.createButtonDisabled,
                            ]}
                            onPress={signUp}
                            disabled={
                                loading ||
                                passwordStrength < 3 ||
                                !email ||
                                !confirmPassword
                            }
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.createButtonText}>Create Account</Text>
                                    <Feather name="arrow-right" size={20} color="#FFF" />
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.dividerContainer}>
                            <View style={styles.divider} />
                            <Text style={styles.dividerText}>Already have an account?</Text>
                            <View style={styles.divider} />
                        </View>

                        {/* Sign In Link */}
                        <TouchableOpacity
                            style={styles.signinContainer}
                            onPress={() => router.replace("/login")}
                            disabled={loading}
                        >
                            <Text style={styles.signinText}>Sign in to your account</Text>
                            <Feather name="log-in" size={18} color="#4A90E2" />
                        </TouchableOpacity>
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
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    content: {
        width: "100%",
        maxWidth: 400,
        alignSelf: "center",
        position: "relative",
    },
    successOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        borderRadius: 20,
    },
    successContainer: {
        alignItems: "center",
    },
    successText: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1A1A1A",
        marginTop: 20,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    successSubtext: {
        fontSize: 16,
        color: "#666",
        marginTop: 8,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    header: {
        alignItems: "center",
        marginBottom: 40,
        position: "relative",
    },
    backButton: {
        position: "absolute",
        left: 0,
        top: 0,
        padding: 8,
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
        marginBottom: 24,
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
    strengthContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 12,
        marginBottom: 8,
    },
    strengthBar: {
        flex: 1,
        flexDirection: "row",
        height: 4,
        backgroundColor: "#E2E8F0",
        borderRadius: 2,
        overflow: "hidden",
        marginRight: 12,
    },
    strengthSegment: {
        flex: 1,
        height: "100%",
        marginHorizontal: 1,
        borderRadius: 2,
    },
    strengthText: {
        fontSize: 12,
        fontWeight: "600",
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    requirementsContainer: {
        backgroundColor: "#F8FAFC",
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
    },
    requirementsTitle: {
        fontSize: 12,
        fontWeight: "600",
        color: "#666",
        marginBottom: 8,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    requirementItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },
    requirementText: {
        fontSize: 12,
        color: "#666",
        marginLeft: 8,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    requirementMet: {
        color: "#4CAF50",
        fontWeight: "500",
    },
    matchContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        marginLeft: 4,
    },
    matchText: {
        fontSize: 12,
        marginLeft: 6,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    termsContainer: {
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    termsText: {
        fontSize: 12,
        color: "#666",
        textAlign: "center",
        lineHeight: 18,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    termsLink: {
        color: "#4A90E2",
        fontWeight: "500",
    },
    createButton: {
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
    createButtonDisabled: {
        backgroundColor: "#A0C4FF",
        shadowOpacity: 0.1,
    },
    createButtonText: {
        color: "#FFF",
        fontSize: 18,
        fontWeight: "600",
        marginRight: 8,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    dividerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 24,
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
    signinContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 12,
    },
    signinText: {
        color: "#4A90E2",
        fontSize: 16,
        fontWeight: "600",
        marginRight: 8,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
});