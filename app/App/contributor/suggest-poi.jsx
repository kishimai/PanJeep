import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Modal,
    FlatList,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

const COLORS = {
    primary: "#39A0ED",
    background: "#FFFFFF",
    surface: "#F9FAFB",
    text: { primary: "#111827", secondary: "#6B7280" },
    border: { light: "#F3F4F6" },
};

const POI_TYPES = ['terminal', 'stop', 'landmark', 'hub'];

export default function SuggestPOI() {
    const { session } = useAuth();
    const [loading, setLoading] = useState(false);
    const [location, setLocation] = useState(null);
    const [regions, setRegions] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [showRegionModal, setShowRegionModal] = useState(false);
    const [form, setForm] = useState({
        name: '',
        type: '',
        description: '',
    });
    const [errors, setErrors] = useState({});

    // Load regions on mount
    useEffect(() => {
        const fetchRegions = async () => {
            const { data } = await supabase
                .from('regions')
                .select('region_id, name')
                .eq('is_active', true)
                .order('name');
            if (data) setRegions(data);
        };
        fetchRegions();
    }, []);

    // Get current location
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Location permission is required to place a POI.');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            setLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });
        })();
    }, []);

    const validate = () => {
        const newErrors = {};
        if (!form.name.trim()) newErrors.name = 'Name is required';
        if (!form.type) newErrors.type = 'Please select a type';
        if (!selectedRegion) newErrors.region = 'Please select a region';
        if (!location) newErrors.location = 'Location not available';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);

        const geometry = {
            type: 'Point',
            coordinates: [location.longitude, location.latitude],
        };

        try {
            const { error } = await supabase
                .from('points_of_interest')
                .insert({
                    name: form.name,
                    type: form.type,
                    geometry,
                    metadata: { description: form.description },
                    region_id: selectedRegion,
                    status: 'pending',
                    submitted_by: session.user.id,
                });

            if (error) throw error;

            Alert.alert(
                'POI Submitted',
                'Your suggestion has been sent for review.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to submit POI. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!location) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Getting your location...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Feather name="arrow-left" size={24} color={COLORS.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Suggest a Point of Interest</Text>
                    <Text style={styles.subtitle}>Tap on map to adjust location</Text>
                </View>

                <View style={styles.mapContainer}>
                    <MapView
                        style={styles.map}
                        initialRegion={{
                            latitude: location.latitude,
                            longitude: location.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }}
                        onPress={(e) => setLocation(e.nativeEvent.coordinate)}
                    >
                        <Marker coordinate={location} draggable onDragEnd={(e) => setLocation(e.nativeEvent.coordinate)} />
                    </MapView>
                </View>

                <View style={styles.form}>
                    {/* Region Picker */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Region *</Text>
                        <TouchableOpacity
                            style={[styles.pickerButton, errors.region && styles.inputError]}
                            onPress={() => setShowRegionModal(true)}
                        >
                            <Text style={selectedRegion ? styles.pickerText : styles.pickerPlaceholder}>
                                {selectedRegion
                                    ? regions.find(r => r.region_id === selectedRegion)?.name
                                    : 'Select a region'}
                            </Text>
                            <Feather name="chevron-down" size={20} color={COLORS.text.secondary} />
                        </TouchableOpacity>
                        {errors.region && <Text style={styles.errorText}>{errors.region}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Name *</Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            value={form.name}
                            onChangeText={(text) => setForm({ ...form, name: text })}
                            placeholder="e.g., City Hall"
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Type *</Text>
                        <View style={styles.typeContainer}>
                            {POI_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.typeButton,
                                        form.type === type && styles.typeButtonActive,
                                    ]}
                                    onPress={() => setForm({ ...form, type })}
                                >
                                    <Text style={[
                                        styles.typeText,
                                        form.type === type && styles.typeTextActive,
                                    ]}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {errors.type && <Text style={styles.errorText}>{errors.type}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description (optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={form.description}
                            onChangeText={(text) => setForm({ ...form, description: text })}
                            placeholder="Any additional info"
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Text style={styles.submitButtonText}>Submit Suggestion</Text>
                                <Feather name="arrow-right" size={20} color="#FFFFFF" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Region Selection Modal */}
                <Modal visible={showRegionModal} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Region</Text>
                                <TouchableOpacity onPress={() => setShowRegionModal(false)}>
                                    <Feather name="x" size={24} color={COLORS.text.primary} />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={regions}
                                keyExtractor={(item) => item.region_id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.regionItem}
                                        onPress={() => {
                                            setSelectedRegion(item.region_id);
                                            setShowRegionModal(false);
                                        }}
                                    >
                                        <Text style={styles.regionName}>{item.name}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollContent: { paddingBottom: 40 },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 28, fontWeight: '700', color: COLORS.text.primary, marginBottom: 8 },
    subtitle: { fontSize: 16, color: COLORS.text.secondary },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontSize: 16, color: COLORS.text.secondary },
    mapContainer: { height: 250, marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
    map: { flex: 1 },
    form: { paddingHorizontal: 20 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 15, fontWeight: '600', color: COLORS.text.primary, marginBottom: 8 },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: COLORS.border.light },
    inputError: { borderColor: '#EF4444' },
    errorText: { color: '#EF4444', fontSize: 13, marginTop: 4 },
    textArea: { minHeight: 80, paddingTop: 14 },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border.light,
    },
    pickerText: { fontSize: 16, color: COLORS.text.primary },
    pickerPlaceholder: { fontSize: 16, color: COLORS.text.secondary },
    typeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeButton: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border.light },
    typeButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    typeText: { fontSize: 14, color: COLORS.text.secondary },
    typeTextActive: { color: '#FFFFFF', fontWeight: '500' },
    submitButton: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    submitButtonDisabled: { opacity: 0.7 },
    submitButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600', marginRight: 8 },

    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary },
    regionItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border.light },
    regionName: { fontSize: 16, color: COLORS.text.primary },
});