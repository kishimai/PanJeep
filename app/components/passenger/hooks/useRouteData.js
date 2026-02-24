import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { Alert, Animated } from 'react-native';
import { getCurrentPositionAsync, requestForegroundPermissionsAsync, watchPositionAsync, Accuracy } from 'expo-location';
import { supabase } from '../../../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import { SCREEN_HEIGHT, DEFAULT_REGION } from '../constants';
import {
    extractCoordinates,
    normalizeCoordinates,
    calculateRegion,
    calculateFare,
    calculateTravelTime,
    calculateRouteSegments,
} from '../utils';

// ---------- INITIAL STATE ----------
const initialState = {
    routes: [],
    pois: [],                // <-- new
    loading: true,
    refreshing: false,
    userLocation: null,
    activeRoute: null,
    mapRegion: null,
    regionMap: new Map(),
    initialRegionSet: false,
    bottomSheetExpanded: false,
};

// ---------- REDUCER ----------
function reducer(state, action) {
    switch (action.type) {
        case 'SET_ROUTES':
            return { ...state, routes: action.payload };
        case 'SET_POIS':                     // <-- new
            return { ...state, pois: action.payload };
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

// ---------- CUSTOM HOOK ----------
export const useRouteData = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [isOffline, setIsOffline] = useState(false);

    // Animation refs
    const bottomSheetHeight = useRef(new Animated.Value(0.2 * SCREEN_HEIGHT)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Refs
    const mapRef = useRef(null);
    const bottomSheetRef = useRef(null);
    const isMounted = useRef(true);
    const loadingRef = useRef(false);
    const locationSubscription = useRef(null);

    // ---------- LOCATION ----------
    useEffect(() => {
        return () => {
            isMounted.current = false;
            if (locationSubscription.current) {
                locationSubscription.current.remove();
                locationSubscription.current = null;
            }
        };
    }, []);

    const initializeLocation = useCallback(async () => {
        try {
            const { status } = await requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const location = await getCurrentPositionAsync({ accuracy: Accuracy.Balanced });
            if (isMounted.current) {
                dispatch({
                    type: 'SET_USER_LOCATION',
                    payload: {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    }
                });
            }

            const sub = await watchPositionAsync(
                { accuracy: Accuracy.Low, timeInterval: 60000, distanceInterval: 100 },
                (newLocation) => {
                    if (isMounted.current) {
                        dispatch({
                            type: 'SET_USER_LOCATION',
                            payload: {
                                latitude: newLocation.coords.latitude,
                                longitude: newLocation.coords.longitude,
                            }
                        });
                    }
                }
            );
            locationSubscription.current = sub;
        } catch (error) {
            console.warn('Location error:', error);
        }
    }, []);

    // ---------- NETWORK ----------
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOffline(!(state.isConnected && state.isInternetReachable));
        });
        return () => unsubscribe();
    }, []);

    // ---------- REGIONS ----------
    const loadRegions = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('regions')
                .select('region_id, name, code')
                .eq('is_active', true);
            if (error) throw error;
            const regionMap = new Map();
            data.forEach(region => regionMap.set(region.region_id, region.name || region.code));
            dispatch({ type: 'SET_REGION_MAP', payload: regionMap });
            return regionMap;
        } catch (error) {
            console.warn('Failed to load regions:', error);
            return new Map();
        }
    }, []);

    // ---------- MAP REGION ----------
    const setInitialMapRegion = useCallback((routes) => {
        if (!routes || routes.length === 0) {
            dispatch({ type: 'SET_MAP_REGION', payload: DEFAULT_REGION });
            return;
        }
        const allCoordinates = routes.flatMap(r => r.normalizedPoints || []);
        const region = allCoordinates.length
            ? calculateRegion(allCoordinates, null, 0.1)
            : DEFAULT_REGION;
        dispatch({ type: 'SET_MAP_REGION', payload: region });
    }, []);

    // ---------- LOAD POIs ----------
    const loadPOIs = useCallback(async () => {
        if (isOffline) return;

        try {
            const { data, error } = await supabase
                .from('points_of_interest')
                .select('id, type, name, geometry, metadata, region_id')
                .limit(500); // prevent map overcrowding

            if (error) throw error;

            const transformedPOIs = (data || [])
                .map(poi => {
                    if (!poi.geometry) return null;

                    const geom = typeof poi.geometry === 'string'
                        ? JSON.parse(poi.geometry)
                        : poi.geometry;

                    // Expect a Point geometry with [lng, lat] coordinates
                    if (geom.type === 'Point' && Array.isArray(geom.coordinates) && geom.coordinates.length >= 2) {
                        return {
                            id: poi.id,
                            type: poi.type,
                            name: poi.name,
                            coordinate: {
                                longitude: geom.coordinates[0],
                                latitude: geom.coordinates[1],
                            },
                            metadata: poi.metadata,
                            region_id: poi.region_id,
                        };
                    }
                    return null;
                })
                .filter(p => p !== null);

            if (isMounted.current) {
                dispatch({ type: 'SET_POIS', payload: transformedPOIs });
            }
        } catch (error) {
            console.warn('Failed to load POIs:', error);
        }
    }, [isOffline]);

    // ---------- LOAD ROUTES ----------
    const loadRoutes = useCallback(async (showLoading = true) => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        if (showLoading) dispatch({ type: 'SET_LOADING', payload: true });

        try {
            const regionMap = await loadRegions();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) await supabase.auth.signInAnonymously();

            const { data, error } = await supabase
                .from('routes')
                .select(`
                    id, route_code, origin_type, status, geometry, length_meters, region_id,
                    passenger_usage_score, data_confidence_score, field_verification_score,
                    driver_adoption_score, credit_status, created_at
                `)
                .is('deleted_at', null)
                .neq('status', 'deprecated')
                .order('passenger_usage_score', { ascending: false })
                .limit(10);

            if (error) throw error;

            const transformedRoutes = (data || []).map(route => {
                const rawCoords = extractCoordinates(route.geometry);
                const normalizedPoints = normalizeCoordinates(rawCoords);
                return {
                    id: route.id,
                    code: route.route_code || 'N/A',
                    name: route.route_code || 'Jeepney Route',
                    status: route.status || 'draft',
                    normalizedPoints,
                    routeSegments: calculateRouteSegments(normalizedPoints),
                    originType: route.origin_type,
                    region: route.region_id ? regionMap.get(route.region_id) : 'Unknown',
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
            }).filter(r => r !== null);

            if (isMounted.current) {
                dispatch({ type: 'SET_ROUTES', payload: transformedRoutes });
                if (!state.initialRegionSet) setInitialMapRegion(transformedRoutes);
                if (showLoading) {
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }).start();
                }
                // Load POIs after routes
                loadPOIs();
            }
        } catch (error) {
            console.error('Error loading routes:', error);

            // Mock fallback for network errors
            if (isMounted.current) {
                const mockPoints = normalizeCoordinates([
                    [120.9842, 14.5995], [120.9942, 14.6095], [121.0042, 14.6195],
                    [121.0142, 14.6295], [121.0242, 14.6395]
                ]);
                const mockRoutes = [{
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
                }];

                // Mock POIs
                const mockPOIs = [
                    {
                        id: 'poi-1',
                        type: 'terminal',
                        name: 'Terminal A',
                        coordinate: { latitude: 14.5995, longitude: 120.9842 },
                    },
                    {
                        id: 'poi-2',
                        type: 'stop',
                        name: 'Bus Stop',
                        coordinate: { latitude: 14.6095, longitude: 120.9942 },
                    },
                ];

                dispatch({ type: 'SET_ROUTES', payload: mockRoutes });
                dispatch({ type: 'SET_POIS', payload: mockPOIs });
                if (!state.initialRegionSet) setInitialMapRegion(mockRoutes);
            }
        } finally {
            if (isMounted.current) {
                loadingRef.current = false;
                if (showLoading) dispatch({ type: 'SET_LOADING', payload: false });
                dispatch({ type: 'SET_REFRESHING', payload: false });
            }
        }
    }, [loadRegions, setInitialMapRegion, state.initialRegionSet, loadPOIs]);

    // ---------- ACTIONS ----------
    const toggleBottomSheet = useCallback(() => {
        const targetHeight = state.bottomSheetExpanded ? 0.2 * SCREEN_HEIGHT : 0.7 * SCREEN_HEIGHT;
        Animated.spring(bottomSheetHeight, {
            toValue: targetHeight,
            tension: 200,
            friction: 20,
            useNativeDriver: false,
        }).start();
        dispatch({ type: 'SET_BOTTOM_SHEET_EXPANDED', payload: !state.bottomSheetExpanded });
    }, [state.bottomSheetExpanded, bottomSheetHeight]);

    const focusOnRoute = useCallback((route) => {
        if (!route?.hasValidCoordinates) {
            Alert.alert('Cannot focus route', `Route ${route?.code || 'unknown'} has no valid location data.`);
            return;
        }
        dispatch({ type: 'SET_ACTIVE_ROUTE', payload: route.id });
        if (mapRef.current && route.normalizedPoints?.length) {
            const region = calculateRegion(route.normalizedPoints, null, 0.15);
            mapRef.current.animateToRegion(region, 800);
        }
        if (state.bottomSheetExpanded) {
            setTimeout(() => toggleBottomSheet(), 300);
        }
    }, [state.bottomSheetExpanded, toggleBottomSheet]);

    const centerOnUser = useCallback(() => {
        if (state.userLocation && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: state.userLocation.latitude,
                longitude: state.userLocation.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            }, 800);
        } else {
            Alert.alert('Location Unavailable', 'Please enable location services.');
        }
    }, [state.userLocation]);

    const onRefresh = useCallback(() => {
        dispatch({ type: 'SET_REFRESHING', payload: true });
        loadRoutes(false);
    }, [loadRoutes]);

    // ---------- FOCUS EFFECT ----------
    useFocusEffect(
        useCallback(() => {
            if (isMounted.current) {
                initializeLocation();
                loadRoutes(true);
            }
        }, [initializeLocation, loadRoutes])
    );

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
        onRefresh,
        loadRoutes,
    };
};