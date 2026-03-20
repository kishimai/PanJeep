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
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useProfile } from '../lib/useProfile';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

const COLORS = {
    primary: "#39A0ED",
    background: "#FFFFFF",
    surface: "#F9FAFB",
    text: { primary: "#111827", secondary: "#6B7280" },
    border: { light: "#F3F4F6" },
};

export default function ContributorApplication() {
    const { session } = useAuth();
    const { profile } = useProfile(session);
    const [loading, setLoading] = useState(false);
    const [regions, setRegions] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [showRegionModal, setShowRegionModal] = useState(false);
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        phone: '',
        reason: '',
    });
    const [errors, setErrors] = useState({});

    // Pre-fill from profile
    useEffect(() => {
        if (profile) {
            setForm({
                fullName: profile.full_name || '',
                email: profile.email || '',
                phone: profile.phone || '',
                reason: '',
            });
        }
    }, [profile]);

    // Load regions
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

    const validate = () => {
        const newErrors = {};
        if (!form.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!form.email.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Invalid email';
        if (!form.reason.trim()) newErrors.reason = 'Please tell us why you want to contribute';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('contributor_applications')
                .insert({
                    user_id: session.user.id,
                    full_name: form.fullName,
                    email: form.email,
                    phone: form.phone || null,
                    reason: form.reason,
                    region_interest: selectedRegion,
                    status: 'pending',
                });

            if (error) throw error;

            Alert.alert(
                'Application Submitted',
                'Your application is pending review. You will be notified once approved.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to submit application. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Feather name="arrow-left" size={24} color={COLORS.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Become a Contributor</Text>
                    <Text style={styles.subtitle}>Help improve transit data for your community</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name *</Text>
                        <TextInput
                            style={[styles.input, errors.fullName && styles.inputError]}
                            value={form.fullName}
                            onChangeText={(text) => setForm({ ...form, fullName: text })}
                            placeholder="Your full name"
                        />
                        {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email *</Text>
                        <TextInput
                            style={[styles.input, errors.email && styles.inputError]}
                            value={form.email}
                            onChangeText={(text) => setForm({ ...form, email: text })}
                            placeholder="your@email.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone (optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.phone}
                            onChangeText={(text) => setForm({ ...form, phone: text })}
                            placeholder="+63 ..."
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Region of Interest (optional)</Text>
                        <TouchableOpacity
                            style={styles.pickerButton}
                            onPress={() => setShowRegionModal(true)}
                        >
                            <Text style={selectedRegion ? styles.pickerText : styles.pickerPlaceholder}>
                                {selectedRegion
                                    ? regions.find(r => r.region_id === selectedRegion)?.name
                                    : 'Select a region'}
                            </Text>
                            <Feather name="chevron-down" size={20} color={COLORS.text.secondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Why do you want to contribute? *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, errors.reason && styles.inputError]}
                            value={form.reason}
                            onChangeText={(text) => setForm({ ...form, reason: text })}
                            placeholder="Tell us about your motivation and any local knowledge..."
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                        {errors.reason && <Text style={styles.errorText}>{errors.reason}</Text>}
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
                                <Text style={styles.submitButtonText}>Submit Application</Text>
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
    form: { paddingHorizontal: 20 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 15, fontWeight: '600', color: COLORS.text.primary, marginBottom: 8 },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: COLORS.border.light },
    inputError: { borderColor: '#EF4444' },
    errorText: { color: '#EF4444', fontSize: 13, marginTop: 4 },
    textArea: { minHeight: 100, paddingTop: 14 },
    pickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border.light },
    pickerText: { fontSize: 16, color: COLORS.text.primary },
    pickerPlaceholder: { fontSize: 16, color: COLORS.text.secondary },
    submitButton: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    submitButtonDisabled: { opacity: 0.7 },
    submitButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600', marginRight: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary },
    regionItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border.light },
    regionName: { fontSize: 16, color: COLORS.text.primary },
});