import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
    Platform,
    Modal,
    FlatList,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Polyline } from 'react-native-maps';

const COLORS = {
    primary: "#39A0ED",
    background: "#FFFFFF",
    surface: "#F9FAFB",
    text: { primary: "#111827", secondary: "#6B7280" },
    border: { light: "#F3F4F6" },
    accent: "#10B981",
};

// Haversine distance helper
const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export default function SuggestRoute() {
    const { session } = useAuth();
    const [mode, setMode] = useState('new'); // 'new' or 'edit'
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [regions, setRegions] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [showRoutePicker, setShowRoutePicker] = useState(false);
    const [showRegionPicker, setShowRegionPicker] = useState(false);
    const [loadingRoutes, setLoadingRoutes] = useState(false);
    const [loadingRegions, setLoadingRegions] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [routeCode, setRouteCode] = useState('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState({});

    // Recording state
    const [recording, setRecording] = useState(false);
    const [recordedPoints, setRecordedPoints] = useState([]);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [distance, setDistance] = useState(0);
    const watchSubscription = useRef(null);
    const startTimeRef = useRef(null);
    const timerInterval = useRef(null);
    const lastPointRef = useRef(null);

    // Load regions for new route
    useEffect(() => {
        fetchRegions();
    }, []);

    // Load routes for edit mode
    useEffect(() => {
        if (mode === 'edit') {
            fetchRoutes();
        }
    }, [mode]);

    const fetchRegions = async () => {
        setLoadingRegions(true);
        try {
            const { data, error } = await supabase
                .from('regions')
                .select('region_id, name')
                .eq('is_active', true)
                .order('name');
            if (error) throw error;
            setRegions(data || []);
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to load regions');
        } finally {
            setLoadingRegions(false);
        }
    };

    const fetchRoutes = async () => {
        setLoadingRoutes(true);
        try {
            const { data, error } = await supabase
                .from('routes')
                .select('id, route_code')
                .eq('status', 'active')
                .order('route_code');
            if (error) throw error;
            setRoutes(data || []);
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to load routes');
        } finally {
            setLoadingRoutes(false);
        }
    };

    const handleSelectRoute = (route) => {
        setSelectedRoute(route);
        setShowRoutePicker(false);
    };

    const handleChangeRoute = () => {
        setSelectedRoute(null);
        setShowRoutePicker(true);
    };

    const handleSelectRegion = (regionId) => {
        setSelectedRegion(regionId);
        setShowRegionPicker(false);
    };

    // Recording functions (unchanged)
    const startRecording = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Location permission is required to record a route.');
            return;
        }

        setRecording(true);
        setRecordedPoints([]);
        setDistance(0);
        setElapsedTime(0);
        startTimeRef.current = Date.now();

        timerInterval.current = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);

        watchSubscription.current = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                distanceInterval: 5,
                timeInterval: 2000,
            },
            (location) => {
                const newPoint = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                };
                setRecordedPoints(prev => {
                    const updated = [...prev, newPoint];
                    if (lastPointRef.current) {
                        const dist = haversineDistance(
                            lastPointRef.current.latitude,
                            lastPointRef.current.longitude,
                            newPoint.latitude,
                            newPoint.longitude
                        );
                        setDistance(d => d + dist);
                    }
                    lastPointRef.current = newPoint;
                    return updated;
                });
            }
        );
    };

    const stopRecording = () => {
        setRecording(false);
        if (watchSubscription.current) {
            watchSubscription.current.remove();
            watchSubscription.current = null;
        }
        if (timerInterval.current) {
            clearInterval(timerInterval.current);
            timerInterval.current = null;
        }
        lastPointRef.current = null;
    };

    const resetRecording = () => {
        stopRecording();
        setRecordedPoints([]);
        setDistance(0);
        setElapsedTime(0);
    };

    const validate = () => {
        const newErrors = {};
        if (mode === 'new') {
            if (!routeCode.trim()) newErrors.routeCode = 'Route code is required (e.g., JEEP-001)';
            if (!selectedRegion) newErrors.region = 'Please select a region';
        }
        if (recordedPoints.length < 5) newErrors.recording = 'Please record at least 5 points';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setIsSubmitting(true);

        const coordinates = recordedPoints.map(p => [p.longitude, p.latitude]);
        const rawGeometry = {
            type: 'LineString',
            coordinates,
        };

        try {
            if (mode === 'new') {
                const { error } = await supabase
                    .from('route_suggestions')
                    .insert({
                        contributor_id: session.user.id,
                        route_code: routeCode.trim(),
                        raw_geometry: rawGeometry,
                        length_meters: Math.round(distance),
                        description: description.trim(),
                        status: 'pending',
                        change_type: 'new',
                        proposed_region_id: selectedRegion,
                    });
                if (error) throw error;
            } else {
                // Edit mode
                const { error } = await supabase
                    .from('route_suggestions')
                    .insert({
                        contributor_id: session.user.id,
                        suggested_route_id: selectedRoute.id,
                        route_code: selectedRoute.route_code,
                        raw_geometry: rawGeometry,
                        length_meters: Math.round(distance),
                        description: description.trim(),
                        status: 'pending',
                        change_type: 'edit',
                    });
                if (error) throw error;
            }

            Alert.alert(
                'Route Submitted',
                mode === 'new'
                    ? 'Your new route suggestion has been sent for review.'
                    : 'Your suggested route change has been sent for review.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to submit suggestion. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const formatDistance = (meters) => {
        if (meters < 1000) return `${Math.round(meters)} m`;
        return `${(meters / 1000).toFixed(2)} km`;
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>Suggest a Route</Text>
                <Text style={styles.subtitle}>Record your journey to submit a new route or suggest changes to an existing one</Text>
            </View>

            {/* Mode selector */}
            <View style={styles.modeSelector}>
                <TouchableOpacity
                    style={[styles.modeButton, mode === 'new' && styles.activeMode]}
                    onPress={() => setMode('new')}
                >
                    <Text style={[styles.modeText, mode === 'new' && styles.activeModeText]}>New Route</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.modeButton, mode === 'edit' && styles.activeMode]}
                    onPress={() => setMode('edit')}
                >
                    <Text style={[styles.modeText, mode === 'edit' && styles.activeModeText]}>Edit Route</Text>
                </TouchableOpacity>
            </View>

            {/* Edit mode: route selection */}
            {mode === 'edit' && (
                <View style={styles.editRouteSection}>
                    {!selectedRoute ? (
                        <TouchableOpacity style={styles.selectRouteButton} onPress={() => setShowRoutePicker(true)}>
                            <Feather name="list" size={20} color={COLORS.primary} />
                            <Text style={styles.selectRouteText}>Select a route to edit</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.selectedRouteInfo}>
                            <View>
                                <Text style={styles.infoLabel}>Editing:</Text>
                                <Text style={styles.infoValue}>{selectedRoute.route_code}</Text>
                            </View>
                            <TouchableOpacity onPress={handleChangeRoute} style={styles.changeRouteButton}>
                                <Feather name="refresh-ccw" size={18} color={COLORS.primary} />
                                <Text style={styles.changeRouteText}>Change</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            {/* Form fields */}
            <View style={styles.form}>
                {mode === 'new' && (
                    <>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Route Code *</Text>
                            <TextInput
                                style={[styles.input, errors.routeCode && styles.inputError]}
                                value={routeCode}
                                onChangeText={(text) => setRouteCode(text)}
                                placeholder="e.g., JEEP-001"
                                autoCapitalize="characters"
                            />
                            {errors.routeCode && <Text style={styles.errorText}>{errors.routeCode}</Text>}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Region *</Text>
                            <TouchableOpacity
                                style={[styles.regionPicker, errors.region && styles.inputError]}
                                onPress={() => setShowRegionPicker(true)}
                            >
                                <Text style={selectedRegion ? styles.regionText : styles.regionPlaceholder}>
                                    {selectedRegion
                                        ? regions.find(r => r.region_id === selectedRegion)?.name
                                        : 'Select a region'}
                                </Text>
                                <Feather name="chevron-down" size={20} color={COLORS.text.secondary} />
                            </TouchableOpacity>
                            {errors.region && <Text style={styles.errorText}>{errors.region}</Text>}
                        </View>
                    </>
                )}

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Description (optional)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={(text) => setDescription(text)}
                        placeholder={mode === 'new'
                            ? "Describe the route (start, end, landmarks)"
                            : "Describe the changes you're suggesting (e.g., new path, detour)"}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />
                </View>
            </View>

            {/* Recording area (unchanged) */}
            {recordedPoints.length > 0 && (
                <View style={styles.mapContainer}>
                    <MapView
                        style={styles.map}
                        initialRegion={{
                            latitude: recordedPoints[0].latitude,
                            longitude: recordedPoints[0].longitude,
                            latitudeDelta: 0.02,
                            longitudeDelta: 0.02,
                        }}
                    >
                        <Polyline
                            coordinates={recordedPoints}
                            strokeColor={COLORS.primary}
                            strokeWidth={4}
                        />
                    </MapView>
                </View>
            )}

            <View style={styles.recordingPanel}>
                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{formatTime(elapsedTime)}</Text>
                        <Text style={styles.statLabel}>Time</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{formatDistance(distance)}</Text>
                        <Text style={styles.statLabel}>Distance</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{recordedPoints.length}</Text>
                        <Text style={styles.statLabel}>Points</Text>
                    </View>
                </View>

                <View style={styles.recordingButtons}>
                    {!recording ? (
                        <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
                            <Feather name="circle" size={20} color="#FFFFFF" />
                            <Text style={styles.recordButtonText}>Start Recording</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                            <Feather name="square" size={20} color="#FFFFFF" />
                            <Text style={styles.stopButtonText}>Stop Recording</Text>
                        </TouchableOpacity>
                    )}
                    {recordedPoints.length > 0 && !recording && (
                        <TouchableOpacity style={styles.resetButton} onPress={resetRecording}>
                            <Feather name="trash-2" size={20} color={COLORS.text.secondary} />
                        </TouchableOpacity>
                    )}
                </View>
                {errors.recording && <Text style={styles.errorText}>{errors.recording}</Text>}
            </View>

            <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting || (mode === 'edit' && !selectedRoute) || (mode === 'new' && (!routeCode.trim() || !selectedRegion))}
            >
                {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <>
                        <Text style={styles.submitButtonText}>Submit Suggestion</Text>
                        <Feather name="arrow-right" size={20} color="#FFFFFF" />
                    </>
                )}
            </TouchableOpacity>

            {/* Route picker modal */}
            <Modal visible={showRoutePicker} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Route</Text>
                        <TouchableOpacity onPress={() => setShowRoutePicker(false)}>
                            <Feather name="x" size={24} color={COLORS.text.primary} />
                        </TouchableOpacity>
                    </View>
                    {loadingRoutes ? (
                        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
                    ) : (
                        <FlatList
                            data={routes}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.routeItem} onPress={() => handleSelectRoute(item)}>
                                    <Text style={styles.routeItemCode}>{item.route_code}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            </Modal>

            {/* Region picker modal */}
            <Modal visible={showRegionPicker} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Region</Text>
                        <TouchableOpacity onPress={() => setShowRegionPicker(false)}>
                            <Feather name="x" size={24} color={COLORS.text.primary} />
                        </TouchableOpacity>
                    </View>
                    {loadingRegions ? (
                        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
                    ) : (
                        <FlatList
                            data={regions}
                            keyExtractor={item => item.region_id}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.routeItem} onPress={() => handleSelectRegion(item.region_id)}>
                                    <Text style={styles.routeItemCode}>{item.name}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { paddingBottom: 40 },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 28, fontWeight: '700', color: COLORS.text.primary, marginBottom: 8 },
    subtitle: { fontSize: 16, color: COLORS.text.secondary },
    modeSelector: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, borderRadius: 30, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border.light, overflow: 'hidden' },
    modeButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    activeMode: { backgroundColor: COLORS.primary },
    modeText: { fontSize: 16, fontWeight: '500', color: COLORS.text.secondary },
    activeModeText: { color: '#FFFFFF' },
    editRouteSection: { marginHorizontal: 20, marginBottom: 16 },
    selectRouteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border.light },
    selectRouteText: { marginLeft: 8, fontSize: 16, color: COLORS.primary, fontWeight: '500' },
    selectedRouteInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border.light },
    infoLabel: { fontSize: 14, color: COLORS.text.secondary },
    infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.text.primary },
    changeRouteButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
    changeRouteText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
    form: { paddingHorizontal: 20 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 15, fontWeight: '600', color: COLORS.text.primary, marginBottom: 8 },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: COLORS.border.light },
    inputError: { borderColor: '#EF4444' },
    errorText: { color: '#EF4444', fontSize: 13, marginTop: 4 },
    textArea: { minHeight: 80, paddingTop: 14 },
    regionPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border.light },
    regionText: { fontSize: 16, color: COLORS.text.primary },
    regionPlaceholder: { fontSize: 16, color: COLORS.text.secondary },
    mapContainer: { height: 250, marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
    map: { flex: 1 },
    recordingPanel: { backgroundColor: COLORS.surface, marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 24 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
    stat: { alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '700', color: COLORS.text.primary },
    statLabel: { fontSize: 13, color: COLORS.text.secondary, marginTop: 4 },
    recordingButtons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    recordButton: { flexDirection: 'row', backgroundColor: COLORS.accent, borderRadius: 30, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' },
    recordButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
    stopButton: { flexDirection: 'row', backgroundColor: '#EF4444', borderRadius: 30, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' },
    stopButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
    resetButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border.light, justifyContent: 'center', alignItems: 'center' },
    submitButton: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginHorizontal: 20, marginTop: 20 },
    submitButtonDisabled: { opacity: 0.7 },
    submitButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600', marginRight: 8 },
    modalContainer: { flex: 1, backgroundColor: COLORS.background, paddingTop: 60 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border.light },
    modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary },
    routeItem: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border.light },
    routeItemCode: { fontSize: 16, fontWeight: '500', color: COLORS.text.primary },
});