import React, { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Platform,
    Dimensions,
    Alert,
    Animated,
    RefreshControl,
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { getCurrentPositionAsync, requestForegroundPermissionsAsync, watchPositionAsync, Accuracy } from 'expo-location';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';

const { width, height } = Dimensions.get('window');

// Clean, modern color palette
const COLORS = {
    background: "#FFFFFF",
    surface: "#FFFFFF",
    text: {
        primary: "#111827",
        secondary: "#4B5563",
        tertiary: "#9CA3AF",
        light: "#FFFFFF",
    },
    primary: {
        main: "#3B82F6",
        light: "#EFF6FF",
        medium: "#DBEAFE",
        dark: "#1D4ED8",
    },
    accent: "#EF4444",
    border: {
        light: "#F3F4F6",
        medium: "#E5E7EB",
    },
    status: {
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
    },
    map: {
        route: "#3B82F6",
        active: "#10B981",
        highlight: "#8B5CF6",
        userLocation: "#3B82F6",
    },
    routeType: {
        community: "#8B5CF6",
        field: "#10B981",
        system: "#3B82F6",
    },
};

// Helper functions
const normalizeCoordinates = (coords) => {
    if (!coords || !Array.isArray(coords)) return [];

    const normalized = [];
    for (const coord of coords) {
        if (!Array.isArray(coord) || coord.length < 2) continue;

        const [longitude, latitude] = coord;

        if (typeof latitude !== 'number' || typeof longitude !== 'number') continue;

        if (latitude < 4 || latitude > 21 || longitude < 116 || longitude > 127) continue;

        normalized.push({ latitude, longitude });
    }
    return normalized;
};

const calculateRegion = (coordinates, includeUserLocation = null, padding = 0.05) => {
    if (!coordinates || coordinates.length === 0) {
        return {
            latitude: 14.5995,
            longitude: 120.9842,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
        };
    }

    let allCoords = [...coordinates];
    if (includeUserLocation) {
        allCoords.push(includeUserLocation);
    }

    let minLat = allCoords[0].latitude;
    let maxLat = allCoords[0].latitude;
    let minLng = allCoords[0].longitude;
    let maxLng = allCoords[0].longitude;

    for (const coord of allCoords) {
        if (coord.latitude < minLat) minLat = coord.latitude;
        if (coord.latitude > maxLat) maxLat = coord.latitude;
        if (coord.longitude < minLng) minLng = coord.longitude;
        if (coord.longitude > maxLng) maxLng = coord.longitude;
    }

    const latitude = (minLat + maxLat) / 2;
    const longitude = (minLng + maxLng) / 2;
    const latitudeDelta = (maxLat - minLat) * (1 + padding);
    const longitudeDelta = (maxLng - minLng) * (1 + padding);
    const minDelta = 0.01;

    return {
        latitude,
        longitude,
        latitudeDelta: Math.max(latitudeDelta, minDelta),
        longitudeDelta: Math.max(longitudeDelta, minDelta),
    };
};

const extractRouteName = (routeCode, originType) => {
    if (!routeCode) return 'Jeepney Route';
    const originTypes = {
        community: 'Community',
        field: 'Field',
        system: 'System'
    };
    return `${routeCode}`;
};

const extractCoordinates = (geometry) => {
    if (!geometry) return [];
    try {
        const parsed = typeof geometry === 'string' ? JSON.parse(geometry) : geometry;
        return parsed?.coordinates || [];
    } catch (e) {
        return [];
    }
};

const calculateFare = (lengthMeters) => {
    if (!lengthMeters) return '₱12-15';
    const lengthKm = lengthMeters / 1000;
    const baseFare = 12;
    const ratePerKm = 2;
    const freeKm = 5;

    let fare = baseFare;
    if (lengthKm > freeKm) {
        fare += Math.ceil((lengthKm - freeKm) * ratePerKm);
    }

    const minFare = Math.max(12, fare - 3);
    const maxFare = fare + 3;
    return `₱${minFare}-${maxFare}`;
};

const calculateTravelTime = (lengthMeters) => {
    if (!lengthMeters) return '45-60 min';
    const lengthKm = lengthMeters / 1000;
    const estimatedMinutes = Math.round((lengthKm / 20) * 60);
    const minTime = Math.max(15, estimatedMinutes - 15);
    const maxTime = estimatedMinutes + 15;
    return `${minTime}-${maxTime} min`;
};

// Calculate route segments for arrow markers
const calculateRouteSegments = (coordinates, segmentLength = 0.1) => {
    if (!coordinates || coordinates.length < 2) return [];

    const segments = [];
    for (let i = 0; i < coordinates.length - 1; i += 2) {
        segments.push({
            start: coordinates[i],
            end: coordinates[i + 1],
            index: i
        });
    }
    return segments.slice(-3); // Only show arrows at the end of route
};

// State reducer
const initialState = {
    routes: [],
    loading: true,
    refreshing: false,
    userLocation: null,
    activeRoute: null,
    mapRegion: null,
    regionMap: new Map(),
    initialRegionSet: false,
    bottomSheetExpanded: false,
};

function reducer(state, action) {
    switch (action.type) {
        case 'SET_ROUTES':
            return { ...state, routes: action.payload };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_REFRESHING':
            return { ...state, refreshing: action.payload };
        case 'SET_USER_LOCATION':
            return { ...state, userLocation: action.payload };
        case 'SET_ACTIVE_ROUTE':
            return { ...state, activeRoute: action.payload };
        case 'SET_MAP_REGION':
            return { ...state, mapRegion: action.payload, initialRegionSet: true };
        case 'SET_REGION_MAP':
            return { ...state, regionMap: action.payload };
        case 'SET_BOTTOM_SHEET_EXPANDED':
            return { ...state, bottomSheetExpanded: action.payload };
        default:
            return state;
    }
}

// Optimized custom hooks
const useLocation = () => {
    const [userLocation, setUserLocation] = useState(null);
    const isMounted = useRef(true);
    const locationSubscription = useRef(null);

    useEffect(() => {
        return () => {
            isMounted.current = false;
            if (locationSubscription.current) {
                locationSubscription.current.remove();
                locationSubscription.current = null;
            }
        };
    }, []);

    const initialize = useCallback(async () => {
        try {
            const { status } = await requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const location = await getCurrentPositionAsync({
                accuracy: Accuracy.Balanced,
            });

            if (isMounted.current) {
                const userCoords = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                };
                setUserLocation(userCoords);
            }

            const sub = await watchPositionAsync(
                {
                    accuracy: Accuracy.Low,
                    timeInterval: 60000,
                    distanceInterval: 100,
                },
                (newLocation) => {
                    if (isMounted.current) {
                        setUserLocation(newLocation.coords);
                    }
                }
            );

            locationSubscription.current = sub;
        } catch (error) {
            console.warn('Location error:', error);
        }
    }, []);

    return { userLocation, initialize };
};

const useRouteData = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [isOffline, setIsOffline] = useState(false);

    // Animation refs
    const bottomSheetHeight = useRef(new Animated.Value(0.2 * height)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Memoized refs
    const mapRef = useRef(null);
    const bottomSheetRef = useRef(null);
    const isMounted = useRef(true);
    const loadingRef = useRef(false);

    // Custom hooks
    const { userLocation, initialize: initializeLocation } = useLocation();

    // Network listener
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const newOfflineStatus = !(state.isConnected && state.isInternetReachable);
            setIsOffline(newOfflineStatus);
        });

        return () => unsubscribe();
    }, []);

    // Update user location in state
    useEffect(() => {
        if (userLocation && isMounted.current) {
            dispatch({ type: 'SET_USER_LOCATION', payload: userLocation });
        }
    }, [userLocation]);

    // Cleanup
    useEffect(() => {
        return () => {
            isMounted.current = false;
            loadingRef.current = false;
        };
    }, []);

    // Load region names
    const loadRegions = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('regions')
                .select('region_id, name, code')
                .eq('is_active', true);

            if (error) throw error;

            const regionMap = new Map();
            data.forEach(region => {
                regionMap.set(region.region_id, region.name || region.code);
            });

            dispatch({ type: 'SET_REGION_MAP', payload: regionMap });
            return regionMap;
        } catch (error) {
            console.warn('Failed to load regions:', error);
            return new Map();
        }
    }, []);

    // Set initial map region
    const setInitialMapRegion = useCallback((routes) => {
        if (!routes || routes.length === 0) {
            dispatch({
                type: 'SET_MAP_REGION',
                payload: {
                    latitude: 12.8797,
                    longitude: 121.7740,
                    latitudeDelta: 5,
                    longitudeDelta: 5,
                }
            });
            return;
        }

        const allCoordinates = [];
        routes.forEach(route => {
            if (route.normalizedPoints && route.normalizedPoints.length > 0) {
                allCoordinates.push(...route.normalizedPoints);
            }
        });

        if (allCoordinates.length === 0) {
            dispatch({
                type: 'SET_MAP_REGION',
                payload: {
                    latitude: 12.8797,
                    longitude: 121.7740,
                    latitudeDelta: 5,
                    longitudeDelta: 5,
                }
            });
            return;
        }

        const region = calculateRegion(allCoordinates, null, 0.1);
        dispatch({ type: 'SET_MAP_REGION', payload: region });
    }, []);

    // Load routes with cancellation
    const loadRoutes = useCallback(async (showLoading = true) => {
        if (loadingRef.current) return;

        loadingRef.current = true;

        if (showLoading) {
            dispatch({ type: 'SET_LOADING', payload: true });
        }

        try {
            const netInfoState = await NetInfo.fetch();
            if (!(netInfoState.isConnected && netInfoState.isInternetReachable)) {
                throw new Error('Network Error: No internet connection');
            }

            const regionMap = await loadRegions();

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
                    length_meters,
                    region_id,
                    passenger_usage_score,
                    data_confidence_score,
                    field_verification_score,
                    driver_adoption_score,
                    credit_status,
                    created_at
                `)
                .is('deleted_at', null)
                .neq('status', 'deprecated')
                .order('passenger_usage_score', { ascending: false })
                .limit(10);

            if (error) throw error;

            if (!data || data.length === 0) {
                dispatch({ type: 'SET_ROUTES', payload: [] });
                setInitialMapRegion([]);
                return;
            }

            const transformedRoutes = data.map(route => {
                const rawCoords = extractCoordinates(route.geometry);
                const normalizedPoints = normalizeCoordinates(rawCoords);
                const regionName = route.region_id ? regionMap.get(route.region_id) : 'Unknown';
                const routeSegments = calculateRouteSegments(normalizedPoints);

                return {
                    id: route.id,
                    code: route.route_code || 'N/A',
                    name: extractRouteName(route.route_code, route.origin_type),
                    status: route.status || 'draft',
                    normalizedPoints,
                    routeSegments,
                    originType: route.origin_type,
                    region: regionName,
                    fare: calculateFare(route.length_meters),
                    estimatedTime: calculateTravelTime(route.length_meters),
                    passengers: Math.floor(Math.random() * 20) + 10,
                    rating: (route.passenger_usage_score || 0).toFixed(1),
                    length: route.length_meters ? `${(route.length_meters / 1000).toFixed(1)} km` : 'N/A',
                    confidence: (route.data_confidence_score || 0).toFixed(1),
                    verification: (route.field_verification_score || 0).toFixed(1),
                    adoption: (route.driver_adoption_score || 0).toFixed(1),
                    creditStatus: route.credit_status || 'uncredited',
                    createdAt: route.created_at,
                    hasValidCoordinates: normalizedPoints.length > 0,
                };
            }).filter(route => route !== null);

            if (isMounted.current) {
                dispatch({ type: 'SET_ROUTES', payload: transformedRoutes });

                if (!state.initialRegionSet) {
                    setInitialMapRegion(transformedRoutes);
                }

                if (showLoading) {
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }).start();
                }
            }
        } catch (error) {
            console.error('Error loading routes:', error);

            if (isMounted.current) {
                const mockPoints = normalizeCoordinates([
                    [120.9842, 14.5995], [120.9942, 14.6095], [121.0042, 14.6195],
                    [121.0142, 14.6295], [121.0242, 14.6395]
                ]);

                const mockRoutes = [
                    {
                        id: 'mock-1',
                        code: 'JEEP-001',
                        name: 'JEEP-001',
                        status: 'active',
                        normalizedPoints: mockPoints,
                        routeSegments: calculateRouteSegments(mockPoints),
                        originType: 'system',
                        region: 'Metro Manila',
                        fare: '₱12-15',
                        estimatedTime: '45-60 min',
                        passengers: '20-30',
                        rating: '4.5',
                        length: '5.2 km',
                        confidence: '4.2',
                        verification: '3.8',
                        adoption: '4.0',
                        creditStatus: 'credited',
                        createdAt: new Date().toISOString(),
                        hasValidCoordinates: true,
                    },
                ];

                dispatch({ type: 'SET_ROUTES', payload: mockRoutes });

                if (!state.initialRegionSet) {
                    setInitialMapRegion(mockRoutes);
                }

                if (error.message?.includes('Network Error')) {
                    Alert.alert(
                        'Offline Mode',
                        'Showing demo routes. Connect to internet for live data.',
                        [{ text: 'OK' }]
                    );
                }
            }
        } finally {
            if (isMounted.current) {
                loadingRef.current = false;
                if (showLoading) {
                    dispatch({ type: 'SET_LOADING', payload: false });
                }
                dispatch({ type: 'SET_REFRESHING', payload: false });
            }
        }
    }, [loadRegions, setInitialMapRegion, state.initialRegionSet]);

    // Memoized actions
    const toggleBottomSheet = useCallback(() => {
        const targetHeight = state.bottomSheetExpanded ? 0.2 * height : 0.7 * height;

        Animated.spring(bottomSheetHeight, {
            toValue: targetHeight,
            tension: 200,
            friction: 20,
            useNativeDriver: false,
        }).start();

        dispatch({ type: 'SET_BOTTOM_SHEET_EXPANDED', payload: !state.bottomSheetExpanded });
    }, [state.bottomSheetExpanded]);

    const focusOnRoute = useCallback((route) => {
        if (!route || !route.hasValidCoordinates) {
            Alert.alert('Error', 'This route has no valid location data.');
            return;
        }

        dispatch({ type: 'SET_ACTIVE_ROUTE', payload: route.id });

        if (mapRef.current && route.normalizedPoints && route.normalizedPoints.length > 0) {
            const region = calculateRegion(route.normalizedPoints, null, 0.15);
            mapRef.current.animateToRegion(region, 800);
        }

        // Auto-collapse if expanded
        if (state.bottomSheetExpanded) {
            setTimeout(() => toggleBottomSheet(), 300);
        }
    }, [state.bottomSheetExpanded, toggleBottomSheet]);

    const centerOnUser = useCallback(() => {
        if (state.userLocation && mapRef.current) {
            const region = {
                latitude: state.userLocation.latitude,
                longitude: state.userLocation.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            };
            mapRef.current.animateToRegion(region, 800);
        } else {
            Alert.alert('Location Unavailable', 'Your location is not available. Please enable location services.');
        }
    }, [state.userLocation]);

    const showAllRoutes = useCallback(() => {
        if (state.routes.length > 0 && mapRef.current) {
            const allCoordinates = [];
            state.routes.forEach(route => {
                if (route.normalizedPoints && route.normalizedPoints.length > 0) {
                    allCoordinates.push(...route.normalizedPoints);
                }
            });

            if (allCoordinates.length > 0) {
                const region = calculateRegion(allCoordinates, null, 0.1);
                mapRef.current.animateToRegion(region, 800);
            }
        }
    }, [state.routes]);

    // Load data on focus
    useFocusEffect(
        useCallback(() => {
            if (isMounted.current) {
                initializeLocation();
                loadRoutes(true);
            }

            return () => {
                // Cleanup handled by useLocation hook
            };
        }, [initializeLocation, loadRoutes])
    );

    // Refresh control
    const onRefresh = useCallback(() => {
        dispatch({ type: 'SET_REFRESHING', payload: true });
        loadRoutes(false);
    }, [loadRoutes]);

    return {
        state,
        isOffline,
        mapRef,
        bottomSheetRef,
        bottomSheetHeight,
        fadeAnim,
        toggleBottomSheet,
        focusOnRoute,
        centerOnUser,
        showAllRoutes,
        loadRoutes,
        onRefresh,
    };
};

// Sub-components
const LoadingScreen = React.memo(() => {
    return (
        <View style={styles.loadingContainer}>
            <View style={styles.loadingContent}>
                <MaterialIcons
                    name="directions-bus"
                    size={48}
                    color={COLORS.primary.main}
                    style={styles.loadingIcon}
                />
                <Text style={styles.loadingTitle}>Loading Jeepney Routes</Text>
            </View>
        </View>
    );
});

const OfflineIndicator = React.memo(({ isOffline }) => {
    if (!isOffline) return null;

    return (
        <View style={styles.offlineIndicator}>
            <Feather name="wifi-off" size={14} color={COLORS.text.light} />
            <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
    );
});

const MapControls = React.memo(({ onCenterUser, onShowAllRoutes, userLocation }) => {
    return (
        <View style={styles.mapControls}>
            {userLocation && (
                <TouchableOpacity
                    style={styles.mapControlButton}
                    onPress={onCenterUser}
                    activeOpacity={0.7}
                >
                    <Feather name="navigation" size={20} color={COLORS.primary.main} />
                </TouchableOpacity>
            )}
            <TouchableOpacity
                style={styles.mapControlButton}
                onPress={onShowAllRoutes}
                activeOpacity={0.7}
            >
                <Feather name="map" size={20} color={COLORS.primary.main} />
            </TouchableOpacity>
        </View>
    );
});

const RouteCard = React.memo(({
                                  route,
                                  isActive,
                                  onPress,
                              }) => {
    const getRouteTypeColor = (type) => {
        return COLORS.routeType[type] || COLORS.text.tertiary;
    };

    const getRouteTypeLabel = (type) => {
        return type === 'community' ? 'COM' : type === 'field' ? 'FLD' : 'SYS';
    };

    return (
        <TouchableOpacity
            style={[
                styles.routeCard,
                isActive && styles.routeCardActive
            ]}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <View style={styles.routeCardContent}>
                <View style={styles.routeCardHeader}>
                    <View style={styles.routeCodeContainer}>
                        <Text style={styles.routeCardCode}>{route.code}</Text>
                        <View style={styles.routeTypeTag}>
                            <Text style={[styles.routeTypeText, { color: getRouteTypeColor(route.originType) }]}>
                                {getRouteTypeLabel(route.originType)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.routeDetails}>
                        <View style={styles.detailItem}>
                            <MaterialIcons name="schedule" size={12} color={COLORS.text.tertiary} />
                            <Text style={styles.detailText}>{route.estimatedTime}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <MaterialIcons name="attach-money" size={12} color={COLORS.text.tertiary} />
                            <Text style={styles.detailText}>{route.fare}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.routeCardFooter}>
                    <View style={styles.footerItem}>
                        <MaterialIcons name="star" size={12} color={COLORS.status.warning} />
                        <Text style={styles.footerText}>{route.rating}</Text>
                    </View>
                    <View style={styles.footerItem}>
                        <Feather name="users" size={12} color={COLORS.text.tertiary} />
                        <Text style={styles.footerText}>{route.passengers}</Text>
                    </View>
                    <View style={styles.footerItem}>
                        <Feather name="map-pin" size={12} color={COLORS.text.tertiary} />
                        <Text style={styles.footerText}>{route.region}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
});

const MapRoutes = React.memo(({ routes, activeRoute, mapRef, region, userLocation }) => {
    const renderRouteLines = useCallback(() => {
        return routes.map(route => {
            if (!route.normalizedPoints || route.normalizedPoints.length < 2) {
                return null;
            }

            const isActive = activeRoute === route.id;
            const routeColor = isActive ? COLORS.map.active :
                route.originType === 'community' ? COLORS.routeType.community :
                    route.originType === 'field' ? COLORS.routeType.field :
                        COLORS.map.route;

            return (
                <React.Fragment key={`route-${route.id}`}>
                    {/* Main route line - thicker for active routes */}
                    <Polyline
                        coordinates={route.normalizedPoints}
                        strokeColor={routeColor}
                        strokeWidth={isActive ? 6 : 4}
                        strokeOpacity={isActive ? 1 : 0.9}
                        lineCap="round"
                        lineJoin="round"
                    />

                    {/* Direction arrows along the route */}
                    {route.routeSegments && route.routeSegments.map((segment, index) => {
                        // Calculate arrow position and rotation
                        const lat = (segment.start.latitude + segment.end.latitude) / 2;
                        const lng = (segment.start.longitude + segment.end.longitude) / 2;

                        const deltaY = segment.end.latitude - segment.start.latitude;
                        const deltaX = segment.end.longitude - segment.start.longitude;
                        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

                        return (
                            <Marker
                                key={`arrow-${route.id}-${index}`}
                                coordinate={{ latitude: lat, longitude: lng }}
                                anchor={{ x: 0.5, y: 0.5 }}
                            >
                                <View style={[
                                    styles.directionArrow,
                                    {
                                        transform: [{ rotate: `${angle}deg` }],
                                        borderColor: routeColor,
                                        backgroundColor: isActive ? `${routeColor}20` : '#FFFFFF'
                                    }
                                ]}>
                                    <View style={[
                                        styles.arrowHead,
                                        { backgroundColor: routeColor }
                                    ]} />
                                </View>
                            </Marker>
                        );
                    })}

                    {/* Start and end markers */}
                    {route.normalizedPoints.length > 0 && (
                        <>
                            <Marker
                                coordinate={route.normalizedPoints[0]}
                                anchor={{ x: 0.5, y: 0.5 }}
                            >
                                <View style={[styles.routeEndpoint, { backgroundColor: routeColor }]}>
                                    <Text style={styles.endpointText}>S</Text>
                                </View>
                            </Marker>
                            <Marker
                                coordinate={route.normalizedPoints[route.normalizedPoints.length - 1]}
                                anchor={{ x: 0.5, y: 0.5 }}
                            >
                                <View style={[styles.routeEndpoint, { backgroundColor: routeColor }]}>
                                    <Text style={styles.endpointText}>E</Text>
                                </View>
                            </Marker>
                        </>
                    )}
                </React.Fragment>
            );
        });
    }, [routes, activeRoute]);

    return (
        <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={true}
            showsScale={true}
            showsTraffic={false}
            showsBuildings={true}
            region={region}
            mapPadding={{
                top: 20,
                right: 20,
                bottom: 0.2 * height,
                left: 20
            }}
            minZoomLevel={10}
            maxZoomLevel={18}
        >
            {renderRouteLines()}

            {userLocation && (
                <Marker
                    coordinate={userLocation}
                    anchor={{ x: 0.5, y: 0.5 }}
                >
                    <View style={styles.userLocationMarker}>
                        <View style={styles.userLocationInner} />
                    </View>
                </Marker>
            )}
        </MapView>
    );
});

const EmptyStateComponent = React.memo(({ isOffline, onRetry }) => {
    return (
        <View style={styles.emptyState}>
            <Feather
                name={isOffline ? "wifi-off" : "map"}
                size={40}
                color={COLORS.text.tertiary}
            />
            <Text style={styles.emptyTitle}>
                {isOffline ? 'You\'re Offline' : 'No Routes Available'}
            </Text>
            <Text style={styles.emptyText}>
                {isOffline
                    ? 'Connect to internet to load routes'
                    : 'Routes will appear here when available'
                }
            </Text>
            <TouchableOpacity
                style={styles.retryButton}
                onPress={onRetry}
            >
                <Text style={styles.retryButtonText}>
                    {isOffline ? 'Retry Connection' : 'Refresh Routes'}
                </Text>
            </TouchableOpacity>
        </View>
    );
});

// Main Component
export default function PassengerRoutes() {
    const {
        state,
        isOffline,
        mapRef,
        bottomSheetRef,
        bottomSheetHeight,
        fadeAnim,
        toggleBottomSheet,
        focusOnRoute,
        centerOnUser,
        showAllRoutes,
        loadRoutes,
        onRefresh,
    } = useRouteData();

    const handleRetryConnection = useCallback(async () => {
        const netInfoState = await NetInfo.fetch();
        const connected = !!(netInfoState.isConnected && netInfoState.isInternetReachable);
        if (connected) {
            loadRoutes(true);
        } else {
            Alert.alert('No Connection', 'Still offline. Check your network settings.');
        }
    }, [loadRoutes]);

    if (state.loading) {
        return <LoadingScreen />;
    }

    return (
        <View style={styles.container}>
            <StatusBar
                barStyle={isOffline ? "light-content" : "dark-content"}
                backgroundColor={isOffline ? COLORS.status.error : "transparent"}
                translucent
            />

            <OfflineIndicator isOffline={isOffline} />

            <MapRoutes
                routes={state.routes}
                activeRoute={state.activeRoute}
                mapRef={mapRef}
                region={state.mapRegion}
                userLocation={state.userLocation}
            />

            <MapControls
                onCenterUser={centerOnUser}
                onShowAllRoutes={showAllRoutes}
                userLocation={state.userLocation}
            />

            <Animated.View
                style={[
                    styles.bottomSheet,
                    { height: bottomSheetHeight }
                ]}
            >
                {/* Sheet Header - Clean toggle button */}
                <TouchableOpacity
                    style={styles.sheetToggle}
                    onPress={toggleBottomSheet}
                    activeOpacity={0.7}
                >
                    <View style={styles.toggleContent}>
                        <View style={styles.toggleIcon}>
                            <Feather
                                name={state.bottomSheetExpanded ? "chevron-down" : "chevron-up"}
                                size={22}
                                color={COLORS.primary.main}
                            />
                        </View>
                        <Text style={styles.toggleText}>
                            {state.bottomSheetExpanded ? 'Hide Routes' : 'Show Routes'}
                        </Text>
                        {!isOffline && state.routes.length > 0 && (
                            <TouchableOpacity
                                style={styles.refreshButton}
                                onPress={onRefresh}
                                disabled={state.refreshing}
                            >
                                <Feather
                                    name="refresh-cw"
                                    size={16}
                                    color={state.refreshing ? COLORS.primary.main : COLORS.text.secondary}
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                </TouchableOpacity>

                <View style={styles.sheetContent}>
                    <ScrollView
                        ref={bottomSheetRef}
                        style={styles.routesList}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.routesListContent}
                        scrollEventThrottle={16}
                        refreshControl={
                            !isOffline && (
                                <RefreshControl
                                    refreshing={state.refreshing}
                                    onRefresh={onRefresh}
                                    colors={[COLORS.primary.main]}
                                    tintColor={COLORS.primary.main}
                                />
                            )
                        }
                    >
                        {state.routes.length === 0 ? (
                            <EmptyStateComponent
                                isOffline={isOffline}
                                onRetry={handleRetryConnection}
                            />
                        ) : (
                            <Animated.View style={{ opacity: fadeAnim }}>
                                {state.routes.map((route) => (
                                    <RouteCard
                                        key={route.id}
                                        route={route}
                                        isActive={state.activeRoute === route.id}
                                        onPress={() => focusOnRoute(route)}
                                    />
                                ))}
                            </Animated.View>
                        )}
                    </ScrollView>
                </View>
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
        marginBottom: 20,
        opacity: 0.9,
    },
    loadingTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text.primary,
    },
    // Offline Indicator
    offlineIndicator: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 20,
        backgroundColor: COLORS.status.error,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        zIndex: 101,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    offlineText: {
        color: COLORS.text.light,
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6,
    },
    // Map Controls
    mapControls: {
        position: 'absolute',
        bottom: 0.25 * height,
        right: 16,
        zIndex: 99,
        gap: 12,
    },
    mapControlButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: COLORS.border.light,
    },
    // Map Elements
    userLocationMarker: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.map.userLocation,
    },
    userLocationInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.map.userLocation,
    },
    directionArrow: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    arrowHead: {
        width: 12,
        height: 12,
        borderRadius: 2,
        transform: [{ rotate: '45deg' }],
    },
    routeEndpoint: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    endpointText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    // Bottom Sheet
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 8,
        zIndex: 95,
        overflow: 'hidden',
    },
    sheetToggle: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border.light,
        backgroundColor: COLORS.surface,
    },
    toggleContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary.light,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    toggleText: {
        fontSize: 16,
        color: COLORS.text.primary,
        fontWeight: '600',
        flex: 1,
    },
    refreshButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary.light,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetContent: {
        flex: 1,
    },
    routesList: {
        flex: 1,
    },
    routesListContent: {
        paddingBottom: 40,
    },
    // Route Card - Smooth tab design without dividers
    routeCard: {
        backgroundColor: COLORS.surface,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: COLORS.border.light,
    },
    routeCardActive: {
        backgroundColor: COLORS.primary.light,
        borderColor: COLORS.primary.main,
        shadowColor: COLORS.primary.main,
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    routeCardContent: {
        gap: 12,
    },
    routeCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    routeCodeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    routeCardCode: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text.primary,
    },
    routeTypeTag: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: COLORS.border.light,
    },
    routeTypeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    routeDetails: {
        flexDirection: 'row',
        gap: 16,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        fontSize: 13,
        color: COLORS.text.secondary,
        fontWeight: '500',
    },
    routeCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footerText: {
        fontSize: 13,
        color: COLORS.text.tertiary,
        fontWeight: '500',
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text.primary,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: COLORS.primary.light,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
    },
    retryButtonText: {
        color: COLORS.primary.main,
        fontWeight: '600',
        fontSize: 14,
    },
});