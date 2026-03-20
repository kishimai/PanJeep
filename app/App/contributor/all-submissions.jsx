import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
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

// Tabs for filtering
const TABS = ['All', 'POIs', 'Routes', 'Pending', 'Approved', 'Rejected'];

export default function AllSubmissions() {
    const { session } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submissions, setSubmissions] = useState([]);
    const [filteredSubmissions, setFilteredSubmissions] = useState([]);
    const [activeTab, setActiveTab] = useState('All');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        filterSubmissions();
    }, [activeTab, submissions]);

    const loadData = async () => {
        try {
            // Fetch POIs
            const { data: pois, error: poiError } = await supabase
                .from('points_of_interest')
                .select('id, name, type, status, created_at')
                .eq('submitted_by', session.user.id)
                .order('created_at', { ascending: false });

            if (poiError) throw poiError;

            const poiItems = pois.map(p => ({
                id: p.id,
                type: 'poi',
                title: p.name,
                subtitle: p.type,
                status: p.status,
                date: new Date(p.created_at).getTime(),
                icon: 'map-pin',
            }));

            // Fetch routes
            const { data: routes, error: routeError } = await supabase
                .from('route_suggestions')
                .select('id, route_code, status, submitted_at')
                .eq('contributor_id', session.user.id)
                .order('submitted_at', { ascending: false });

            if (routeError) throw routeError;

            const routeItems = routes.map(r => ({
                id: r.id,
                type: 'route',
                title: r.route_code || 'Unnamed Route',
                subtitle: null,
                status: r.status,
                date: new Date(r.submitted_at).getTime(),
                icon: 'navigation',
            }));

            const all = [...poiItems, ...routeItems].sort((a, b) => b.date - a.date);
            setSubmissions(all);
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to load submissions');
        } finally {
            setLoading(false);
        }
    };

    const filterSubmissions = () => {
        if (activeTab === 'All') {
            setFilteredSubmissions(submissions);
        } else if (activeTab === 'POIs') {
            setFilteredSubmissions(submissions.filter(s => s.type === 'poi'));
        } else if (activeTab === 'Routes') {
            setFilteredSubmissions(submissions.filter(s => s.type === 'route'));
        } else {
            // filter by status
            const status = activeTab.toLowerCase();
            setFilteredSubmissions(submissions.filter(s => s.status === status));
        }
    };

    const renderItem = ({ item }) => {
        const statusColor =
            item.status === 'approved' ? COLORS.accent :
                item.status === 'rejected' ? COLORS.error : COLORS.warning;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push({
                    pathname: '/contributor/submission-detail',
                    params: { id: item.id, type: item.type }
                })}
            >
                <Feather name={item.icon} size={20} color={COLORS.text.secondary} />
                <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    {item.subtitle && <Text style={styles.cardSubtitle}>{item.subtitle}</Text>}
                    <Text style={styles.cardDate}>{new Date(item.date).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>All Submissions</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {TABS.map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && styles.activeTab]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* List */}
            {filteredSubmissions.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Feather name="inbox" size={48} color={COLORS.text.tertiary} />
                    <Text style={styles.emptyText}>No submissions found</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredSubmissions}
                    keyExtractor={item => `${item.type}-${item.id}`}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary },
    tabContainer: { paddingHorizontal: 20, marginBottom: 16 },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        backgroundColor: COLORS.surface,
    },
    activeTab: { backgroundColor: COLORS.primary },
    tabText: { fontSize: 14, color: COLORS.text.secondary },
    activeTabText: { color: '#FFFFFF', fontWeight: '600' },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
    },
    cardInfo: { flex: 1, marginLeft: 12 },
    cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary },
    cardSubtitle: { fontSize: 14, color: COLORS.text.secondary, marginTop: 2 },
    cardDate: { fontSize: 12, color: COLORS.text.tertiary, marginTop: 4 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 16, color: COLORS.text.tertiary, marginTop: 16 },
});