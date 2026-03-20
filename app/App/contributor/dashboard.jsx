import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useProfile } from '../../lib/useProfile';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

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

export default function ContributorDashboard() {
    const { session } = useAuth();
    const { profile } = useProfile(session);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalPOIs: 0,
        pendingPOIs: 0,
        approvedPOIs: 0,
        rejectedPOIs: 0,
        totalRoutes: 0,
        pendingRoutes: 0,
        approvedRoutes: 0,
        rejectedRoutes: 0,
    });
    const [recentSubmissions, setRecentSubmissions] = useState([]);

    const loadData = async () => {
        try {
            // Fetch POI stats and recent
            const { data: pois, error: poiError } = await supabase
                .from('points_of_interest')
                .select('id, name, type, status, created_at')
                .eq('submitted_by', session.user.id)
                .order('created_at', { ascending: false });

            if (poiError) throw poiError;

            const poiStats = {
                totalPOIs: pois.length,
                pendingPOIs: pois.filter(p => p.status === 'pending').length,
                approvedPOIs: pois.filter(p => p.status === 'approved').length,
                rejectedPOIs: pois.filter(p => p.status === 'rejected').length,
            };

            // Transform POIs to submission format
            const poiSubmissions = pois.map(p => ({
                id: p.id,
                type: 'poi',
                title: p.name,
                subtitle: p.type,
                status: p.status,
                date: new Date(p.created_at).getTime(),
                icon: 'map-pin',
            }));

            // Fetch route stats and recent
            const { data: routes, error: routeError } = await supabase
                .from('route_suggestions')
                .select('id, route_code, status, submitted_at')
                .eq('contributor_id', session.user.id)
                .order('submitted_at', { ascending: false });

            if (routeError) throw routeError;

            const routeStats = {
                totalRoutes: routes.length,
                pendingRoutes: routes.filter(r => r.status === 'pending').length,
                approvedRoutes: routes.filter(r => r.status === 'approved').length,
                rejectedRoutes: routes.filter(r => r.status === 'rejected').length,
            };

            // Transform routes to submission format
            const routeSubmissions = routes.map(r => ({
                id: r.id,
                type: 'route',
                title: r.route_code || 'Unnamed Route',
                subtitle: null,
                status: r.status,
                date: new Date(r.submitted_at).getTime(),
                icon: 'navigation',
            }));

            // Merge and sort by date (most recent first)
            const allSubmissions = [...poiSubmissions, ...routeSubmissions]
                .sort((a, b) => b.date - a.date);

            setStats({ ...poiStats, ...routeStats });
            setRecentSubmissions(allSubmissions.slice(0, 5)); // show top 5
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const totalContributions = stats.totalPOIs + stats.totalRoutes;
    const pendingContributions = stats.pendingPOIs + stats.pendingRoutes;
    const approvedContributions = stats.approvedPOIs + stats.approvedRoutes;
    const rejectedContributions = stats.rejectedPOIs + stats.rejectedRoutes;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
            }
        >
            {/* Header with welcome */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
                <View style={styles.badge}>
                    <Feather name="award" size={16} color={COLORS.primary} />
                    <Text style={styles.badgeText}>Contributor</Text>
                </View>
            </View>

            {/* Main stats card */}
            <View style={styles.statsCard}>
                <View style={styles.statRow}>
                    <StatPill
                        icon="clock"
                        label="Pending"
                        value={pendingContributions}
                        color={COLORS.warning}
                    />
                    <StatPill
                        icon="check-circle"
                        label="Approved"
                        value={approvedContributions}
                        color={COLORS.accent}
                    />
                    <StatPill
                        icon="x-circle"
                        label="Rejected"
                        value={rejectedContributions}
                        color={COLORS.error}
                    />
                </View>
                <View style={styles.totalRow}>
                    <Feather name="layers" size={20} color={COLORS.text.secondary} />
                    <Text style={styles.totalLabel}>Total contributions</Text>
                    <Text style={styles.totalValue}>{totalContributions}</Text>
                </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
                <View style={styles.actionsGrid}>
                    <ActionButton
                        icon="map-pin"
                        label="Suggest POI"
                        onPress={() => router.push('/contributor/suggest-poi')}
                        color={COLORS.primary}
                    />
                    <ActionButton
                        icon="navigation"
                        label="Suggest Route"
                        onPress={() => router.push('/contributor/suggest-route')}
                        color={COLORS.accent}
                    />
                </View>
            </View>

            {/* Recent Submissions (combined) */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Submissions</Text>
                    <TouchableOpacity onPress={() => router.push('/contributor/all-submissions')}>
                        <Text style={styles.seeAll}>See all</Text>
                    </TouchableOpacity>
                </View>
                {recentSubmissions.length === 0 ? (
                    <Text style={styles.emptyText}>No submissions yet.</Text>
                ) : (
                    recentSubmissions.map(item => (
                        <SubmissionCard
                            key={`${item.type}-${item.id}`}
                            icon={item.icon}
                            title={item.title}
                            subtitle={item.subtitle}
                            status={item.status}
                        />
                    ))
                )}
            </View>
        </ScrollView>
    );
}

// Helper components
const StatPill = ({ icon, label, value, color }) => (
    <View style={[styles.statPill, { backgroundColor: `${color}10` }]}>
        <Feather name={icon} size={16} color={color} />
        <Text style={[styles.statPillValue, { color }]}>{value}</Text>
        <Text style={styles.statPillLabel}>{label}</Text>
    </View>
);

const ActionButton = ({ icon, label, onPress, color }) => (
    <TouchableOpacity style={[styles.actionButton, { borderColor: color }]} onPress={onPress}>
        <Feather name={icon} size={24} color={color} />
        <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
);

const SubmissionCard = ({ icon, title, subtitle, status }) => {
    const statusColor =
        status === 'approved' ? COLORS.accent :
            status === 'rejected' ? COLORS.error : COLORS.warning;

    return (
        <View style={styles.submissionCard}>
            <Feather name={icon} size={16} color={COLORS.text.secondary} />
            <View style={styles.submissionInfo}>
                <Text style={styles.submissionTitle}>{title}</Text>
                {subtitle ? <Text style={styles.submissionSubtitle}>{subtitle}</Text> : null}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { paddingBottom: 40 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 24,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${COLORS.primary}10`,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: { fontSize: 13, fontWeight: '500', color: COLORS.primary, marginLeft: 6 },
    statsCard: {
        backgroundColor: COLORS.surface,
        marginHorizontal: 20,
        borderRadius: 20,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    statPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 30,
        minWidth: 80,
    },
    statPillValue: { fontSize: 16, fontWeight: '700', marginLeft: 4, marginRight: 4 },
    statPillLabel: { fontSize: 12, color: COLORS.text.secondary },
    totalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.border?.light || '#F3F4F6',
        paddingTop: 12,
    },
    totalLabel: { flex: 1, fontSize: 14, color: COLORS.text.secondary, marginLeft: 8 },
    totalValue: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary },
    section: { paddingHorizontal: 20, marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary },
    seeAll: { fontSize: 14, color: COLORS.primary },
    actionsGrid: { flexDirection: 'row', gap: 12 },
    actionButton: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border?.light || '#F3F4F6',
    },
    actionLabel: { fontSize: 14, fontWeight: '500', marginTop: 8 },
    emptyText: { fontSize: 14, color: COLORS.text.tertiary, textAlign: 'center', marginTop: 8 },
    submissionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    submissionInfo: { flex: 1, marginLeft: 12 },
    submissionTitle: { fontSize: 15, fontWeight: '500', color: COLORS.text.primary },
    submissionSubtitle: { fontSize: 12, color: COLORS.text.tertiary, marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});