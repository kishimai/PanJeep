// home.passenger.js
import { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Platform,
    Animated,
} from "react-native";
import { useAuth } from '../../providers/AuthProvider';
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

const COLORS = {
    primary: "#39A0ED",
    background: "#FFFFFF",
    text: {
        primary: "#111827",
        secondary: "#6B7280",
        light: "#FFFFFF",
    },
    surface: "#F9FAFB",
    accent: "#10B981",
    live: "#EF4444",
};

export default function PassengerHome() {
    const { session } = useAuth();
    const isGuest = session?.type === 'guest';

    // Static data - define this FIRST
    const routesNearYou = [
        {
            id: 1,
            code: "12A",
            destination: "Downtown Loop",
            time: "15m",
            fare: "₱15",
            capacity: "Moderate",
            liveJeeps: 3,
            nextJeep: "3 min"
        },
        {
            id: 2,
            code: "8B",
            destination: "University Express",
            time: "7m",
            fare: "₱12",
            capacity: "Light",
            liveJeeps: 2,
            nextJeep: "Now"
        },
        {
            id: 3,
            code: "5C",
            destination: "Coastal Line",
            time: "20m",
            fare: "₱20",
            capacity: "Heavy",
            liveJeeps: 5,
            nextJeep: "7 min"
        },
    ];

    const liveJeeps = [
        { id: 1, route: "12A", distance: "0.8 km", capacity: "12/20", arrival: "3 min" },
        { id: 2, route: "8B", distance: "1.2 km", capacity: "5/20", arrival: "Now" },
        { id: 3, route: "5C", distance: "2.1 km", capacity: "18/20", arrival: "7 min" },
    ];

    // Now define animations AFTER the data
    // Entry animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    // Button press animations
    const buttonScale = useRef(new Animated.Value(1)).current;
    const searchScale = useRef(new Animated.Value(1)).current;

    // Card hover/press animations
    const cardAnimations = useRef(
        routesNearYou.map(() => new Animated.Value(1))
    ).current;

    useEffect(() => {
        // Entry animation when component mounts
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleButtonPressIn = (scaleAnim) => {
        Animated.spring(scaleAnim, {
            toValue: 0.96,
            useNativeDriver: true,
            friction: 8,
        }).start();
    };

    const handleButtonPressOut = (scaleAnim) => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 8,
        }).start();
    };

    const handleCardPressIn = (index) => {
        Animated.spring(cardAnimations[index], {
            toValue: 0.98,
            useNativeDriver: true,
            friction: 8,
        }).start();
    };

    const handleCardPressOut = (index) => {
        Animated.spring(cardAnimations[index], {
            toValue: 1,
            useNativeDriver: true,
            friction: 8,
        }).start();
    };

    const navigateToRoutes = () => {
        router.push('/routes.passenger');
    };

    const navigateToAccount = () => {
        router.push(isGuest ? '/register' : '/account.passenger');
    };

    // Animated wrapper for Jeep cards
    const AnimatedJeepCard = ({ jeep, index }) => {
        const jeepCardScale = useRef(new Animated.Value(1)).current;

        return (
            <Animated.View
                style={[
                    styles.jeepCard,
                    {
                        transform: [{ scale: jeepCardScale }],
                        opacity: fadeAnim,
                    }
                ]}
            >
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPressIn={() => Animated.spring(jeepCardScale, {
                        toValue: 0.96,
                        useNativeDriver: true,
                        friction: 8,
                    }).start()}
                    onPressOut={() => Animated.spring(jeepCardScale, {
                        toValue: 1,
                        useNativeDriver: true,
                        friction: 8,
                    }).start()}
                    onPress={navigateToRoutes}
                >
                    <View style={styles.routeBadge}>
                        <Text style={styles.routeCode}>{jeep.route}</Text>
                    </View>
                    <View style={styles.jeepDetails}>
                        <View style={styles.jeepDetail}>
                            <Feather name="map-pin" size={12} color={COLORS.text.secondary} />
                            <Text style={styles.jeepDetailText}>{jeep.distance}</Text>
                        </View>
                        <View style={styles.jeepDetail}>
                            <Feather name="clock" size={12} color={COLORS.text.secondary} />
                            <Text style={[
                                styles.arrivalText,
                                jeep.arrival === 'Now' && styles.arrivalNow
                            ]}>{jeep.arrival}</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Static Header Section - Removed animations */}
                <View style={styles.headerSection}>
                    <View style={styles.headerRow}>
                        <Animated.View
                            style={[
                                styles.headerContent,
                                {
                                    opacity: fadeAnim,
                                    transform: [{ translateY: slideAnim }]
                                }
                            ]}
                        >
                            <Text style={styles.logo}>Lakbay</Text>
                            <Text style={styles.headerSubtitle}>Commute smarter</Text>
                        </Animated.View>

                        <Animated.View
                            style={{
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }]
                            }}
                        >
                            <TouchableOpacity
                                style={styles.accountButton}
                                onPress={navigateToAccount}
                                onPressIn={() => handleButtonPressIn(buttonScale)}
                                onPressOut={() => handleButtonPressOut(buttonScale)}
                                activeOpacity={0.8}
                            >
                                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                                    <Feather
                                        name={isGuest ? "compass" : "user"}
                                        size={20}
                                        color={COLORS.primary}
                                    />
                                </Animated.View>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                </View>

                {/* Animated Search trigger */}
                <Animated.View
                    style={[
                        {
                            opacity: fadeAnim,
                            transform: [
                                { translateY: slideAnim },
                                { scale: searchScale }
                            ]
                        }
                    ]}
                >
                    <TouchableOpacity
                        style={styles.searchTrigger}
                        onPress={navigateToRoutes}
                        onPressIn={() => handleButtonPressIn(searchScale)}
                        onPressOut={() => handleButtonPressOut(searchScale)}
                        activeOpacity={0.8}
                    >
                        <Feather name="search" size={18} color={COLORS.text.secondary} />
                        <Text style={styles.searchText}>Where to?</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Live Jeeps Near You */}
                <Animated.View
                    style={[
                        styles.section,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <Feather name="navigation" size={16} color={COLORS.live} />
                            <Text style={styles.sectionTitle}>Live Jeeps</Text>
                        </View>
                    </View>

                    <View style={styles.liveJeepsGrid}>
                        {liveJeeps.map((jeep, index) => (
                            <AnimatedJeepCard key={jeep.id} jeep={jeep} index={index} />
                        ))}
                    </View>
                </Animated.View>

                {/* Routes Near You with staggered animation */}
                <Animated.View
                    style={[
                        styles.section,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <Feather name="map" size={16} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>Routes Near You</Text>
                        </View>
                        <TouchableOpacity
                            onPress={navigateToRoutes}
                            onPressIn={() => handleButtonPressIn(buttonScale)}
                            onPressOut={() => handleButtonPressOut(buttonScale)}
                            activeOpacity={0.8}
                        >
                            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                                <Feather name="chevron-right" size={18} color={COLORS.primary} />
                            </Animated.View>
                        </TouchableOpacity>
                    </View>

                    {routesNearYou.map((route, index) => (
                        <Animated.View
                            key={route.id}
                            style={{
                                opacity: fadeAnim,
                                transform: [
                                    { translateY: slideAnim },
                                    { scale: cardAnimations[index] }
                                ]
                            }}
                        >
                            <TouchableOpacity
                                style={styles.routeCard}
                                onPress={navigateToRoutes}
                                onPressIn={() => handleCardPressIn(index)}
                                onPressOut={() => handleCardPressOut(index)}
                                activeOpacity={0.9}
                                delayPressIn={50}
                            >
                                <View style={styles.routeBadge}>
                                    <Text style={styles.routeCode}>{route.code}</Text>
                                </View>
                                <View style={styles.routeInfo}>
                                    <Text style={styles.routeDestination}>{route.destination}</Text>
                                    <View style={styles.routeMeta}>
                                        <Text style={styles.routeTime}>{route.time}  •  {route.fare}</Text>
                                        <View style={[
                                            styles.capacityTag,
                                            route.capacity === 'Light' && styles.capacityLight,
                                            route.capacity === 'Heavy' && styles.capacityHeavy,
                                        ]}>
                                            <Text style={styles.capacityTagText}>{route.capacity}</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </Animated.View>

                {/* Guest hint */}
                {isGuest && (
                    <Animated.View
                        style={{
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }}
                    >
                        <TouchableOpacity
                            style={styles.guestSection}
                            onPress={() => router.push('/register')}
                            onPressIn={() => handleButtonPressIn(buttonScale)}
                            onPressOut={() => handleButtonPressOut(buttonScale)}
                            activeOpacity={0.8}
                        >
                            <Feather name="star" size={16} color={COLORS.primary} />
                            <Text style={styles.guestText}>Sign up to save routes</Text>
                            <Feather name="chevron-right" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Bottom spacing */}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 40,
    },
    headerSection: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerContent: {
        flex: 1,
    },
    accountButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(57, 160, 237, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    logo: {
        fontSize: 32,
        fontWeight: '800',
        color: COLORS.text.primary,
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: COLORS.primary,
        fontWeight: '500',
    },
    searchTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 32,
        padding: 16,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(57, 160, 237, 0.02)',
    },
    searchText: {
        fontSize: 16,
        color: COLORS.text.secondary,
        flex: 1,
        marginLeft: 12,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text.primary,
    },
    liveJeepsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        gap: 12,
    },
    jeepCard: {
        width: '48%',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.02)',
    },
    routeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: 'rgba(57, 160, 237, 0.1)',
        borderRadius: 8,
        minWidth: 44,
        alignItems: 'center',
        marginBottom: 12,
    },
    routeCode: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.primary,
    },
    jeepDetails: {
        gap: 6,
    },
    jeepDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    jeepDetailText: {
        fontSize: 12,
        color: COLORS.text.secondary,
    },
    arrivalText: {
        fontSize: 12,
        color: COLORS.text.secondary,
    },
    arrivalNow: {
        color: COLORS.live,
        fontWeight: '600',
    },
    routeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    routeInfo: {
        flex: 1,
        marginLeft: 16,
    },
    routeDestination: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text.primary,
        marginBottom: 4,
    },
    routeMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    routeTime: {
        fontSize: 14,
        color: COLORS.text.secondary,
    },
    capacityTag: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderRadius: 6,
    },
    capacityLight: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    capacityHeavy: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    capacityTagText: {
        fontSize: 12,
        color: COLORS.accent,
        fontWeight: '600',
    },
    guestSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        padding: 12,
        backgroundColor: 'rgba(57, 160, 237, 0.05)',
        borderRadius: 12,
        gap: 8,
    },
    guestText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '500',
    },
});