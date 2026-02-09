import { useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Easing,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../providers/AuthProvider";
import { useProfile } from "../lib/useProfile";
import { Session } from "@supabase/supabase-js";

// Color palette
const COLORS = {
    background: "#39A0ED", // Fresh blue background
    guestColor: "#F87171", // Softer red for guest
    userColor: "#FFFFFF", // White for logged in (contrasts with blue)
    dotColor: "#FFFFFF", // White for the three dots
    text: "#FFFFFF", // White text
    textMuted: "rgba(255, 255, 255, 0.8)", // Slightly transparent white
};

export default function UserEnter() {
    const authContext = useAuth();
    const session: Session | null = authContext?.session ?? null;
    const isLoading = authContext?.isLoading ?? false;

    const { profile, loading: loadingProfile } = useProfile(session);

    // Animation refs
    const dotBounces = [
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
    ];

    // Title animations
    const titleFade = useRef(new Animated.Value(0)).current;
    const titleSlide = useRef(new Animated.Value(20)).current;
    const titleScale = useRef(new Animated.Value(0.95)).current;

    // Dots animations
    const dotsFade = useRef(new Animated.Value(0)).current;
    const dotsScale = useRef(new Animated.Value(0.85)).current;

    // Setup animations
    useEffect(() => {
        // 1. Title animation sequence (more refined)
        Animated.parallel([
            Animated.timing(titleFade, {
                toValue: 1,
                duration: 700,
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

        // 2. Dots animation (delayed start)
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(dotsFade, {
                    toValue: 1,
                    duration: 500,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.spring(dotsScale, {
                    toValue: 1,
                    tension: 200,
                    friction: 5,
                    useNativeDriver: true,
                }),
            ]).start();

            // 3. Start wave animation after dots appear
            const waveTimeout = setTimeout(() => {
                dotBounces.forEach((dot, index) => {
                    Animated.loop(
                        Animated.sequence([
                            Animated.delay(index * 200), // Slightly faster wave
                            Animated.spring(dot, {
                                toValue: 1,
                                tension: 190, // Balanced spring
                                friction: 5,
                                useNativeDriver: true,
                            }),
                            Animated.spring(dot, {
                                toValue: 0,
                                tension: 190,
                                friction: 5,
                                useNativeDriver: true,
                            }),
                            Animated.delay(400), // Balanced pause
                        ])
                    ).start();
                });
            }, 200);

            return () => clearTimeout(waveTimeout);
        }, 300); // Dots appear 300ms after title starts

        return () => {};
    }, []);

    // Navigation logic
    useEffect(() => {
        if (isLoading || loadingProfile) return;

        if (session && profile) {
            const timer = setTimeout(() => {
                const route =
                    profile.role === "operator" ? "/home.operator" : "/home.passenger";
                router.replace(route);
            }, 500);
            return () => clearTimeout(timer);
        }

        if (!session) {
            const timer = setTimeout(() => {
                router.replace("/home.passenger");
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [session, profile, isLoading, loadingProfile]);

    return (
        <View style={styles.container}>

            {/* Lakbay Title - More centered */}
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
                <Text style={styles.subtitle}>
                    {session ? "Welcome back" : "Effortless commuting"}
                </Text>
            </Animated.View>

            {/* Dots - Smaller and positioned */}
            <Animated.View
                style={[
                    styles.dotsContainer,
                    {
                        opacity: dotsFade,
                        transform: [{ scale: dotsScale }],
                    },
                ]}
            >
                {dotBounces.map((dot, index) => (
                    <Animated.View
                        key={index}
                        style={[
                            styles.dot,
                            {
                                backgroundColor: index === 0
                                    ? (session ? COLORS.userColor : COLORS.guestColor)
                                    : COLORS.dotColor,
                                transform: [
                                    {
                                        translateY: dot.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, -8], // Reduced bounce for smaller dots
                                        }),
                                    },
                                ],
                            },
                        ]}
                    />
                ))}
            </Animated.View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: "center",
        alignItems: "center",
    },
    titleContainer: {
        position: "absolute",
        top: "40%", // More centered vertically
        transform: [{ translateY: -50 }], // Offset to truly center
        alignItems: "center",
    },
    title: {
        fontSize: 44, // Slightly smaller for balance
        fontWeight: "800",
        color: COLORS.text,
        letterSpacing: 0.8,
        marginBottom: 8,
        textShadowColor: "rgba(0, 0, 0, 0.15)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    subtitle: {
        fontSize: 15,
        fontWeight: "500",
        color: COLORS.textMuted,
        letterSpacing: 0.4,
    },
    dotsContainer: {
        position: "absolute",
        top: "55%", // Positioned below title
        flexDirection: "row",
        alignItems: "flex-end",
        height: 32, // Reduced height
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    dot: {
        width: 12, // Smaller dots
        height: 12,
        borderRadius: 6,
        marginHorizontal: 8, // Adjusted spacing
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
});