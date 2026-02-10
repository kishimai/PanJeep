import { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Dimensions,
    Platform,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";
import { useAuth } from '../../providers/AuthProvider';
import { Feather } from "@expo/vector-icons";
import Animated, {
    FadeInDown,
    FadeIn,
    SlideInRight,
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    withTiming
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

// Soft color palette
const COLORS = {
    primary: "#3B82F6",
    background: "#F8FAFC",
    text: {
        primary: "#1E293B",
        secondary: "#64748B",
        tertiary: "#94A3B8",
        light: "#FFFFFF",
    },
    surface: "#FFFFFF",
    accent: "#10B981",
    status: {
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
    }
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedView = Animated.createAnimatedComponent(View);

export default function PassengerAccount() {
    const { session } = useAuth();
    const [loading, setLoading] = useState(false);
    const [userData] = useState({
        points: 847,
        streak: 5,
        level: 2,
        trips: 47,
        joinedDate: "Jan 15, 2024",
    });

    const handleSignOut = async () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        setLoading(true);
                        await supabase.auth.signOut();
                        router.replace("/login");
                    }
                }
            ]
        );
    };

    // Guest state components
    if (!session) {
        return (
            <View style={styles.container}>
                <ScrollView
                    contentContainerStyle={styles.guestContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <AnimatedView
                        entering={FadeIn.delay(100)}
                        style={styles.guestContent}
                    >
                        <View style={styles.guestIllustration}>
                            <View style={styles.illustrationCircle}>
                                <Feather name="user" size={48} color={COLORS.primary} />
                            </View>
                        </View>

                        <AnimatedView entering={FadeInDown.delay(200)}>
                            <Text style={styles.guestTitle}>Welcome to Lakbay</Text>
                            <Text style={styles.guestSubtitle}>
                                Sign in to access your account, track trips, and earn rewards.
                            </Text>
                        </AnimatedView>

                        <AnimatedView entering={FadeInDown.delay(300)} style={styles.guestActions}>
                            <TouchableOpacity
                                style={[styles.button, styles.primaryButton]}
                                onPress={() => router.push("/login")}
                                activeOpacity={0.9}
                            >
                                <Feather name="log-in" size={20} color="#FFFFFF" />
                                <Text style={styles.primaryButtonText}>Sign In</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.secondaryButton]}
                                onPress={() => router.push("/register")}
                                activeOpacity={0.9}
                            >
                                <Text style={styles.secondaryButtonText}>Create Account</Text>
                            </TouchableOpacity>
                        </AnimatedView>

                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                            activeOpacity={0.7}
                        >
                            <Feather name="chevron-left" size={16} color={COLORS.text.secondary} />
                            <Text style={styles.backButtonText}>Back to Home</Text>
                        </TouchableOpacity>
                    </AnimatedView>
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header */}
                <AnimatedView
                    entering={FadeInDown.duration(400)}
                    style={styles.header}
                >
                    <View style={styles.userInfo}>
                        <View style={styles.emailContainer}>
                            <Feather name="mail" size={14} color={COLORS.text.tertiary} />
                            <Text style={styles.email} numberOfLines={1}>
                                {session.user.email}
                            </Text>
                        </View>
                        <Text style={styles.memberSince}>
                            Member since {userData.joinedDate}
                        </Text>
                    </View>

                    <View style={styles.levelBadge}>
                        <Text style={styles.levelText}>Lvl {userData.level}</Text>
                    </View>
                </AnimatedView>

                {/* Stats Cards */}
                <AnimatedView
                    entering={SlideInRight.delay(100)}
                    style={styles.statsGrid}
                >
                    <StatCard
                        icon="star"
                        value={userData.points}
                        label="Points"
                        color={COLORS.primary}
                    />
                    <StatCard
                        icon="zap"
                        value={userData.streak}
                        label="Day Streak"
                        color={COLORS.status.warning}
                    />
                    <StatCard
                        icon="navigation"
                        value={userData.trips}
                        label="Trips"
                        color={COLORS.accent}
                    />
                </AnimatedView>

                {/* Quick Actions - Smaller buttons */}
                <AnimatedView
                    entering={FadeInDown.delay(200)}
                    style={styles.section}
                >
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        <SmallActionButton
                            icon="user"
                            label="Profile"
                            onPress={() => router.push("/profile")}
                            color={COLORS.primary}
                        />
                        <SmallActionButton
                            icon="award"
                            label="Rewards"
                            onPress={() => router.push("/rewards")}
                            color={COLORS.status.warning}
                        />
                        <SmallActionButton
                            icon="settings"
                            label="Settings"
                            onPress={() => router.push("/settings")}
                            color={COLORS.text.secondary}
                        />
                        <SmallActionButton
                            icon="help-circle"
                            label="Help"
                            onPress={() => router.push("/help")}
                            color={COLORS.text.secondary}
                        />
                    </View>
                </AnimatedView>

                {/* Recent Activity */}
                <AnimatedView
                    entering={FadeInDown.delay(300)}
                    style={styles.section}
                >
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Activity</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.activityList}>
                        <ActivityItem
                            icon="map-pin"
                            title="Saved new route"
                            time="2 hours ago"
                            points={10}
                        />
                        <ActivityItem
                            icon="navigation"
                            title="Trip completed"
                            time="Yesterday"
                            points={25}
                        />
                        <ActivityItem
                            icon="star"
                            title="Level up!"
                            time="3 days ago"
                            points={50}
                        />
                    </View>
                </AnimatedView>

                {/* Sign Out Button */}
                <AnimatedView
                    entering={FadeInDown.delay(400)}
                    style={styles.footer}
                >
                    <TouchableOpacity
                        style={styles.signOutButton}
                        onPress={handleSignOut}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <View style={styles.loadingDot} />
                                <View style={styles.loadingDot} />
                                <View style={styles.loadingDot} />
                            </View>
                        ) : (
                            <>
                                <Feather name="log-out" size={18} color={COLORS.status.error} />
                                <Text style={styles.signOutText}>Sign Out</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.versionText}>Lakbay v1.0</Text>
                </AnimatedView>
            </ScrollView>
        </View>
    );
}

// Reusable Components
const StatCard = ({ icon, value, label, color }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    return (
        <AnimatedTouchable
            style={[styles.statCard, animatedStyle]}
            activeOpacity={0.9}
            onPressIn={() => {
                scale.value = withSpring(0.95);
            }}
            onPressOut={() => {
                scale.value = withSpring(1);
            }}
        >
            <Feather name={icon} size={20} color={color} />
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </AnimatedTouchable>
    );
};

const SmallActionButton = ({ icon, label, onPress, color }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    return (
        <AnimatedTouchable
            style={[styles.smallActionButton, animatedStyle]}
            onPress={onPress}
            activeOpacity={0.9}
            onPressIn={() => {
                scale.value = withSpring(0.95);
            }}
            onPressOut={() => {
                scale.value = withSpring(1);
            }}
        >
            <View style={[styles.smallActionIcon, { backgroundColor: `${color}10` }]}>
                <Feather name={icon} size={18} color={color} />
            </View>
            <Text style={styles.smallActionLabel}>{label}</Text>
        </AnimatedTouchable>
    );
};

const ActivityItem = ({ icon, title, time, points }) => {
    return (
        <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
                <Feather name={icon} size={16} color={COLORS.text.secondary} />
            </View>
            <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{title}</Text>
                <Text style={styles.activityTime}>{time}</Text>
            </View>
            <View style={styles.pointsBadge}>
                <Text style={styles.pointsText}>+{points}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    // Guest View
    guestContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    guestContent: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    guestIllustration: {
        marginBottom: 32,
    },
    illustrationCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: `${COLORS.primary}10`,
        justifyContent: 'center',
        alignItems: 'center',
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
        marginBottom: 40,
        maxWidth: 300,
    },
    guestActions: {
        width: '100%',
        gap: 12,
        marginBottom: 32,
    },
    button: {
        height: 56,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
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
    },
    secondaryButtonText: {
        color: COLORS.text.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    backButtonText: {
        fontSize: 15,
        color: COLORS.text.secondary,
        fontWeight: '500',
    },
    // Logged In View
    scrollContent: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    userInfo: {
        flex: 1,
    },
    emailContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    email: {
        fontSize: 16,
        color: COLORS.text.primary,
        fontWeight: '500',
    },
    memberSince: {
        fontSize: 14,
        color: COLORS.text.tertiary,
    },
    levelBadge: {
        backgroundColor: `${COLORS.primary}10`,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    levelText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.primary,
    },
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingVertical: 8,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        marginTop: 8,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.text.secondary,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    section: {
        paddingHorizontal: 24,
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
    seeAllText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '500',
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    smallActionButton: {
        width: (width - 72) / 4,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    smallActionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    smallActionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text.primary,
        textAlign: 'center',
    },
    activityList: {
        gap: 8,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    activityIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${COLORS.background}`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    activityContent: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text.primary,
        marginBottom: 2,
    },
    activityTime: {
        fontSize: 13,
        color: COLORS.text.tertiary,
    },
    pointsBadge: {
        backgroundColor: `${COLORS.status.warning}10`,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    pointsText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.status.warning,
    },
    footer: {
        paddingHorizontal: 24,
        marginTop: 32,
        alignItems: 'center',
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: 18,
        backgroundColor: `${COLORS.status.error}05`,
        borderRadius: 16,
        gap: 10,
        marginBottom: 24,
    },
    signOutText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.status.error,
    },
    loadingContainer: {
        flexDirection: 'row',
        gap: 6,
    },
    loadingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.status.error,
    },
    versionText: {
        fontSize: 13,
        color: COLORS.text.tertiary,
        fontWeight: '500',
    },
});