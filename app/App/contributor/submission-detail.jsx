import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';

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

export default function SubmissionDetail() {
    const { id, type } = useLocalSearchParams();
    const { session } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [submission, setSubmission] = useState(null);
    const [originalRoute, setOriginalRoute] = useState(null);
    const [region, setRegion] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        fetchSubmission();
    }, []);

    const fetchSubmission = async () => {
        try {
            let data;
            if (type === 'poi') {
                const { data: poi, error } = await supabase
                    .from('points_of_interest')
                    .select('*')
                    .eq('id', id)
                    .single();
                if (error) throw error;
                data = poi;
                setSubmission(data);

                if (data.geometry) {
                    const coords = data.geometry.coordinates;
                    setRegion({
                        latitude: coords[1],
                        longitude: coords[0],
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    });
                }
            }
            else if (type === 'route') {
                const { data: route, error } = await supabase
                    .from('route_suggestions')
                    .select(`
                        *,
                        suggested_route:suggested_route_id (
                            id,
                            route_code,
                            route_color,
                            region:region_id (
                                name,
                                code
                            )
                        )
                    `)
                    .eq('id', id)
                    .single();
                if (error) throw error;
                data = route;
                setSubmission(data);

                if (data.change_type === 'edit' && data.suggested_route_id) {
                    setOriginalRoute(data.suggested_route);
                    setHasChanges(true);
                }

                if (data.raw_geometry && data.raw_geometry.coordinates) {
                    const coords = data.raw_geometry.coordinates;
                    if (coords.length > 0) {
                        setRegion({
                            latitude: coords[0][1],
                            longitude: coords[0][0],
                            latitudeDelta: 0.02,
                            longitudeDelta: 0.02,
                        });
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching submission:', err);
            Alert.alert('Error', 'Failed to load submission details');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return COLORS.accent;
            case 'rejected': return COLORS.error;
            default: return COLORS.warning;
        }
    };

    const getChangeTypeLabel = (changeType) => {
        return changeType === 'edit' ? 'Edit Suggestion' : 'New Route';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    const renderPOIDetails = () => (
        <>
            <View style={styles.detailsCard}>
                <View style={styles.detailsHeader}>
                    <Text style={styles.detailsName}>{submission.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(submission.status)}15` }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(submission.status) }]}>
                            {submission.status}
                        </Text>
                    </View>
                </View>

                <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Type</Text>
                        <Text style={styles.detailValue}>{submission.type}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Submitted</Text>
                        <Text style={styles.detailValue}>{formatDate(submission.created_at)}</Text>
                    </View>
                    {submission.reviewed_at && (
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Reviewed</Text>
                            <Text style={styles.detailValue}>{formatDate(submission.reviewed_at)}</Text>
                        </View>
                    )}
                    {submission.reviewer_notes && (
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Reviewer Notes</Text>
                            <Text style={styles.detailValue}>{submission.reviewer_notes}</Text>
                        </View>
                    )}
                </View>

                {submission.metadata?.description && (
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Description</Text>
                        <Text style={styles.detailValue}>{submission.metadata.description}</Text>
                    </View>
                )}
            </View>
        </>
    );

    const renderRouteDetails = () => (
        <>
            <View style={styles.detailsCard}>
                <View style={styles.detailsHeader}>
                    <View>
                        <Text style={styles.detailsName}>
                            {submission.route_code || 'Unnamed Route'}
                        </Text>
                        {submission.change_type === 'edit' && (
                            <View style={styles.editBadge}>
                                <Feather name="edit-2" size={12} color={COLORS.warning} />
                                <Text style={styles.editBadgeText}>Edit Suggestion</Text>
                            </View>
                        )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(submission.status)}15` }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(submission.status) }]}>
                            {submission.status}
                        </Text>
                    </View>
                </View>

                <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Change Type</Text>
                        <Text style={styles.detailValue}>{getChangeTypeLabel(submission.change_type)}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Submitted</Text>
                        <Text style={styles.detailValue}>{formatDate(submission.submitted_at)}</Text>
                    </View>
                    {submission.reviewed_at && (
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Reviewed</Text>
                            <Text style={styles.detailValue}>{formatDate(submission.reviewed_at)}</Text>
                        </View>
                    )}
                    {submission.length_meters && (
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Length</Text>
                            <Text style={styles.detailValue}>
                                {submission.length_meters < 1000
                                    ? `${submission.length_meters} m`
                                    : `${(submission.length_meters / 1000).toFixed(2)} km`}
                            </Text>
                        </View>
                    )}
                </View>

                {submission.description && (
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Description</Text>
                        <Text style={styles.detailValue}>{submission.description}</Text>
                    </View>
                )}

                {submission.proposed_color && (
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Proposed Color</Text>
                        <View style={styles.colorRow}>
                            <View style={[styles.colorPreview, { backgroundColor: submission.proposed_color }]} />
                            <Text style={styles.detailValue}>{submission.proposed_color}</Text>
                        </View>
                    </View>
                )}

                {submission.proposed_region_id && (
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Proposed Region</Text>
                        <Text style={styles.detailValue}>Region ID: {submission.proposed_region_id}</Text>
                    </View>
                )}
            </View>

            {hasChanges && originalRoute && (
                <View style={styles.comparisonCard}>
                    <Text style={styles.comparisonTitle}>Changes from Original Route</Text>

                    {(submission.proposed_name && submission.proposed_name !== originalRoute.route_code) && (
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Route Code:</Text>
                            <View style={styles.comparisonValues}>
                                <Text style={styles.oldValue}>{originalRoute.route_code}</Text>
                                <Feather name="arrow-right" size={14} color={COLORS.text.secondary} />
                                <Text style={styles.newValue}>{submission.proposed_name}</Text>
                            </View>
                        </View>
                    )}

                    {(submission.proposed_color && submission.proposed_color !== originalRoute.route_color) && (
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Color:</Text>
                            <View style={styles.comparisonValues}>
                                <View style={[styles.colorPreviewSmall, { backgroundColor: originalRoute.route_color || '#CCCCCC' }]} />
                                <Feather name="arrow-right" size={14} color={COLORS.text.secondary} />
                                <View style={[styles.colorPreviewSmall, { backgroundColor: submission.proposed_color }]} />
                                <Text style={styles.newValue}>{submission.proposed_color}</Text>
                            </View>
                        </View>
                    )}

                    {submission.raw_geometry && (
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Geometry:</Text>
                            <View style={styles.comparisonValues}>
                                <Text style={styles.oldValue}>Original</Text>
                                <Feather name="arrow-right" size={14} color={COLORS.text.secondary} />
                                <Text style={styles.newValue}>New path recorded</Text>
                            </View>
                        </View>
                    )}

                    {submission.description && (
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Description:</Text>
                            <View style={styles.comparisonValues}>
                                <Text style={styles.oldValue}>None</Text>
                                <Feather name="arrow-right" size={14} color={COLORS.text.secondary} />
                                <Text style={styles.newValue}>{submission.description}</Text>
                            </View>
                        </View>
                    )}
                </View>
            )}
        </>
    );

    const renderMap = () => {
        if (!region) return null;

        if (type === 'poi' && submission && submission.geometry) {
            return (
                <MapView style={styles.map} initialRegion={region}>
                    <Marker
                        coordinate={{
                            latitude: submission.geometry.coordinates[1],
                            longitude: submission.geometry.coordinates[0],
                        }}
                        title={submission.name}
                        description={submission.type}
                    />
                </MapView>
            );
        }

        if (type === 'route' && submission && submission.raw_geometry && submission.raw_geometry.coordinates) {
            const coordinates = submission.raw_geometry.coordinates.map(c => ({
                latitude: c[1],
                longitude: c[0],
            }));

            return (
                <MapView style={styles.map} initialRegion={region}>
                    <Polyline
                        coordinates={coordinates}
                        strokeColor={submission.proposed_color || COLORS.primary}
                        strokeWidth={4}
                    />
                </MapView>
            );
        }

        return null;
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!submission) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Submission not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {type === 'poi' ? submission.name : submission.route_code || 'Route Suggestion'}
                </Text>
                <View style={styles.headerRight} />
            </View>

            <View style={styles.mapContainer}>
                {renderMap()}
            </View>

            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {type === 'poi' ? renderPOIDetails() : renderRouteDetails()}

                {submission.reviewer_notes && (
                    <View style={styles.notesCard}>
                        <Text style={styles.notesTitle}>Reviewer Notes</Text>
                        <Text style={styles.notesText}>{submission.reviewer_notes}</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: 16, color: COLORS.text.secondary },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border.light,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.text.primary, marginHorizontal: 12, textAlign: 'center' },
    headerRight: { width: 40 },

    mapContainer: { height: 300, width: '100%', backgroundColor: COLORS.surface },
    map: { flex: 1 },

    scrollContent: { flex: 1, padding: 20 },

    detailsCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border.light,
    },
    detailsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    detailsName: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text.primary,
        flex: 1,
        marginRight: 12,
    },
    editBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    editBadgeText: {
        fontSize: 12,
        color: COLORS.warning,
        fontWeight: '500',
    },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },

    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 16,
    },
    detailItem: {
        flex: 1,
        minWidth: '45%',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 12,
        color: COLORS.text.secondary,
        marginBottom: 4,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 14,
        color: COLORS.text.primary,
        fontWeight: '500',
    },

    colorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    colorPreview: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border.light,
    },
    colorPreviewSmall: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border.light,
    },

    comparisonCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.warning + '30',
        backgroundColor: COLORS.warning + '08',
    },
    comparisonTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text.primary,
        marginBottom: 12,
    },
    comparisonRow: {
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border.light,
    },
    comparisonLabel: {
        fontSize: 12,
        color: COLORS.text.secondary,
        marginBottom: 6,
        fontWeight: '500',
    },
    comparisonValues: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    oldValue: {
        fontSize: 13,
        color: COLORS.text.secondary,
        textDecorationLine: 'line-through',
    },
    newValue: {
        fontSize: 13,
        color: COLORS.accent,
        fontWeight: '500',
    },

    notesCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: COLORS.border.light,
    },
    notesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text.primary,
        marginBottom: 8,
    },
    notesText: {
        fontSize: 14,
        color: COLORS.text.secondary,
        lineHeight: 20,
    },
});