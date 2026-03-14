import { useRef, useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
    Animated,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";
import { useAuth } from '../../providers/AuthProvider';
import { useProfile } from "../../lib/useProfile";
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
    border: {
        light: "#F3F4F6",
    },
};

// Helper to format relative time
const timeAgo = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

export default function PassengerAccount() {
    const { session } = useAuth();
    const { profile, loading: profileLoading, refresh: refreshProfile } = useProfile(session);
    const isGuest = !session || profile?.is_guest;

    // State for passenger-specific data
    const [passengerData, setPassengerData] = useState(null);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
    }, []);

    // Fetch passenger data and recent activity
    const fetchPassengerData = useCallback(async () => {
        if (!session || isGuest) {
            setLoading(false);
            return;
        }

        try {
            // Fetch passenger record (includes total_trips)
            const { data: passenger, error: passengerError } = await supabase
                .from('passengers')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (passengerError) throw passengerError;
            setPassengerData(passenger);

            // Fetch recent passenger events (board/alight) – limit 5
            const { data: events, error: eventsError } = await supabase
                .from('passenger_events')
                .select('*, routes(route_code)')
                .eq('passenger_id', session.user.id)
                .order('recorded_at', { ascending: false })
                .limit(5);

            if (eventsError) throw eventsError;

            // Transform events for display
            const formatted = events.map(event => ({
                id: event.id,
                type: event.event_type,
                routeCode: event.routes?.route_code || 'Unknown',
                time: timeAgo(event.recorded_at),
                location: event.location,
                icon: event.event_type === 'board' ? 'log-in' : 'log-out',
                color: event.event_type === 'board' ? COLORS.accent : COLORS.warning,
            }));
            setRecentActivity(formatted);
        } catch (err) {
            console.error('Error fetching passenger data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [session, isGuest]);

    // Initial load
    useEffect(() => {
        fetchPassengerData();
    }, [fetchPassengerData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        refreshProfile();
        fetchPassengerData();
    }, [refreshProfile, fetchPassengerData]);

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

    // --- Guest View (unchanged but with updated styling) ---
    if (isGuest) {
        return (
            <View style={styles.container}>
                <ScrollView
                    contentContainerStyle={styles.guestScroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                    }
                >
                    <Animated.View
                        style={[
                            styles.guestContent,
                            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
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

    // --- Authenticated View ---
    if (profileLoading || loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    // Stats (trips from passengerData, points/streak/level still mocked for now)
    const stats = {
        trips: passengerData?.total_trips || 0,
        points: 847,   // TODO: replace with real points
        streak: 5,     // TODO: compute from daily activity
        level: 2,      // TODO: derive from points
    };

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                }
            >
                {/* Header: Profile info + home button */}
                <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.profileRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'G'}
                            </Text>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.userName}>{profile?.full_name || 'Guest User'}</Text>
                            <Text style={styles.userEmail}>{profile?.email || 'No email'}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.homeButton}
                            onPress={() => router.push("/home.passenger")}
                            activeOpacity={0.7}
                        >
                            <Feather name="home" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.levelBadge}>
                        <Text style={styles.levelText}>Lvl {stats.level}</Text>
                    </View>
                </Animated.View>

                {/* Stats Cards */}
                <Animated.View style={[styles.statsGrid, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <StatCard icon="star" value={stats.points} label="Points" color={COLORS.primary} />
                    <StatCard icon="zap" value={stats.streak} label="Day streak" color={COLORS.warning} />
                    <StatCard icon="navigation" value={stats.trips} label="Trips" color={COLORS.accent} />
                </Animated.View>

                {/* Quick Actions */}
                <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
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

                {/* Recent Activity */}
                <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Activity</Text>
                        {recentActivity.length > 0 && (
                            <TouchableOpacity onPress={() => router.push("/activity")}>
                                <Text style={styles.seeAll}>See all</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {recentActivity.length === 0 ? (
                        <View style={styles.emptyActivity}>
                            <Feather name="clock" size={32} color={COLORS.text.tertiary} />
                            <Text style={styles.emptyText}>No recent activity</Text>
                        </View>
                    ) : (
                        <View style={styles.activityList}>
                            {recentActivity.map((item) => (
                                <ActivityCard
                                    key={item.id}
                                    icon={item.icon}
                                    title={item.type === 'board' ? `Boarded ${item.routeCode}` : `Alighted from ${item.routeCode}`}
                                    time={item.time}
                                    color={item.color}
                                />
                            ))}
                        </View>
                    )}
                </Animated.View>

                {/* Sign Out & Version */}
                <Animated.View style={[styles.footer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
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

// --- Subcomponents ---

const StatCard = ({ icon, value, label, color }) => (
    <View style={styles.statCard}>
        <Feather name={icon} size={18} color={color} />
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const ActionButton = ({ icon, label, onPress, color }) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.actionIcon, { backgroundColor: `${color}10` }]}>
            <Feather name={icon} size={18} color={color} />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
);

const ActivityCard = ({ icon, title, time, color }) => (
    <View style={styles.activityCard}>
        <View style={[styles.activityBadge, { backgroundColor: `${color}10` }]}>
            <Feather name={icon} size={18} color={color} />
        </View>
        <View style={styles.activityInfo}>
            <Text style={styles.activityTitle}>{title}</Text>
            <Text style={styles.activityTime}>{time}</Text>
        </View>
    </View>
);

// --- Styles ---

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },

    // Guest
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

    // Authenticated
    scrollContent: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 40,
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    profileInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text.primary,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: COLORS.text.secondary,
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
        alignSelf: 'flex-start',
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
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
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
    emptyActivity: {
        alignItems: 'center',
        paddingVertical: 32,
        backgroundColor: COLORS.surface,
        borderRadius: 14,
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.text.tertiary,
        marginTop: 8,
    },

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