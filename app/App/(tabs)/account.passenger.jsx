// account.passenger.js
import { useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
    Animated,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";
import { useAuth } from '../../providers/AuthProvider';
import { Feather } from "@expo/vector-icons";

const COLORS = {
    primary: "#39A0ED",
    background: "#FFFFFF",
    surface: "#F9FAFB",
    text: {
        primary: "#111827",
        secondary: "#6B7280",
        tertiary: "#9CA3AF",
    },
    accent: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
};

export default function PassengerAccount() {
    const { session } = useAuth();
    const isGuest = !session;

    const userData = {
        points: 847,
        streak: 5,
        level: 2,
        trips: 47,
    };

    // Simple entry animation
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
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

    const handleSignOut = () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        await supabase.auth.signOut();
                        router.replace("/login");
                    }
                }
            ]
        );
    };

    // ------------------- Guest View -------------------
    if (isGuest) {
        return (
            <View style={styles.container}>
                <ScrollView
                    contentContainerStyle={styles.guestScroll}
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View
                        style={[
                            styles.guestContent,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }]
                            }
                        ]}
                    >
                        <View style={styles.guestIcon}>
                            <Feather name="user" size={40} color={COLORS.primary} />
                        </View>
                        <Text style={styles.guestTitle}>Welcome to Lakbay</Text>
                        <Text style={styles.guestSubtitle}>
                            Sign in to track trips, earn rewards, and save routes.
                        </Text>

                        <TouchableOpacity
                            style={[styles.button, styles.primaryButton]}
                            onPress={() => router.push("/login")}
                            activeOpacity={0.8}
                        >
                            <Feather name="log-in" size={18} color="#FFF" />
                            <Text style={styles.primaryButtonText}>Sign In</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.secondaryButton]}
                            onPress={() => router.push("/register")}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.secondaryButtonText}>Create Account</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.backLink}
                            onPress={() => router.push("/home.passenger")}
                        >
                            <Feather name="chevron-left" size={16} color={COLORS.text.secondary} />
                            <Text style={styles.backLinkText}>Back to Home</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </View>
        );
    }

    // ------------------- Authenticated View -------------------
    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header: home + level badge */}
                <Animated.View
                    style={[
                        styles.header,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <TouchableOpacity
                        style={styles.homeButton}
                        onPress={() => router.push("/home.passenger")}
                        activeOpacity={0.7}
                    >
                        <Feather name="home" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    <View style={styles.levelBadge}>
                        <Text style={styles.levelText}>Lvl {userData.level}</Text>
                    </View>
                </Animated.View>

                {/* Stats Cards – unified numbers */}
                <Animated.View
                    style={[
                        styles.statsGrid,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <View style={styles.statCard}>
                        <Feather name="star" size={18} color={COLORS.primary} />
                        <Text style={styles.statValue}>{userData.points}</Text>
                        <Text style={styles.statLabel}>Points</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Feather name="zap" size={18} color={COLORS.warning} />
                        <Text style={styles.statValue}>{userData.streak}</Text>
                        <Text style={styles.statLabel}>Day streak</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Feather name="navigation" size={18} color={COLORS.accent} />
                        <Text style={styles.statValue}>{userData.trips}</Text>
                        <Text style={styles.statLabel}>Trips</Text>
                    </View>
                </Animated.View>

                {/* Quick Actions – no Profile */}
                <Animated.View
                    style={[
                        styles.section,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        <ActionButton
                            icon="award"
                            label="Rewards"
                            onPress={() => router.push("/rewards")}
                            color={COLORS.warning}
                        />
                        <ActionButton
                            icon="settings"
                            label="Settings"
                            onPress={() => router.push("/settings")}
                            color={COLORS.text.secondary}
                        />
                        <ActionButton
                            icon="help-circle"
                            label="Help"
                            onPress={() => router.push("/help")}
                            color={COLORS.text.secondary}
                        />
                    </View>
                </Animated.View>

                {/* Recent Activity – now styled like route cards */}
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
                        <Text style={styles.sectionTitle}>Recent Activity</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>See all</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.activityList}>
                        <ActivityCard
                            icon="map-pin"
                            title="Saved new route"
                            time="2 hours ago"
                            points={10}
                        />
                        <ActivityCard
                            icon="navigation"
                            title="Trip completed"
                            time="Yesterday"
                            points={25}
                        />
                        <ActivityCard
                            icon="star"
                            title="Level up!"
                            time="3 days ago"
                            points={50}
                        />
                    </View>
                </Animated.View>

                {/* Sign Out & Version */}
                <Animated.View
                    style={[
                        styles.footer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <TouchableOpacity
                        style={styles.signOutButton}
                        onPress={handleSignOut}
                        activeOpacity={0.8}
                    >
                        <Feather name="log-out" size={18} color={COLORS.error} />
                        <Text style={styles.signOutText}>Sign Out</Text>
                    </TouchableOpacity>
                    <Text style={styles.version}>Lakbay v1.0</Text>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ----- Inline components -----

const ActionButton = ({ icon, label, onPress, color }) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.actionIcon, { backgroundColor: `${color}10` }]}>
            <Feather name={icon} size={18} color={color} />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
);

// ActivityCard – mimics the "Routes Near You" card layout
const ActivityCard = ({ icon, title, time, points }) => (
    <View style={styles.activityCard}>
        <View style={styles.activityBadge}>
            <Feather name={icon} size={18} color={COLORS.primary} />
        </View>
        <View style={styles.activityInfo}>
            <Text style={styles.activityTitle}>{title}</Text>
            <Text style={styles.activityTime}>{time}</Text>
        </View>
        <View style={styles.pointsTag}>
            <Text style={styles.pointsText}>+{points}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // --- Guest ---
    guestScroll: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    guestContent: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    guestIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${COLORS.primary}10`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    guestTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text.primary,
        marginBottom: 12,
        textAlign: 'center',
    },
    guestSubtitle: {
        fontSize: 16,
        color: COLORS.text.secondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        maxWidth: 280,
    },
    button: {
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 24,
        width: '100%',
        marginBottom: 12,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.primary + '20',
    },
    secondaryButtonText: {
        color: COLORS.text.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 16,
        paddingVertical: 8,
    },
    backLinkText: {
        fontSize: 15,
        color: COLORS.text.secondary,
    },

    // --- Authenticated ---
    scrollContent: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    homeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${COLORS.primary}10`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    levelBadge: {
        backgroundColor: `${COLORS.primary}10`,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
    },
    levelText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.primary,
    },

    // Stats – cleaner, numbers in neutral color
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text.primary,
        marginTop: 6,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.text.secondary,
        fontWeight: '500',
    },

    // Sections
    section: {
        paddingHorizontal: 20,
        marginTop: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text.primary,
    },
    seeAll: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '500',
    },

    // Quick Actions – three buttons, flex:1
    actionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    actionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text.primary,
    },

    // Activity list – route card style
    activityList: {
        gap: 8,
    },
    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    activityBadge: {
        minWidth: 44,
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: `${COLORS.primary}10`,
        borderRadius: 8,
    },
    activityInfo: {
        flex: 1,
        marginLeft: 16,
    },
    activityTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text.primary,
        marginBottom: 4,
    },
    activityTime: {
        fontSize: 14,
        color: COLORS.text.secondary,
    },
    pointsTag: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: `${COLORS.warning}10`,
        borderRadius: 6,
    },
    pointsText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.warning,
    },

    // Footer
    footer: {
        paddingHorizontal: 20,
        marginTop: 32,
        alignItems: 'center',
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: 16,
        backgroundColor: `${COLORS.error}08`,
        borderRadius: 14,
        gap: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: `${COLORS.error}20`,
    },
    signOutText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.error,
    },
    version: {
        fontSize: 13,
        color: COLORS.text.tertiary,
    },
});