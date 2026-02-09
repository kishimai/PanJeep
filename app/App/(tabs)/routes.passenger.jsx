import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StatusBar,
    Platform,
    Dimensions,
    Alert,
    Animated,
    PanResponder,
    Easing,
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import { getCurrentPositionAsync, requestForegroundPermissionsAsync } from 'expo-location';
import { MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');

// Refined color palette
const COLORS = {
    background: "#FFFFFF",
    surface: "#FFFFFF",
    text: "#1F2937",
    textMuted: "#6B7280",
    textLight: "#FFFFFF",
    primary: "#39A0ED",
    primaryLight: "rgba(57, 160, 237, 0.1)",
    primaryMedium: "rgba(57, 160, 237, 0.15)",
    accent: "#F87171",
    border: "rgba(229, 231, 235, 0.5)",
    success: "#10B981",
    warning: "#F59E0B",
    info: "#3B82F6",
    subtle: "#F9FAFB",
    mapRoute: "#39A0ED",
    mapRouteActive: "#F87171",
    overlay: "rgba(0, 0, 0, 0.1)",
};

export default function PassengerRoutes() {
    // State Management
    const [activeRoute, setActiveRoute] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRouteDetails, setSelectedRouteDetails] = useState(null);
    const [mapRegion, setMapRegion] = useState(null);
    const [bottomSheetHeight] = useState(new Animated.Value(0.3 * height));
    const [searchFocused, setSearchFocused] = useState(false);
    const [routeInfoVisible, setRouteInfoVisible] = useState(false);

    // Refs
    const mapRef = useRef(null);
    const bottomSheetRef = useRef(null);
    const searchRef = useRef(null);

    // Animation values - Using transform scaleY instead of height for native driver
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideUpAnim = useRef(new Animated.Value(50)).current;

    // Route Info Panel Animations
    const routeInfoScaleY = useRef(new Animated.Value(0)).current; // ScaleY instead of height
    const routeInfoScale = useRef(new Animated.Value(0.95)).current;
    const routeInfoOpacity = useRef(new Animated.Value(0)).current;
    const routeInfoSlide = useRef(new Animated.Value(100)).current;
    const routeInfoContentOpacity = useRef(new Animated.Value(0)).current;

    // Overlay animation
    const overlayOpacity = useRef(new Animated.Value(0)).current;

    // Loading animations
    const loadingDots = [
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
    ];

    // Enhanced PanResponder for smooth interactions
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) =>
                Math.abs(gestureState.dy) > 5 && !routeInfoVisible,
            onPanResponderMove: (_, gestureState) => {
                if (!routeInfoVisible) {
                    const newHeight = Math.max(0.25 * height, Math.min(0.8 * height, 0.3 * height - gestureState.dy));
                    bottomSheetHeight.setValue(newHeight);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (routeInfoVisible) return;

                const velocity = gestureState.vy;
                const currentHeight = bottomSheetHeight._value;

                let targetHeight;
                if (currentHeight < 0.35 * height || velocity > 1) {
                    targetHeight = 0.25 * height; // Minimal view
                } else if (currentHeight > 0.6 * height || velocity < -1) {
                    targetHeight = 0.8 * height; // Full view
                } else {
                    targetHeight = 0.4 * height; // Default view
                }

                Animated.spring(bottomSheetHeight, {
                    toValue: targetHeight,
                    tension: 200,
                    friction: 20,
                    useNativeDriver: false,
                }).start();
            },
        })
    ).current;

    // Enhanced route info panel animation - Fixed to use native driver compatible properties
    const showRouteInfo = useCallback((route) => {
        setSelectedRouteDetails(route);
        setActiveRoute(route.id);

        // Animate bottom sheet up to make room
        Animated.spring(bottomSheetHeight, {
            toValue: 0.25 * height,
            tension: 200,
            friction: 20,
            useNativeDriver: false,
        }).start(() => {
            setRouteInfoVisible(true);

            // Sequential animation for route info
            Animated.sequence([
                // Fade in overlay
                Animated.timing(overlayOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                // Animate route info panel with native driver
                Animated.parallel([
                    Animated.spring(routeInfoScaleY, {
                        toValue: 1,
                        tension: 200,
                        friction: 20,
                        useNativeDriver: true,
                    }),
                    Animated.spring(routeInfoScale, {
                        toValue: 1,
                        tension: 250,
                        friction: 15,
                        useNativeDriver: true,
                    }),
                    Animated.timing(routeInfoOpacity, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                    Animated.spring(routeInfoSlide, {
                        toValue: 0,
                        tension: 250,
                        friction: 15,
                        useNativeDriver: true,
                    }),
                ]),
                // Fade in content
                Animated.timing(routeInfoContentOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        });

        // Center map on route
        if (mapRef.current && route.rawPoints && route.rawPoints.length > 0) {
            const coordinates = route.rawPoints.map(coord => ({
                latitude: coord[1],
                longitude: coord[0],
            }));

            mapRef.current.fitToCoordinates(coordinates, {
                edgePadding: { top: 100, right: 50, bottom: 0.8 * height, left: 50 },
                animated: true,
            });
        }
    }, []);

    const hideRouteInfo = useCallback(() => {
        // Sequential hide animation
        Animated.sequence([
            Animated.timing(routeInfoContentOpacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.parallel([
                Animated.spring(routeInfoScaleY, {
                    toValue: 0,
                    tension: 200,
                    friction: 20,
                    useNativeDriver: true,
                }),
                Animated.spring(routeInfoScale, {
                    toValue: 0.95,
                    tension: 200,
                    friction: 15,
                    useNativeDriver: true,
                }),
                Animated.timing(routeInfoOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(routeInfoSlide, {
                    toValue: 100,
                    tension: 200,
                    friction: 15,
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(overlayOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setRouteInfoVisible(false);
            setSelectedRouteDetails(null);
            setActiveRoute(null);

            // Reset bottom sheet to default height
            Animated.spring(bottomSheetHeight, {
                toValue: 0.4 * height,
                tension: 200,
                friction: 20,
                useNativeDriver: false,
            }).start();
        });
    }, []);

    // Enhanced loading animation
    useEffect(() => {
        if (loading) {
            loadingDots.forEach((dot, index) => {
                Animated.loop(
                    Animated.sequence([
                        Animated.delay(index * 150),
                        Animated.spring(dot, {
                            toValue: 1,
                            tension: 200,
                            friction: 3,
                            useNativeDriver: true,
                        }),
                        Animated.spring(dot, {
                            toValue: 0,
                            tension: 200,
                            friction: 3,
                            useNativeDriver: true,
                        }),
                        Animated.delay(300),
                    ])
                ).start();
            });
        }
    }, [loading]);

    // Fetch routes from database
    const fetchRoutes = useCallback(async () => {
        try {
            setLoading(true);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                await supabase.auth.signInAnonymously();
            }

            const { data, error } = await supabase
                .from('routes')
                .select(`
                    id,
                    route_code,
                    origin_type,
                    status,
                    geometry,
                    stops_snapshot,
                    length_meters,
                    created_at,
                    region_id,
                    passenger_usage_score
                `)
                .is('deleted_at', null)
                .neq('status', 'deprecated')
                .order('passenger_usage_score', { ascending: false });

            if (error) throw error;

            const transformedRoutes = data.map(route => {
                let rawPoints = [];
                if (route.geometry && typeof route.geometry === 'string') {
                    try {
                        const parsed = JSON.parse(route.geometry);
                        if (parsed?.coordinates) {
                            rawPoints = parsed.coordinates;
                        }
                    } catch (e) {
                        console.warn(`Failed to parse geometry for route ${route.id}:`, e);
                    }
                }

                let routeName = 'Unnamed Route';
                let busNumber = route.route_code || 'N/A';

                if (route.stops_snapshot) {
                    try {
                        const stops = typeof route.stops_snapshot === 'string'
                            ? JSON.parse(route.stops_snapshot)
                            : route.stops_snapshot;

                        if (stops?.length > 0) {
                            const firstStop = stops[0];
                            const lastStop = stops[stops.length - 1];
                            routeName = `${firstStop?.name || 'Unknown'} → ${lastStop?.name || 'Unknown'}`;
                        }
                    } catch (e) {
                        console.warn(`Failed to parse stops for route ${route.id}:`, e);
                    }
                }

                return {
                    id: route.id,
                    code: route.route_code || 'N/A',
                    name: routeName,
                    busNumber: busNumber,
                    status: route.status || 'draft',
                    color: COLORS.mapRoute,
                    rawPoints: rawPoints,
                    region: `Region ${route.region_id || 'N/A'}`,
                    fare: '₱12-15',
                    estimatedTime: '45-60 min',
                    passengers: '20-30',
                    rating: (route.passenger_usage_score || 0).toFixed(1),
                    length: route.length_meters ? `${(route.length_meters / 1000).toFixed(1)}km` : 'N/A',
                };
            }).filter(route => route !== null);

            setRoutes(transformedRoutes);

            // Animate in the routes list
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.spring(slideUpAnim, {
                    toValue: 0,
                    tension: 180,
                    friction: 12,
                    useNativeDriver: true,
                }),
            ]).start();

        } catch (error) {
            console.error('Error fetching routes:', error);
            Alert.alert(
                'Connection Error',
                'Unable to load routes. Please check your connection.',
                [{ text: 'OK' }]
            );
        } finally {
            setLoading(false);
        }
    }, []);

    // Initialize
    useEffect(() => {
        const init = async () => {
            try {
                const { status } = await requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const location = await getCurrentPositionAsync({});
                    setUserLocation({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    });

                    setMapRegion({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    });
                }

                await fetchRoutes();
            } catch (error) {
                console.log('Initialization error:', error);
            }
        };

        init();
    }, []);

    // Filter routes based on search
    const filteredRoutes = useMemo(() => {
        if (!searchQuery.trim()) return routes;

        const query = searchQuery.toLowerCase();
        return routes.filter(route =>
            route.name.toLowerCase().includes(query) ||
            route.code.toLowerCase().includes(query) ||
            route.busNumber.toLowerCase().includes(query)
        );
    }, [routes, searchQuery]);

    // Render route lines on map
    const renderRouteLines = () => {
        return filteredRoutes.map(route => {
            if (!route.rawPoints || route.rawPoints.length < 2) return null;

            const coordinates = route.rawPoints.map(coord => ({
                latitude: coord[1],
                longitude: coord[0],
            }));

            return (
                <Polyline
                    key={`line-${route.id}`}
                    coordinates={coordinates}
                    strokeColor={activeRoute === route.id ? COLORS.mapRouteActive : route.color}
                    strokeWidth={activeRoute === route.id ? 5 : 3}
                    strokeOpacity={activeRoute === route.id ? 0.9 : 0.6}
                    lineDashPattern={activeRoute === route.id ? undefined : [1, 4]}
                />
            );
        });
    };

    // Enhanced Route Card with tap animation
    const RouteCard = ({ route }) => {
        const cardScale = useRef(new Animated.Value(1)).current;

        const handlePress = () => {
            // Scale animation on press
            Animated.sequence([
                Animated.spring(cardScale, {
                    toValue: 0.98,
                    tension: 300,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.spring(cardScale, {
                    toValue: 1,
                    tension: 300,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();

            // Show route info after animation
            setTimeout(() => showRouteInfo(route), 100);
        };

        return (
            <Animated.View style={{ transform: [{ scale: cardScale }] }}>
                <TouchableOpacity
                    style={[
                        styles.routeCard,
                        activeRoute === route.id && styles.routeCardActive
                    ]}
                    onPress={handlePress}
                    activeOpacity={0.9}
                >
                    <View style={styles.routeCardContent}>
                        <View style={styles.routeCardIcon}>
                            <MaterialIcons
                                name="directions-bus"
                                size={18}
                                color={activeRoute === route.id ? COLORS.textLight : COLORS.primary}
                            />
                        </View>
                        <View style={styles.routeCardInfo}>
                            <Text style={styles.routeCardName} numberOfLines={1}>
                                {route.name}
                            </Text>
                            <Text style={styles.routeCardCode}>
                                Route {route.code}
                            </Text>
                        </View>
                        <View style={styles.routeCardMeta}>
                            <Text style={styles.routeCardFare}>{route.fare}</Text>
                            <View style={styles.routeCardRating}>
                                <MaterialIcons name="star" size={12} color={COLORS.warning} />
                                <Text style={styles.routeCardRatingText}>{route.rating}</Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    // Enhanced loading state
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.loadingContent}>
                    <MaterialIcons
                        name="directions-bus"
                        size={56}
                        color={COLORS.primary}
                        style={styles.loadingIcon}
                    />
                    <Text style={styles.loadingTitle}>Finding routes</Text>
                    <Text style={styles.loadingSubtitle}>Discovering the best jeepney routes near you</Text>

                    <View style={styles.loadingDotsContainer}>
                        {loadingDots.map((dot, index) => (
                            <Animated.View
                                key={index}
                                style={[
                                    styles.loadingDot,
                                    {
                                        backgroundColor: COLORS.primary,
                                        transform: [
                                            {
                                                translateY: dot.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0, -10]
                                                })
                                            }
                                        ]
                                    }
                                ]}
                            />
                        ))}
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Overlay for route info panel */}
            <Animated.View
                style={[
                    styles.overlay,
                    {
                        opacity: overlayOpacity,
                        pointerEvents: routeInfoVisible ? 'auto' : 'none'
                    }
                ]}
            >
                <TouchableOpacity
                    style={styles.overlayTouchArea}
                    activeOpacity={1}
                    onPress={hideRouteInfo}
                />
            </Animated.View>

            {/* Map View */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                showsUserLocation={true}
                showsCompass={false}
                showsScale={false}
                showsTraffic={true}
                showsBuildings={true}
                region={mapRegion || {
                    latitude: 14.5995,
                    longitude: 120.9842,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                mapPadding={{ top: 0, right: 0, bottom: 0.3 * height, left: 0 }}
                onPress={routeInfoVisible ? hideRouteInfo : undefined}
            >
                {renderRouteLines()}
            </MapView>

            {/* Floating Search Bar */}
            <Animated.View style={[
                styles.searchBarContainer,
                {
                    transform: [{
                        translateY: overlayOpacity.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -20]
                        })
                    }],
                    opacity: overlayOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0.7]
                    })
                }
            ]}>
                <View style={styles.searchBar}>
                    <Feather
                        name="search"
                        size={20}
                        color={searchFocused ? COLORS.primary : COLORS.textMuted}
                        style={styles.searchIcon}
                    />
                    <TextInput
                        ref={searchRef}
                        style={styles.searchInput}
                        placeholder="Search routes..."
                        placeholderTextColor={COLORS.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        returnKeyType="search"
                    />
                    {searchQuery ? (
                        <TouchableOpacity
                            onPress={() => setSearchQuery('')}
                            style={styles.clearSearchButton}
                        >
                            <Feather name="x" size={18} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    ) : null}
                </View>
                {searchQuery && (
                    <Text style={styles.searchResultsText}>
                        {filteredRoutes.length} routes found
                    </Text>
                )}
            </Animated.View>

            {/* Enhanced Route Info Panel - Using scaleY for animation */}
            <Animated.View
                style={[
                    styles.routeInfoContainer,
                    {
                        opacity: routeInfoOpacity,
                        transform: [
                            { translateY: routeInfoSlide },
                            { scale: routeInfoScale },
                            { scaleY: routeInfoScaleY },
                        ],
                    }
                ]}
                pointerEvents={routeInfoVisible ? 'auto' : 'none'}
            >
                {/* Connected bridge to bottom sheet */}
                <View style={styles.infoBridge} />

                <Animated.View
                    style={[
                        styles.routeInfoContent,
                        { opacity: routeInfoContentOpacity }
                    ]}
                >
                    {/* Header with close button */}
                    <View style={styles.routeInfoHeader}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={hideRouteInfo}
                            activeOpacity={0.7}
                        >
                            <Feather name="chevron-down" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                        <Text style={styles.routeInfoTitle}>Route Details</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Route Info */}
                    {selectedRouteDetails && (
                        <>
                            <View style={styles.routeInfoMain}>
                                <View style={styles.routeIconLarge}>
                                    <MaterialIcons name="directions-bus" size={32} color={COLORS.primary} />
                                </View>
                                <View style={styles.routeInfoText}>
                                    <Text style={styles.routeNameLarge} numberOfLines={2}>
                                        {selectedRouteDetails.name}
                                    </Text>
                                    <Text style={styles.routeCodeLarge}>
                                        Route {selectedRouteDetails.code}
                                    </Text>
                                </View>
                            </View>

                            {/* Quick Stats */}
                            <View style={styles.quickStats}>
                                <View style={styles.statItem}>
                                    <Feather name="clock" size={16} color={COLORS.textMuted} />
                                    <Text style={styles.statLabel}>Duration</Text>
                                    <Text style={styles.statValue}>{selectedRouteDetails.estimatedTime}</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Feather name="users" size={16} color={COLORS.textMuted} />
                                    <Text style={styles.statLabel}>Passengers</Text>
                                    <Text style={styles.statValue}>{selectedRouteDetails.passengers}</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <MaterialIcons name="star" size={16} color={COLORS.warning} />
                                    <Text style={styles.statLabel}>Rating</Text>
                                    <Text style={styles.statValue}>{selectedRouteDetails.rating}</Text>
                                </View>
                            </View>

                            {/* Fare Section */}
                            <View style={styles.fareSection}>
                                <Text style={styles.fareLabel}>Estimated Fare</Text>
                                <Text style={styles.fareValue}>{selectedRouteDetails.fare}</Text>
                            </View>

                            {/* Action Button */}
                            <TouchableOpacity style={styles.navigateButton}>
                                <MaterialIcons name="directions" size={22} color={COLORS.textLight} />
                                <Text style={styles.navigateButtonText}>Start Navigation</Text>
                                <Feather name="arrow-right" size={18} color={COLORS.textLight} style={styles.navigateIcon} />
                            </TouchableOpacity>
                        </>
                    )}
                </Animated.View>
            </Animated.View>

            {/* Bottom Sheet */}
            <Animated.View
                style={[
                    styles.bottomSheet,
                    { height: bottomSheetHeight }
                ]}
                {...panResponder.panHandlers}
            >
                {/* Sheet Handle */}
                <View style={styles.sheetHandle}>
                    <View style={styles.sheetDragIndicator} />
                </View>

                {/* Routes Counter */}
                <View style={styles.routesCounter}>
                    <Text style={styles.routesCount}>{routes.length}</Text>
                    <Text style={styles.routesLabel}>available routes</Text>
                </View>

                {/* Routes List */}
                <Animated.ScrollView
                    ref={bottomSheetRef}
                    style={styles.routesList}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.routesListContent}
                    scrollEventThrottle={16}
                >
                    {filteredRoutes.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Feather name="map" size={44} color={COLORS.textMuted} />
                            <Text style={styles.emptyTitle}>
                                {searchQuery ? 'No routes found' : 'No routes available'}
                            </Text>
                            <Text style={styles.emptyText}>
                                {searchQuery
                                    ? 'Try a different search'
                                    : 'Check back later for new routes'
                                }
                            </Text>
                        </View>
                    ) : (
                        <Animated.View style={{
                            opacity: fadeAnim,
                            transform: [{ translateY: slideUpAnim }]
                        }}>
                            {filteredRoutes.map((route) => (
                                <RouteCard key={route.id} route={route} />
                            ))}
                        </Animated.View>
                    )}
                </Animated.ScrollView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    map: {
        flex: 1,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.overlay,
        zIndex: 90,
    },
    overlayTouchArea: {
        flex: 1,
    },
    // Loading State
    loadingContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContent: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loadingIcon: {
        marginBottom: 24,
        opacity: 0.9,
    },
    loadingTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    loadingSubtitle: {
        fontSize: 16,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 40,
    },
    loadingDotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
    },
    loadingDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginHorizontal: 6,
    },
    // Search Bar
    searchBarContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 20,
        right: 20,
        zIndex: 100,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        padding: 0,
        fontWeight: '500',
    },
    clearSearchButton: {
        padding: 4,
    },
    searchResultsText: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginTop: 8,
        marginLeft: 4,
        fontWeight: '500',
    },
    // Bottom Sheet
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 12,
        paddingTop: 12,
        paddingHorizontal: 20,
        zIndex: 95,
    },
    sheetHandle: {
        alignItems: 'center',
        marginBottom: 16,
        paddingVertical: 8,
    },
    sheetDragIndicator: {
        width: 36,
        height: 4,
        backgroundColor: COLORS.border,
        borderRadius: 2,
        opacity: 0.6,
    },
    routesCounter: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 20,
    },
    routesCount: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.primary,
        marginRight: 8,
    },
    routesLabel: {
        fontSize: 16,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    routesList: {
        flex: 1,
    },
    routesListContent: {
        paddingBottom: 40,
    },
    // Route Card
    routeCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    routeCardActive: {
        backgroundColor: COLORS.primaryLight,
        borderColor: COLORS.primary,
    },
    routeCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    routeCardIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(57, 160, 237, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    routeCardInfo: {
        flex: 1,
    },
    routeCardName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    routeCardCode: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '600',
    },
    routeCardMeta: {
        alignItems: 'flex-end',
    },
    routeCardFare: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.success,
        marginBottom: 6,
    },
    routeCardRating: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    routeCardRatingText: {
        fontSize: 12,
        color: COLORS.warning,
        fontWeight: '600',
        marginLeft: 4,
    },
    // Enhanced Route Info Panel - Fixed to use scaleY
    routeInfoContainer: {
        position: 'absolute',
        bottom: 0.25 * height, // Positioned above bottom sheet
        left: 20,
        right: 20,
        backgroundColor: COLORS.surface,
        borderRadius: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 25,
        overflow: 'hidden',
        zIndex: 99,
        maxHeight: 0.55 * height,
        minHeight: 200, // Minimum height when scaled down
        transformOrigin: 'bottom center', // Scale from bottom
    },
    infoBridge: {
        position: 'absolute',
        top: -12,
        left: '50%',
        marginLeft: -24,
        width: 48,
        height: 12,
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    routeInfoContent: {
        flex: 1,
        padding: 24,
    },
    routeInfoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        paddingTop: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.subtle,
        justifyContent: 'center',
        alignItems: 'center',
    },
    routeInfoTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    routeInfoMain: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
    },
    routeIconLarge: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
    },
    routeInfoText: {
        flex: 1,
    },
    routeNameLarge: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 6,
        lineHeight: 28,
    },
    routeCodeLarge: {
        fontSize: 16,
        color: COLORS.primary,
        fontWeight: '600',
    },
    quickStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.subtle,
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 6,
        marginBottom: 4,
        fontWeight: '500',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: COLORS.border,
    },
    fareSection: {
        backgroundColor: 'rgba(57, 160, 237, 0.05)',
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
    },
    fareLabel: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: '500',
        marginBottom: 8,
    },
    fareValue: {
        fontSize: 32,
        fontWeight: '800',
        color: COLORS.primary,
    },
    navigateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 20,
        paddingHorizontal: 24,
        borderRadius: 20,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    navigateButtonText: {
        color: COLORS.textLight,
        fontSize: 18,
        fontWeight: '700',
        marginHorizontal: 12,
    },
    navigateIcon: {
        opacity: 0.9,
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginTop: 20,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 22,
    },
});