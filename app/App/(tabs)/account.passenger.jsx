import { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Animated,
    Dimensions,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";
import { useAuth } from '../../providers/AuthProvider';
import { Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

// Refined color palette
const COLORS = {
    background: "#39A0ED",
    surface: "#FFFFFF",
    text: "#111827",
    textMuted: "#6B7280",
    textLight: "#FFFFFF",
    primary: "#39A0ED",
    accent: "#EF4444",
    border: "#F3F4F6",
    success: "#10B981",
    subtle: "#F9FAFB",
    card: "#FFFFFF",
};

export default function PassengerAccount() {
    const { session } = useAuth();
    const [loading, setLoading] = useState(false);
    const [points, setPoints] = useState(847);
    const [level, setLevel] = useState(2);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (session) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 150,
                    friction: 15,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [session]);

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
                        setLoading(false);
                        router.replace("/login");
                    }
                }
            ]
        );
    };

    const StatItem = ({ icon, value, label }: { icon: string, value: string, label: string }) => (
        <View style={styles.statItem}>
            <View style={styles.statIcon}>
                <Feather name={icon} size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );

    const ActionButton = ({ icon, label, onPress }: { icon: string, label: string, onPress: () => void }) => (
        <TouchableOpacity style={styles.actionButton} onPress={onPress}>
            <View style={styles.actionIcon}>
                <Feather name={icon} size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.actionLabel}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Floating Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Account</Text>
                {session && (
                    <TouchableOpacity style={styles.settingsButton} onPress={() => router.push("/settings")}>
                        <Feather name="settings" size={20} color={COLORS.textLight} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Main Content */}
            <View style={styles.content}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {session ? (
                        <Animated.View style={{
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }}>
                            {/* Profile Card */}
                            <View style={styles.profileCard}>
                                <View style={styles.avatar}>
                                    <Feather name="user" size={28} color={COLORS.primary} />
                                </View>
                                <View style={styles.profileInfo}>
                                    <Text style={styles.name}>
                                        {session.user.email?.split('@')[0] || "Explorer"}
                                    </Text>
                                    <View style={styles.levelContainer}>
                                        <Feather name="award" size={12} color="#FBBF24" />
                                        <Text style={styles.level}>Level {level}</Text>
                                    </View>
                                </View>
                                <View style={styles.pointsContainer}>
                                    <Text style={styles.points}>{points}</Text>
                                    <Text style={styles.pointsLabel}>points</Text>
                                </View>
                            </View>

                            {/* Quick Stats */}
                            <View style={styles.statsContainer}>
                                <StatItem icon="map" value="12" label="Routes" />
                                <View style={styles.statDivider} />
                                <StatItem icon="navigation" value="47" label="Trips" />
                                <View style={styles.statDivider} />
                                <StatItem icon="calendar" value="5" label="Streak" />
                            </View>

                            {/* Action Grid */}
                            <View style={styles.actionGrid}>
                                <ActionButton icon="user" label="Profile" onPress={() => router.push("/profile")} />
                                <ActionButton icon="award" label="Achievements" onPress={() => router.push("/achievements")} />
                                <ActionButton icon="star" label="Rewards" onPress={() => router.push("/rewards")} />
                                <ActionButton icon="help-circle" label="Help" onPress={() => router.push("/help")} />
                            </View>

                            {/* Recent Activity */}
                            <View style={styles.activitySection}>
                                <Text style={styles.sectionTitle}>Recent Activity</Text>
                                <View style={styles.activityList}>
                                    <View style={styles.activityItem}>
                                        <View style={[styles.activityIcon, { backgroundColor: '#EFF6FF' }]}>
                                            <Feather name="map-pin" size={16} color={COLORS.primary} />
                                        </View>
                                        <View style={styles.activityInfo}>
                                            <Text style={styles.activityTitle}>New route saved</Text>
                                            <Text style={styles.activityTime}>2 hours ago</Text>
                                        </View>
                                        <Text style={styles.activityPoints}>+10</Text>
                                    </View>
                                    <View style={styles.activityItem}>
                                        <View style={[styles.activityIcon, { backgroundColor: '#F0F9FF' }]}>
                                            <Feather name="navigation" size={16} color={COLORS.primary} />
                                        </View>
                                        <View style={styles.activityInfo}>
                                            <Text style={styles.activityTitle}>Trip completed</Text>
                                            <Text style={styles.activityTime}>Yesterday</Text>
                                        </View>
                                        <Text style={styles.activityPoints}>+25</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Sign Out */}
                            <TouchableOpacity
                                style={[styles.signOutButton, loading && styles.buttonDisabled]}
                                onPress={handleSignOut}
                                disabled={loading}
                            >
                                {loading ? (
                                    <View style={styles.loadingDots}>
                                        <View style={styles.loadingDot} />
                                        <View style={styles.loadingDot} />
                                        <View style={styles.loadingDot} />
                                    </View>
                                ) : (
                                    <>
                                        <Feather name="log-out" size={18} color={COLORS.accent} />
                                        <Text style={styles.signOutText}>Sign Out</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Footer */}
                            <View style={styles.footer}>
                                <Text style={styles.version}>Lakbay • v1.0</Text>
                            </View>
                        </Animated.View>
                    ) : (
                        /* Guest View */
                        <View style={styles.guestView}>
                            <View style={styles.guestIllustration}>
                                <View style={styles.compassContainer}>
                                    <Feather name="compass" size={48} color={COLORS.primary} />
                                </View>
                                <Text style={styles.guestTitle}>Welcome to Lakbay</Text>
                                <Text style={styles.guestSubtitle}>
                                    Your journey starts here
                                </Text>
                            </View>

                            <View style={styles.guestContent}>
                                <Text style={styles.guestDescription}>
                                    Sign in to save your favorite routes, track trips, and earn rewards as you explore.
                                </Text>

                                <View style={styles.buttonGroup}>
                                    <TouchableOpacity
                                        style={styles.primaryButton}
                                        onPress={() => router.push("/login")}
                                        activeOpacity={0.9}
                                    >
                                        <Feather name="log-in" size={18} color="#FFFFFF" />
                                        <Text style={styles.primaryButtonText}>Sign In</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.secondaryButton}
                                        onPress={() => router.push("/register")}
                                        activeOpacity={0.9}
                                    >
                                        <Text style={styles.secondaryButtonText}>Create Account</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.featureList}>
                                    <Text style={styles.featureTitle}>What you get:</Text>
                                    <View style={styles.featureItem}>
                                        <View style={styles.featureIcon}>
                                            <Feather name="check" size={14} color={COLORS.success} />
                                        </View>
                                        <Text style={styles.featureText}>Personalized route history</Text>
                                    </View>
                                    <View style={styles.featureItem}>
                                        <View style={styles.featureIcon}>
                                            <Feather name="check" size={14} color={COLORS.success} />
                                        </View>
                                        <Text style={styles.featureText}>Earn points for trips</Text>
                                    </View>
                                    <View style={styles.featureItem}>
                                        <View style={styles.featureIcon}>
                                            <Feather name="check" size={14} color={COLORS.success} />
                                        </View>
                                        <Text style={styles.featureText}>Save favorite locations</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 100,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "800",
        color: COLORS.textLight,
        letterSpacing: -0.5,
    },
    settingsButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -10,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    // Profile Card
    profileCard: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    profileInfo: {
        flex: 1,
    },
    name: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 4,
    },
    levelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    level: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textMuted,
    },
    pointsContainer: {
        alignItems: 'center',
    },
    points: {
        fontSize: 24,
        fontWeight: "800",
        color: COLORS.text,
    },
    pointsLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: "500",
    },
    // Stats
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.subtle,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(57, 160, 237, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: "500",
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        marginHorizontal: 8,
    },
    // Action Grid
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 28,
    },
    actionButton: {
        width: (width - 52) / 2,
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    actionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F0F9FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    actionLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.text,
    },
    // Activity
    activitySection: {
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 16,
    },
    activityList: {
        gap: 12,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: COLORS.subtle,
        borderRadius: 12,
    },
    activityIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    activityInfo: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 2,
    },
    activityTime: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    activityPoints: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.success,
    },
    // Sign Out
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#FEF2F2',
        gap: 10,
        marginBottom: 24,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    signOutText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.accent,
    },
    loadingDots: {
        flexDirection: 'row',
        gap: 4,
    },
    loadingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.accent,
    },
    footer: {
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        alignItems: 'center',
    },
    version: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: "500",
    },
    // Guest View
    guestView: {
        paddingTop: 20,
    },
    guestIllustration: {
        alignItems: 'center',
        marginBottom: 32,
    },
    compassContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    guestTitle: {
        fontSize: 28,
        fontWeight: "800",
        color: COLORS.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    guestSubtitle: {
        fontSize: 16,
        color: COLORS.textMuted,
        textAlign: 'center',
    },
    guestContent: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    guestDescription: {
        fontSize: 15,
        color: COLORS.text,
        lineHeight: 22,
        marginBottom: 32,
        textAlign: 'center',
    },
    buttonGroup: {
        gap: 12,
        marginBottom: 32,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        padding: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: "600",
    },
    secondaryButton: {
        padding: 18,
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.border,
    },
    secondaryButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: "600",
    },
    featureList: {
        gap: 12,
    },
    featureTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 8,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    featureIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#D1FAE5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureText: {
        fontSize: 14,
        color: COLORS.text,
    },
});