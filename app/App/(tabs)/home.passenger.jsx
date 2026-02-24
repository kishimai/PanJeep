import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Platform,
    Animated,
    TextInput,
    Alert,
    ActivityIndicator,
    FlatList,
    Modal,
} from "react-native";
import { useAuth } from '../../providers/AuthProvider';
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';

const COLORS = {
    primary: "#39A0ED",
    background: "#FFFFFF",
    text: {
        primary: "#111827",
        secondary: "#6B7280",
        light: "#FFFFFF",
    },
    surface: "#F9FAFB",
    accent: "#10B981",
    live: "#EF4444",
    border: {
        light: "#F3F4F6",
    },
};

const AnimatedJeepCard = React.memo(({ jeep, onPress, fadeAnim }) => {
    const jeepCardScale = useRef(new Animated.Value(1)).current;
    const handlePressIn = useCallback(() => {
        Animated.spring(jeepCardScale, { toValue: 0.96, useNativeDriver: true, friction: 8 }).start();
    }, []);
    const handlePressOut = useCallback(() => {
        Animated.spring(jeepCardScale, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    }, []);
    return (
        <Animated.View style={[styles.jeepCard, { transform: [{ scale: jeepCardScale }], opacity: fadeAnim }]}>
            <TouchableOpacity activeOpacity={0.9} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
                <View style={styles.routeBadge}>
                    <Text style={styles.routeCode}>{jeep.route}</Text>
                </View>
                <View style={styles.jeepDetails}>
                    <View style={styles.jeepDetail}>
                        <Feather name="map-pin" size={12} color={COLORS.text.secondary} />
                        <Text style={styles.jeepDetailText}>{jeep.distance}</Text>
                    </View>
                    <View style={styles.jeepDetail}>
                        <Feather name="clock" size={12} color={COLORS.text.secondary} />
                        <Text style={[styles.arrivalText, jeep.arrival === 'Now' && styles.arrivalNow]}>
                            {jeep.arrival}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

export default function PassengerHome() {
    const { session } = useAuth();
    const isGuest = session?.type === 'guest';

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [poiResults, setPoiResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const searchTimeout = useRef(null);
    const latestQuery = useRef('');

    // Static data (example)
    const routesNearYou = [
        { id: 1, code: "12A", destination: "Downtown Loop", time: "15m", fare: "₱15", capacity: "Moderate" },
        { id: 2, code: "8B", destination: "University Express", time: "7m", fare: "₱12", capacity: "Light" },
        { id: 3, code: "5C", destination: "Coastal Line", time: "20m", fare: "₱20", capacity: "Heavy" },
    ];
    const liveJeeps = [
        { id: 1, route: "12A", distance: "0.8 km", capacity: "12/20", arrival: "3 min" },
        { id: 2, route: "8B", distance: "1.2 km", capacity: "5/20", arrival: "Now" },
        { id: 3, route: "5C", distance: "2.1 km", capacity: "18/20", arrival: "7 min" },
    ];

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;
    const cardAnimations = useRef(routesNearYou.map(() => new Animated.Value(1))).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
        return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
    }, []);

    const handlePressIn = useCallback((anim) => {
        Animated.spring(anim, { toValue: 0.96, useNativeDriver: true, friction: 8 }).start();
    }, []);
    const handlePressOut = useCallback((anim) => {
        Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    }, []);
    const handleCardPressIn = useCallback((index) => {
        Animated.spring(cardAnimations[index], { toValue: 0.98, useNativeDriver: true, friction: 8 }).start();
    }, []);
    const handleCardPressOut = useCallback((index) => {
        Animated.spring(cardAnimations[index], { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    }, []);
    const navigateToRoutes = useCallback(() => router.push('/routes.passenger'), []);

    // POI search
    const searchPOIs = useCallback(async (query) => {
        if (!query.trim()) {
            setPoiResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const { data, error } = await supabase
                .from('points_of_interest')
                .select('id, name, type, geometry')
                .ilike('name', `%${query}%`)
                .limit(10);
            if (error) throw error;
            if (!data || data.length === 0) {
                setPoiResults([]);
                return;
            }
            const results = data.map(poi => ({
                id: poi.id,
                name: poi.name,
                type: poi.type,
                latitude: poi.geometry.coordinates[1],
                longitude: poi.geometry.coordinates[0],
            }));
            setPoiResults(results);
            setShowResults(true);
        } catch (error) {
            console.warn('POI search error:', error);
            Alert.alert('Error', 'Failed to search places. Check your connection.');
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleSearchChange = useCallback((text) => {
        setSearchQuery(text);
        latestQuery.current = text;
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            const current = latestQuery.current;
            if (current.trim()) searchPOIs(current);
            else {
                setPoiResults([]);
                setShowResults(false);
            }
        }, 500);
    }, [searchPOIs]);

    const handleSearchSubmit = useCallback(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (searchQuery.trim()) searchPOIs(searchQuery);
    }, [searchQuery, searchPOIs]);

    // Navigate to routes with destination POI
    const handleSelectPOI = useCallback((poi) => {
        setShowResults(false);
        setSearchQuery(poi.name);
        router.push({
            pathname: '/routes.passenger',
            params: {
                destinationPoiId: poi.id,
                endName: poi.name,
            },
        });
    }, []);

    const handleCloseModal = useCallback(() => {
        setShowResults(false);
        setPoiResults([]);
    }, []);

    const navigateToAccount = useCallback(() => {
        router.push(isGuest ? '/register' : '/account.passenger');
    }, [isGuest]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.headerSection}>
                    <View style={styles.headerRow}>
                        <Animated.View style={[styles.headerContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                            <Text style={styles.logo}>Lakbay</Text>
                            <Text style={styles.headerSubtitle}>Commute smarter</Text>
                        </Animated.View>
                        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                            <TouchableOpacity
                                style={styles.accountButton}
                                onPress={navigateToAccount}
                                onPressIn={() => handlePressIn(buttonScale)}
                                onPressOut={() => handlePressOut(buttonScale)}
                                activeOpacity={0.8}
                            >
                                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                                    <Feather name={isGuest ? "compass" : "user"} size={20} color={COLORS.primary} />
                                </Animated.View>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                </View>

                {/* Search Input */}
                <Animated.View style={[styles.searchContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.searchInputWrapper}>
                        <Feather name="search" size={18} color={COLORS.text.secondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Where to?"
                            placeholderTextColor={COLORS.text.secondary}
                            value={searchQuery}
                            onChangeText={handleSearchChange}
                            onSubmitEditing={handleSearchSubmit}
                            returnKeyType="search"
                            editable={!isSearching}
                        />
                        {isSearching && <ActivityIndicator size="small" color={COLORS.primary} />}
                    </View>
                </Animated.View>

                {/* POI Results Modal */}
                <Modal
                    visible={showResults && poiResults.length > 0}
                    transparent
                    animationType="fade"
                    onRequestClose={handleCloseModal}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select a place</Text>
                                <TouchableOpacity onPress={handleCloseModal}>
                                    <Feather name="x" size={24} color={COLORS.text.primary} />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={poiResults}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.poiItem} onPress={() => handleSelectPOI(item)}>
                                        <Feather name="map-pin" size={20} color={COLORS.primary} />
                                        <View style={styles.poiInfo}>
                                            <Text style={styles.poiName}>{item.name}</Text>
                                            <Text style={styles.poiType}>{item.type}</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                initialNumToRender={10}
                                maxToRenderPerBatch={10}
                                windowSize={5}
                            />
                        </View>
                    </View>
                </Modal>

                {/* Live Jeeps */}
                <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <Feather name="navigation" size={16} color={COLORS.live} />
                            <Text style={styles.sectionTitle}>Live Jeeps</Text>
                        </View>
                    </View>
                    <View style={styles.liveJeepsGrid}>
                        {liveJeeps.map(jeep => (
                            <AnimatedJeepCard key={jeep.id} jeep={jeep} onPress={navigateToRoutes} fadeAnim={fadeAnim} />
                        ))}
                    </View>
                </Animated.View>

                {/* Routes Near You */}
                <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <Feather name="map" size={16} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>Routes Near You</Text>
                        </View>
                        <TouchableOpacity
                            onPress={navigateToRoutes}
                            onPressIn={() => handlePressIn(buttonScale)}
                            onPressOut={() => handlePressOut(buttonScale)}
                            activeOpacity={0.8}
                        >
                            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                                <Feather name="chevron-right" size={18} color={COLORS.primary} />
                            </Animated.View>
                        </TouchableOpacity>
                    </View>
                    {routesNearYou.map((route, index) => (
                        <Animated.View
                            key={route.id}
                            style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: cardAnimations[index] }] }}
                        >
                            <TouchableOpacity
                                style={styles.routeCard}
                                onPress={navigateToRoutes}
                                onPressIn={() => handleCardPressIn(index)}
                                onPressOut={() => handleCardPressOut(index)}
                                activeOpacity={0.9}
                                delayPressIn={50}
                            >
                                <View style={styles.routeBadge}>
                                    <Text style={styles.routeCode}>{route.code}</Text>
                                </View>
                                <View style={styles.routeInfo}>
                                    <Text style={styles.routeDestination}>{route.destination}</Text>
                                    <View style={styles.routeMeta}>
                                        <Text style={styles.routeTime}>{route.time}  •  {route.fare}</Text>
                                        <View style={[styles.capacityTag, route.capacity === 'Light' && styles.capacityLight, route.capacity === 'Heavy' && styles.capacityHeavy]}>
                                            <Text style={styles.capacityTagText}>{route.capacity}</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </Animated.View>

                {/* Guest hint */}
                {isGuest && (
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                        <TouchableOpacity
                            style={styles.guestSection}
                            onPress={() => router.push('/register')}
                            onPressIn={() => handlePressIn(buttonScale)}
                            onPressOut={() => handlePressOut(buttonScale)}
                            activeOpacity={0.8}
                        >
                            <Feather name="star" size={16} color={COLORS.primary} />
                            <Text style={styles.guestText}>Sign up to save routes</Text>
                            <Feather name="chevron-right" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                    </Animated.View>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 40,
    },
    headerSection: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerContent: {
        flex: 1,
    },
    accountButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(57, 160, 237, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    logo: {
        fontSize: 32,
        fontWeight: '800',
        color: COLORS.text.primary,
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: COLORS.primary,
        fontWeight: '500',
    },
    searchContainer: {
        marginHorizontal: 20,
        marginBottom: 32,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 16 : 12,
        borderWidth: 1,
        borderColor: 'rgba(57, 160, 237, 0.02)',
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: COLORS.text.primary,
        padding: 0,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text.primary,
    },
    poiItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border.light,
    },
    poiInfo: {
        marginLeft: 12,
        flex: 1,
    },
    poiName: {
        fontSize: 16,
        color: COLORS.text.primary,
        fontWeight: '500',
    },
    poiType: {
        fontSize: 14,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text.primary,
    },
    liveJeepsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        gap: 12,
    },
    jeepCard: {
        width: '48%',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.02)',
    },
    routeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: 'rgba(57, 160, 237, 0.1)',
        borderRadius: 8,
        minWidth: 44,
        alignItems: 'center',
        marginBottom: 12,
    },
    routeCode: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.primary,
    },
    jeepDetails: {
        gap: 6,
    },
    jeepDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    jeepDetailText: {
        fontSize: 12,
        color: COLORS.text.secondary,
    },
    arrivalText: {
        fontSize: 12,
        color: COLORS.text.secondary,
    },
    arrivalNow: {
        color: COLORS.live,
        fontWeight: '600',
    },
    routeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    routeInfo: {
        flex: 1,
        marginLeft: 16,
    },
    routeDestination: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text.primary,
        marginBottom: 4,
    },
    routeMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    routeTime: {
        fontSize: 14,
        color: COLORS.text.secondary,
    },
    capacityTag: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderRadius: 6,
    },
    capacityLight: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    capacityHeavy: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    capacityTagText: {
        fontSize: 12,
        color: COLORS.accent,
        fontWeight: '600',
    },
    guestSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        padding: 12,
        backgroundColor: 'rgba(57, 160, 237, 0.05)',
        borderRadius: 12,
        gap: 8,
    },
    guestText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '500',
    },
});