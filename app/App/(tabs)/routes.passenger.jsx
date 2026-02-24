import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Platform,
    Animated,
    RefreshControl,
    TextInput,
    Alert,
    ActivityIndicator,
    LayoutAnimation,
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';

import { COLORS, SCREEN_HEIGHT } from '../../components/passenger/constants';
import { useRouteData } from '../../components/passenger/hooks/useRouteData';
import { supabase } from '../../lib/supabase';

// ---------- CUSTOM MAP STYLE ----------
const reducedMapStyle = [
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'on' }] }
];

// ---------- MAPBOX WALKING API ----------
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

const fetchWalkingRoute = async (startLat, startLng, endLat, endLng) => {
    console.log(`[fetchWalkingRoute] Requesting walking route from (${startLat},${startLng}) to (${endLat},${endLng})`);
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${startLng},${startLat};${endLng},${endLat}?geometries=polyline&access_token=${MAPBOX_ACCESS_TOKEN}`;
    try {
        const response = await fetch(url);
        const json = await response.json();
        if (json.code !== 'Ok' || !json.routes?.length) {
            throw new Error(json.code || 'Unknown error');
        }
        const points = json.routes[0].geometry;
        return decodePolyline(points);
    } catch (err) {
        console.error('[fetchWalkingRoute] Error:', err);
        return null;
    }
};

const decodePolyline = (encoded) => {
    let points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
        lat += dlat;
        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
        lng += dlng;
        points.push({ latitude: lat * 1e-5, longitude: lng * 1e-5 });
    }
    return points;
};

// ---------- UTILITY ----------
const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// ---------- ROUTE HELPERS ----------
const getDistanceToRoute = (point, routePoints) => {
    if (!routePoints || routePoints.length < 2) return Infinity;
    let minDist = Infinity;
    for (let i = 0; i < routePoints.length - 1; i++) {
        const d = distancePointToSegment(point, routePoints[i], routePoints[i + 1]);
        if (d < minDist) minDist = d;
    }
    return minDist;
};

const distancePointToSegment = (p, a, b) => {
    const { x: px, y: py } = { x: p.longitude, y: p.latitude };
    const { x: ax, y: ay } = { x: a.longitude, y: a.latitude };
    const { x: bx, y: by } = { x: b.longitude, y: b.latitude };

    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;

    const t = (apx * abx + apy * aby) / (abx * abx + aby * aby || 1);
    const tClamped = Math.max(0, Math.min(1, t));

    const nearestX = ax + tClamped * abx;
    const nearestY = ay + tClamped * aby;

    return haversineDistance(p.latitude, p.longitude, nearestY, nearestX);
};

const findNearestStopIndex = (point, stops) => {
    let minDist = Infinity;
    let minIndex = -1;
    stops.forEach((stop, idx) => {
        const dist = haversineDistance(point.latitude, point.longitude, stop.latitude, stop.longitude);
        if (dist < minDist) {
            minDist = dist;
            minIndex = idx;
        }
    });
    console.log(`[findNearestStopIndex] Min distance: ${minDist}m, index: ${minIndex}`);
    return minIndex;
};

const estimateRideDistance = (stops, startIdx, endIdx) => {
    let total = 0;
    for (let i = startIdx; i < endIdx; i++) {
        total += haversineDistance(stops[i].latitude, stops[i].longitude, stops[i + 1].latitude, stops[i + 1].longitude);
    }
    return total;
};

const createSyntheticStops = (route) => {
    if (!route.normalizedPoints || route.normalizedPoints.length === 0) return [];
    return route.normalizedPoints.map((point, idx) => ({
        id: `${route.id}-point-${idx}`,
        name: `Point ${idx + 1}`,
        latitude: point.latitude,
        longitude: point.longitude,
    }));
};

// ---------- SUB-COMPONENTS ----------
const LoadingScreen = React.memo(() => (
    <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
            <MaterialIcons name="directions-bus" size={48} color={COLORS.primary.main} />
            <Text style={styles.loadingTitle}>Loading Jeepney Routes</Text>
        </View>
    </View>
));

const OfflineIndicator = React.memo(({ isOffline }) => {
    if (!isOffline) return null;
    return (
        <View style={styles.offlineIndicator}>
            <Feather name="wifi-off" size={14} color={COLORS.text.light} />
            <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
    );
});

const RouteCard = React.memo(({ route, isActive, onPress }) => {
    const getRouteTypeColor = useCallback((type) => COLORS.routeType[type] || COLORS.text.tertiary, []);
    const getRouteTypeLabel = useCallback((type) => type === 'community' ? 'COM' : type === 'field' ? 'FLD' : 'SYS', []);
    return (
        <TouchableOpacity style={[styles.routeCard, isActive && styles.routeCardActive]} onPress={onPress} activeOpacity={0.9}>
            <View style={styles.routeCardContent}>
                <View style={styles.routeCardHeader}>
                    <View style={styles.routeCodeContainer}>
                        {/* Route color dot */}
                        <View style={[styles.routeColorDot, { backgroundColor: route.route_color || '#0066CC' }]} />
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

// MapRoutes – draws route segments (with glow) and walking circles
const MapRoutes = React.memo(({
                                  routes,
                                  activeRoute,
                                  directionsSegments,
                                  pois,
                                  mapRef,
                                  region,
                                  userLocation,
                                  selectedLocation,
                                  walkingPaths,
                                  hideRoutes = false,
                                  markerOpacity,
                                  hidePois = false,
                                  onRegionChangeComplete
                              }) => {
    const routeLines = useMemo(() => {
        const polylines = [];
        const routesToShow = hideRoutes
            ? routes.filter(r => directionsSegments?.some(ds => ds.routeId === r.id))
            : routes;

        routesToShow.forEach(route => {
            if (!route.normalizedPoints?.length) return;

            if (hideRoutes && directionsSegments) {
                directionsSegments
                    .filter(ds => ds.routeId === route.id)
                    .forEach((ds, idx) => {
                        const { startIndex, endIndex } = ds;
                        if (startIndex >= 0 && endIndex < route.normalizedPoints.length && startIndex < endIndex) {
                            const coordinates = route.normalizedPoints.slice(startIndex, endIndex + 1);
                            const routeColor = route.route_color || COLORS.map.active;

                            polylines.push(
                                <Polyline
                                    key={`route-${route.id}-${idx}-glow`}
                                    coordinates={coordinates}
                                    strokeColor={routeColor}
                                    strokeWidth={10}
                                    strokeOpacity={0.3}
                                    lineCap="round"
                                    lineJoin="round"
                                    zIndex={5}
                                />
                            );
                            polylines.push(
                                <Polyline
                                    key={`route-${route.id}-${idx}`}
                                    coordinates={coordinates}
                                    strokeColor={routeColor}
                                    strokeWidth={6}
                                    strokeOpacity={1}
                                    lineCap="round"
                                    lineJoin="round"
                                    zIndex={6}
                                />
                            );
                        }
                    });
            } else {
                const isActive = activeRoute === route.id;
                const routeColor = route.route_color || (isActive ? COLORS.map.active : COLORS.map.route);

                if (isActive) {
                    polylines.push(
                        <Polyline
                            key={`route-${route.id}-glow`}
                            coordinates={route.normalizedPoints}
                            strokeColor={routeColor}
                            strokeWidth={10}
                            strokeOpacity={0.3}
                            lineCap="round"
                            lineJoin="round"
                            zIndex={5}
                        />
                    );
                }
                polylines.push(
                    <Polyline
                        key={`route-${route.id}`}
                        coordinates={route.normalizedPoints}
                        strokeColor={routeColor}
                        strokeWidth={isActive ? 6 : 4}
                        strokeOpacity={isActive ? 1 : 0.9}
                        lineCap="round"
                        lineJoin="round"
                        zIndex={isActive ? 6 : 4}
                    />
                );
            }
        });
        return polylines;
    }, [routes, activeRoute, directionsSegments, hideRoutes]);

    const poiMarkers = useMemo(() => {
        if (hidePois || !pois?.length) return null;
        return pois.map(poi => {
            if (!poi.coordinate) return null;
            let iconName = 'place';
            let backgroundColor = COLORS.primary.main;
            switch (poi.type) {
                case 'terminal': iconName = 'directions-bus'; backgroundColor = '#8B5CF6'; break;
                case 'stop': iconName = 'stop'; backgroundColor = '#10B981'; break;
                case 'landmark': iconName = 'place'; backgroundColor = '#F59E0B'; break;
                case 'hub': iconName = 'hub'; backgroundColor = '#EF4444'; break;
                default: iconName = 'place'; backgroundColor = COLORS.primary.main;
            }
            return (
                <Marker key={`poi-${poi.id}`} coordinate={poi.coordinate} anchor={{ x: 0.5, y: 0.5 }}>
                    <Animated.View style={[styles.poiMarker, { backgroundColor, opacity: markerOpacity }]}>
                        <MaterialIcons name={iconName} size={16} color="#FFFFFF" />
                    </Animated.View>
                </Marker>
            );
        });
    }, [pois, hidePois, markerOpacity]);

    const walkingCircles = useMemo(() => {
        if (!walkingPaths?.length) return null;
        const circles = [];
        walkingPaths.forEach((path, pathIdx) => {
            if (!path || path.length < 2) return;
            const targetCount = 30;
            const interval = Math.max(1, Math.floor(path.length / targetCount));
            for (let i = 0; i < path.length; i += interval) {
                circles.push(
                    <Marker key={`walk-${pathIdx}-${i}`} coordinate={path[i]} anchor={{ x: 0.5, y: 0.5 }} zIndex={20}>
                        <View style={styles.walkingCircle} />
                    </Marker>
                );
            }
            circles.push(
                <Marker key={`walk-${pathIdx}-last`} coordinate={path[path.length - 1]} anchor={{ x: 0.5, y: 0.5 }} zIndex={20}>
                    <View style={styles.walkingCircle} />
                </Marker>
            );
        });
        return circles;
    }, [walkingPaths]);

    return (
        <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass
            showsScale
            showsTraffic={false}
            showsBuildings={false}
            showsPointsOfInterest={false}
            showsIndoors={false}
            region={region}
            mapPadding={{ top: 20, right: 20, bottom: 0.2 * SCREEN_HEIGHT, left: 20 }}
            minZoomLevel={10}
            maxZoomLevel={18}
            rotateEnabled={false}
            customMapStyle={reducedMapStyle}
            onRegionChangeComplete={onRegionChangeComplete}
        >
            {routeLines}
            {poiMarkers}
            {userLocation && (
                <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }} zIndex={15}>
                    <Animated.View style={[styles.userLocationMarker, { opacity: markerOpacity }]}>
                        <View style={styles.userLocationInner} />
                    </Animated.View>
                </Marker>
            )}
            {selectedLocation && (
                <Marker coordinate={selectedLocation} anchor={{ x: 0.5, y: 0.5 }} zIndex={15}>
                    <Animated.View style={[styles.poiMarker, { backgroundColor: '#EF4444', opacity: markerOpacity }]}>
                        <MaterialIcons name="place" size={16} color="#FFFFFF" />
                    </Animated.View>
                </Marker>
            )}
            {walkingCircles}
        </MapView>
    );
});

const EmptyStateComponent = React.memo(({ isOffline, onRetry }) => (
    <View style={styles.emptyState}>
        <Feather name={isOffline ? "wifi-off" : "map"} size={40} color={COLORS.text.tertiary} />
        <Text style={styles.emptyTitle}>{isOffline ? "You're Offline" : 'No Routes Available'}</Text>
        <Text style={styles.emptyText}>
            {isOffline ? 'Connect to internet to load routes' : 'Routes will appear here when available'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>{isOffline ? 'Retry Connection' : 'Refresh Routes'}</Text>
        </TouchableOpacity>
    </View>
));

const DirectionsHeader = React.memo(({ onBack, startText, endText, onGo, isLoading }) => (
    <View style={styles.directionsHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <View style={styles.directionsCard}>
            <View style={styles.locationRow}>
                <View style={styles.locationItem}>
                    <MaterialIcons name="my-location" size={18} color={COLORS.primary.main} />
                    <Text style={styles.locationText} numberOfLines={1}>{startText || 'Current location'}</Text>
                </View>
                <View style={styles.verticalDivider} />
                <View style={styles.locationItem}>
                    <MaterialIcons name="place" size={18} color={COLORS.status.error} />
                    <Text style={styles.locationText} numberOfLines={1}>{endText || 'Destination'}</Text>
                </View>
            </View>
            <TouchableOpacity style={styles.goButton} onPress={onGo} disabled={isLoading}>
                {isLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.goButtonText}>GO</Text>}
            </TouchableOpacity>
        </View>
    </View>
));

const DirectionStep = React.memo(({ step, index, isLast }) => {
    const distance = step.cost;
    const walkDuration = Math.round(distance / 80);
    const rideDuration = Math.round(step.cost / 250);

    let icon, backgroundColor;
    if (step.type === 'walk') {
        icon = <Feather name="foot" size={20} color={COLORS.primary.main} />;
        backgroundColor = COLORS.primary.light;
    } else if (step.type === 'ride') {
        icon = <MaterialIcons name="directions-bus" size={20} color="#FFFFFF" />;
        backgroundColor = COLORS.success;
    } else {
        icon = <MaterialIcons name="place" size={20} color="#FFFFFF" />;
        backgroundColor = COLORS.warning;
    }

    return (
        <View style={styles.stepContainer}>
            {!isLast && <View style={styles.timelineLine} />}
            <View style={styles.stepRow}>
                <View style={[styles.stepIconContainer, { backgroundColor }]}>{icon}</View>
                <View style={styles.stepContent}>
                    <View style={styles.stepHeader}>
                        <Text style={styles.stepTitle}>{step.description}</Text>
                        {step.type !== 'alight' && (
                            <Text style={styles.stepDuration}>
                                {step.type === 'walk' ? walkDuration : rideDuration} min
                            </Text>
                        )}
                    </View>
                    <View style={styles.stepDetails}>
                        {step.type === 'walk' && (
                            <View style={styles.stepDetailItem}>
                                <Feather name="map-pin" size={14} color={COLORS.text.tertiary} />
                                <Text style={styles.stepDetailText}>{Math.round(distance)} m</Text>
                            </View>
                        )}
                        {step.type === 'ride' && step.routeCode && (
                            <View style={styles.stepDetailItem}>
                                <MaterialIcons name="directions-bus" size={14} color={COLORS.text.tertiary} />
                                <Text style={styles.stepDetailText}>{step.routeCode}</Text>
                            </View>
                        )}
                        {step.type === 'alight' && step.stopName && (
                            <View style={styles.stepDetailItem}>
                                <MaterialIcons name="location-on" size={14} color={COLORS.text.tertiary} />
                                <Text style={styles.stepDetailText}>{step.stopName}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
});

// ---------- MAIN COMPONENT ----------
export default function PassengerRoutes() {
    const navigation = useNavigation();
    const route = useRoute();
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
        onRefresh,
        loadRoutes,
    } = useRouteData();

    const [mode, setMode] = useState('routes');
    const [startText, setStartText] = useState('');
    const [endText, setEndText] = useState('');
    const [walkingPaths, setWalkingPaths] = useState([]);
    const [steps, setSteps] = useState([]);
    const [directionsLoading, setDirectionsLoading] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [userLocationCoords, setUserLocationCoords] = useState(null);
    const [noRouteFound, setNoRouteFound] = useState(false);
    const [pendingDestinationId, setPendingDestinationId] = useState(null);
    const [directionsSegments, setDirectionsSegments] = useState([]);

    const [markerOpacity] = useState(new Animated.Value(1));
    const prevSelectedLocationRef = useRef(null);
    const params = useMemo(() => route.params || {}, [route.params]);

    const updateMarkerOpacity = useCallback((region) => {
        const zoomLevel = Math.log2(360 / region.latitudeDelta);
        const opacity = zoomLevel < 11 ? 0 : Math.min(1, (zoomLevel - 11) / 4);
        Animated.timing(markerOpacity, { toValue: opacity, duration: 200, useNativeDriver: true }).start();
    }, [markerOpacity]);

    useEffect(() => {
        if (params.zoomToLat && params.zoomToLng) {
            const location = {
                latitude: parseFloat(params.zoomToLat),
                longitude: parseFloat(params.zoomToLng),
                name: params.zoomToName,
                id: params.zoomToId,
            };
            setSelectedLocation(location);
            prevSelectedLocationRef.current = location;
            mapRef.current?.animateToRegion({ ...location, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 1000);
        }
        if (params.destinationPoiId) {
            setPendingDestinationId(params.destinationPoiId);
        }
    }, [params]);

    useEffect(() => {
        if (pendingDestinationId && !state.loading && state.routes.length > 0) {
            fetchJeepneyDirections(pendingDestinationId);
            setPendingDestinationId(null);
        }
    }, [pendingDestinationId, state.loading, state.routes]);

    const fetchJeepneyDirections = useCallback(async (poiId) => {
        console.log('[fetchJeepneyDirections] Starting with poiId:', poiId);
        setDirectionsLoading(true);
        setWalkingPaths([]);
        setSteps([]);
        setNoRouteFound(false);
        setDirectionsSegments([]);

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Location required for directions.');
                setDirectionsLoading(false);
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            const userCoord = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            };
            setUserLocationCoords(userCoord);

            const { data: poiData, error } = await supabase
                .from('points_of_interest')
                .select('geometry, name')
                .eq('id', poiId)
                .single();
            if (error || !poiData) {
                Alert.alert('Error', 'Destination not found.');
                setDirectionsLoading(false);
                return;
            }
            const destCoord = {
                latitude: poiData.geometry.coordinates[1],
                longitude: poiData.geometry.coordinates[0],
            };
            const destName = poiData.name || 'Destination';
            setSelectedLocation({ ...destCoord, name: destName });
            setEndText(destName);
            setStartText('Current location');

            const MAX_WALK = 2000; // meters – maximum walking distance to/from a stop or transfer

            // Build candidate stops for user and destination (all routes, but only if walk ≤ MAX_WALK)
            const userStopCandidates = [];
            const destStopCandidates = [];

            for (const route of state.routes) {
                if (!route.normalizedPoints?.length) continue;
                const stops = createSyntheticStops(route);

                // User side
                const userIdx = findNearestStopIndex(userCoord, stops);
                const userWalk = haversineDistance(userCoord.latitude, userCoord.longitude, stops[userIdx].latitude, stops[userIdx].longitude);
                if (userWalk <= MAX_WALK) {
                    userStopCandidates.push({
                        route,
                        stopIndex: userIdx,
                        stopCoord: stops[userIdx],
                        walkDist: userWalk,
                    });
                }

                // Destination side
                const destIdx = findNearestStopIndex(destCoord, stops);
                const destWalk = haversineDistance(destCoord.latitude, destCoord.longitude, stops[destIdx].latitude, stops[destIdx].longitude);
                if (destWalk <= MAX_WALK) {
                    destStopCandidates.push({
                        route,
                        stopIndex: destIdx,
                        stopCoord: stops[destIdx],
                        walkDist: destWalk,
                    });
                }
            }

            const TRANSFER_DIST = 300; // meters – max walk between transfer stops
            const WALK_SPEED = 80;      // m/min (not used in primary selection)
            const JEEPNEY_SPEED = 250;

            // 1. Find best single route (by total walking)
            let bestSingle = null;
            let bestSingleWalk = Infinity;
            let bestSingleRide = Infinity;

            for (const route of state.routes) {
                const stops = createSyntheticStops(route);
                const userIdx = findNearestStopIndex(userCoord, stops);
                const destIdx = findNearestStopIndex(destCoord, stops);
                if (destIdx > userIdx) { // forward direction only
                    const walkTo = haversineDistance(userCoord.latitude, userCoord.longitude, stops[userIdx].latitude, stops[userIdx].longitude);
                    const walkFrom = haversineDistance(destCoord.latitude, destCoord.longitude, stops[destIdx].latitude, stops[destIdx].longitude);
                    const totalWalk = walkTo + walkFrom;
                    if (totalWalk <= MAX_WALK * 2) { // optional: keep within reason
                        const ride = estimateRideDistance(stops, userIdx, destIdx);
                        if (totalWalk < bestSingleWalk || (totalWalk === bestSingleWalk && ride < bestSingleRide)) {
                            bestSingleWalk = totalWalk;
                            bestSingleRide = ride;
                            bestSingle = {
                                route,
                                userStopIndex: userIdx,
                                destStopIndex: destIdx,
                                walkToDist: walkTo,
                                walkFromDist: walkFrom,
                                rideDist: ride,
                                usedStops: stops,
                                boardingStop: stops[userIdx],
                                alightingStop: stops[destIdx],
                            };
                        }
                    }
                }
            }

            // 2. Find best transfer (by total walking)
            let bestTransfer = null;
            let bestTransferWalk = Infinity;
            let bestTransferRide = Infinity;

            for (const u of userStopCandidates) {
                for (const d of destStopCandidates) {
                    if (u.route.id === d.route.id) continue; // already handled by single

                    const stopsA = createSyntheticStops(u.route);
                    const stopsB = createSyntheticStops(d.route);

                    // Search for transfer stop pair: i on route A after boarding, j on route B before destination
                    for (let i = u.stopIndex + 1; i < stopsA.length; i++) {
                        const stopA = stopsA[i];
                        for (let j = 0; j < d.stopIndex; j++) {
                            const stopB = stopsB[j];
                            const transferDist = haversineDistance(stopA.latitude, stopA.longitude, stopB.latitude, stopB.longitude);
                            if (transferDist <= TRANSFER_DIST) {
                                const walk1 = u.walkDist;
                                const ride1 = estimateRideDistance(stopsA, u.stopIndex, i);
                                const walkTransfer = transferDist;
                                const ride2 = estimateRideDistance(stopsB, j, d.stopIndex);
                                const walk2 = d.walkDist;

                                const totalWalk = walk1 + walkTransfer + walk2;
                                const totalRide = ride1 + ride2;

                                if (totalWalk < bestTransferWalk || (totalWalk === bestTransferWalk && totalRide < bestTransferRide)) {
                                    bestTransferWalk = totalWalk;
                                    bestTransferRide = totalRide;
                                    bestTransfer = {
                                        routeA: u.route,
                                        routeB: d.route,
                                        boardStop: u.stopCoord,
                                        transferStopA: stopA,
                                        transferStopB: stopB,
                                        destStop: d.stopCoord,
                                        walk1Dist: walk1,
                                        ride1Dist: ride1,
                                        walkTransferDist: transferDist,
                                        ride2Dist: ride2,
                                        walk2Dist: walk2,
                                        boardIndex: u.stopIndex,
                                        transferIndexA: i,
                                        transferIndexB: j,
                                        destIndex: d.stopIndex,
                                    };
                                }
                            }
                        }
                    }
                }
            }

            // 3. Choose option with least total walking
            if (bestSingle && (!bestTransfer || bestSingleWalk <= bestTransferWalk)) {
                // Use single route
                console.log('[fetchJeepneyDirections] Using single route (walk =', bestSingleWalk.toFixed(0), 'm)');
                const { boardingStop, alightingStop, usedStops, userStopIndex, destStopIndex, walkToDist, walkFromDist, rideDist } = bestSingle;

                const walkTo = await fetchWalkingRoute(
                    userCoord.latitude, userCoord.longitude,
                    boardingStop.latitude, boardingStop.longitude
                ) || [
                    { latitude: userCoord.latitude, longitude: userCoord.longitude },
                    { latitude: boardingStop.latitude, longitude: boardingStop.longitude },
                ];

                const walkFrom = await fetchWalkingRoute(
                    alightingStop.latitude, alightingStop.longitude,
                    destCoord.latitude, destCoord.longitude
                ) || [
                    { latitude: alightingStop.latitude, longitude: alightingStop.longitude },
                    { latitude: destCoord.latitude, longitude: destCoord.longitude },
                ];

                const steps = [
                    { type: 'walk', cost: walkToDist, description: `Walk to ${boardingStop.name}` },
                    { type: 'ride', routeCode: bestSingle.route.code, cost: rideDist, description: `Ride ${bestSingle.route.code}` },
                    { type: 'alight', description: `Get off at ${alightingStop.name}`, stopName: alightingStop.name },
                    { type: 'walk', cost: walkFromDist, description: `Walk to ${destName}` },
                ];

                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setWalkingPaths([walkTo, walkFrom]);
                setSteps(steps);
                setDirectionsSegments([{ routeId: bestSingle.route.id, startIndex: userStopIndex, endIndex: destStopIndex }]);
                setMode('directions');
                setNoRouteFound(false);
                setDirectionsLoading(false);

                const allPoints = [...walkTo, ...walkFrom];
                mapRef.current?.fitToCoordinates(allPoints, { edgePadding: { top: 50, right: 50, bottom: 200, left: 50 }, animated: true });
                if (!state.bottomSheetExpanded) setTimeout(() => toggleBottomSheet(), 500);
                return;
            }

            if (bestTransfer) {
                // Use transfer route
                console.log('[fetchJeepneyDirections] Using transfer route (walk =', bestTransferWalk.toFixed(0), 'm)');
                const walk1 = await fetchWalkingRoute(
                    userCoord.latitude, userCoord.longitude,
                    bestTransfer.boardStop.latitude, bestTransfer.boardStop.longitude
                ) || [
                    { latitude: userCoord.latitude, longitude: userCoord.longitude },
                    { latitude: bestTransfer.boardStop.latitude, longitude: bestTransfer.boardStop.longitude },
                ];

                const walkTransfer = await fetchWalkingRoute(
                    bestTransfer.transferStopA.latitude, bestTransfer.transferStopA.longitude,
                    bestTransfer.transferStopB.latitude, bestTransfer.transferStopB.longitude
                ) || [
                    { latitude: bestTransfer.transferStopA.latitude, longitude: bestTransfer.transferStopA.longitude },
                    { latitude: bestTransfer.transferStopB.latitude, longitude: bestTransfer.transferStopB.longitude },
                ];

                const walk2 = await fetchWalkingRoute(
                    bestTransfer.transferStopB.latitude, bestTransfer.transferStopB.longitude,
                    destCoord.latitude, destCoord.longitude
                ) || [
                    { latitude: bestTransfer.transferStopB.latitude, longitude: bestTransfer.transferStopB.longitude },
                    { latitude: destCoord.latitude, longitude: destCoord.longitude },
                ];

                const steps = [
                    { type: 'walk', cost: bestTransfer.walk1Dist, description: `Walk to ${bestTransfer.boardStop.name || 'boarding point'}` },
                    { type: 'ride', routeCode: bestTransfer.routeA.code, cost: bestTransfer.ride1Dist, description: `Ride ${bestTransfer.routeA.code}` },
                    { type: 'walk', cost: bestTransfer.walkTransferDist, description: 'Walk to transfer stop' },
                    { type: 'ride', routeCode: bestTransfer.routeB.code, cost: bestTransfer.ride2Dist, description: `Ride ${bestTransfer.routeB.code}` },
                    { type: 'walk', cost: bestTransfer.walk2Dist, description: `Walk to ${destName}` },
                ];

                const segments = [
                    { routeId: bestTransfer.routeA.id, startIndex: bestTransfer.boardIndex, endIndex: bestTransfer.transferIndexA },
                    { routeId: bestTransfer.routeB.id, startIndex: bestTransfer.transferIndexB, endIndex: bestTransfer.destIndex },
                ];

                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setWalkingPaths([walk1, walkTransfer, walk2]);
                setSteps(steps);
                setDirectionsSegments(segments);
                setMode('directions');
                setNoRouteFound(false);
                setDirectionsLoading(false);

                const allPoints = [...walk1, ...walkTransfer, ...walk2];
                mapRef.current?.fitToCoordinates(allPoints, { edgePadding: { top: 50, right: 50, bottom: 200, left: 50 }, animated: true });
                if (!state.bottomSheetExpanded) setTimeout(() => toggleBottomSheet(), 500);
                return;
            }

            // No route found
            setNoRouteFound(true);
            setDirectionsLoading(false);
        } catch (err) {
            console.error('[fetchJeepneyDirections] Unhandled error:', err);
            Alert.alert('Error', 'Failed to calculate jeepney route.');
            setDirectionsLoading(false);
        }
    }, [state.routes, mapRef, state.bottomSheetExpanded, toggleBottomSheet]);

    const exitDirectionsMode = useCallback(() => {
        setMode('routes');
        setStartText('');
        setEndText('');
        setWalkingPaths([]);
        setSteps([]);
        setSelectedLocation(null);
        setUserLocationCoords(null);
        setNoRouteFound(false);
        setDirectionsSegments([]);
        prevSelectedLocationRef.current = null;
    }, []);

    const handleRetryConnection = useCallback(() => loadRoutes(true), [loadRoutes]);
    const goHome = useCallback(() => {
        if (mode === 'directions') exitDirectionsMode();
        else navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home');
    }, [mode, exitDirectionsMode, navigation]);

    const memoizedRegion = useMemo(() => state.mapRegion, [state.mapRegion]);
    const shouldHideRoutes = useMemo(() => walkingPaths.length > 0, [walkingPaths]);

    if (state.loading) return <LoadingScreen />;

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isOffline ? "light-content" : "dark-content"}
                       backgroundColor={isOffline ? COLORS.status.error : "transparent"} translucent />
            <OfflineIndicator isOffline={isOffline} />

            {mode === 'directions' && (
                <DirectionsHeader onBack={exitDirectionsMode} startText={startText} endText={endText}
                                  onGo={() => {}} isLoading={directionsLoading} />
            )}

            <MapRoutes
                routes={state.routes}
                pois={state.pois}
                activeRoute={state.activeRoute}
                directionsSegments={directionsSegments}
                mapRef={mapRef}
                region={memoizedRegion}
                userLocation={userLocationCoords || state.userLocation}
                selectedLocation={selectedLocation}
                walkingPaths={walkingPaths}
                hideRoutes={shouldHideRoutes}
                markerOpacity={markerOpacity}
                hidePois={mode === 'directions'}
                onRegionChangeComplete={updateMarkerOpacity}
            />

            {directionsLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.primary.main} />
                </View>
            )}

            <Animated.View style={[styles.bottomSheet, { height: bottomSheetHeight }]}>
                <TouchableOpacity style={styles.sheetToggle} onPress={toggleBottomSheet} activeOpacity={0.7}>
                    <View style={styles.toggleContent}>
                        <View style={styles.toggleIcon}>
                            <Feather name={state.bottomSheetExpanded ? "chevron-down" : "chevron-up"} size={22} color={COLORS.primary.main} />
                        </View>
                        <Text style={styles.toggleText}>
                            {state.bottomSheetExpanded
                                ? (mode === 'directions' ? 'Hide Steps' : 'Hide Routes')
                                : (mode === 'directions' ? 'Show Steps' : 'Show Routes')}
                        </Text>
                        <View style={styles.headerButtons}>
                            {mode === 'routes' && !isOffline && state.routes.length > 0 && (
                                <TouchableOpacity style={styles.headerButton} onPress={onRefresh} disabled={state.refreshing}>
                                    <Feather name="refresh-cw" size={16} color={state.refreshing ? COLORS.primary.main : COLORS.text.secondary} />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.headerButton} onPress={centerOnUser} disabled={!state.userLocation}>
                                <Feather name="navigation" size={16} color={state.userLocation ? COLORS.text.secondary : COLORS.text.tertiary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.headerButton} onPress={goHome}>
                                <Feather name="home" size={16} color={COLORS.text.secondary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>

                <View style={styles.sheetContent}>
                    <ScrollView
                        ref={bottomSheetRef}
                        style={styles.routesList}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.routesListContent}
                        scrollEventThrottle={16}
                        refreshControl={mode === 'routes' && !isOffline ? (
                            <RefreshControl refreshing={state.refreshing} onRefresh={onRefresh} colors={[COLORS.primary.main]} tintColor={COLORS.primary.main} />
                        ) : undefined}
                    >
                        {mode === 'routes' ? (
                            state.routes.length === 0 ? (
                                <EmptyStateComponent isOffline={isOffline} onRetry={handleRetryConnection} />
                            ) : (
                                <Animated.View style={{ opacity: fadeAnim }}>
                                    {state.routes.map(route => (
                                        <RouteCard key={route.id} route={route} isActive={state.activeRoute === route.id} onPress={() => focusOnRoute(route)} />
                                    ))}
                                </Animated.View>
                            )
                        ) : (
                            steps.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Feather name="map" size={40} color={COLORS.text.tertiary} />
                                    <Text style={styles.emptyTitle}>
                                        {directionsLoading ? 'Calculating...' : (noRouteFound ? 'No direct jeepney route' : 'No route yet')}
                                    </Text>
                                    <Text style={styles.emptyText}>
                                        {directionsLoading ? 'Finding the best jeepney...' : (noRouteFound ? 'Sorry, no route available.' : 'Select a destination.')}
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.stepsContainer}>
                                    {steps.map((step, idx) => (
                                        <DirectionStep key={idx} step={step} index={idx} isLast={idx === steps.length - 1} />
                                    ))}
                                </View>
                            )
                        )}
                    </ScrollView>
                </View>
            </Animated.View>
        </View>
    );
}

// ---------- STYLES ----------
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    map: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    loadingContent: { alignItems: 'center', paddingHorizontal: 40 },
    loadingIcon: { marginBottom: 20, opacity: 0.9 },
    loadingTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary },
    offlineIndicator: {
        position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, right: 20,
        backgroundColor: COLORS.status.error, flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, zIndex: 101,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
    },
    offlineText: { color: COLORS.text.light, fontSize: 12, fontWeight: '600', marginLeft: 6 },
    userLocationMarker: {
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: COLORS.map.userLocation,
    },
    userLocationInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.map.userLocation },
    poiMarker: {
        width: 32, height: 32, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
        borderWidth: 2, borderColor: '#FFFFFF',
    },
    bottomSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 20,
        elevation: 8, zIndex: 95, overflow: 'hidden',
    },
    sheetToggle: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border.light, backgroundColor: COLORS.surface },
    toggleContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    toggleIcon: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: COLORS.primary.light,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    toggleText: { fontSize: 16, color: COLORS.text.primary, fontWeight: '600', flex: 1 },
    headerButtons: { flexDirection: 'row', gap: 8 },
    headerButton: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: COLORS.primary.light,
        justifyContent: 'center', alignItems: 'center',
    },
    sheetContent: { flex: 1 },
    routesList: { flex: 1 },
    routesListContent: { paddingBottom: 40 },
    routeCard: {
        backgroundColor: COLORS.surface, padding: 16, marginHorizontal: 16, marginVertical: 6,
        borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
        borderWidth: 1, borderColor: COLORS.border.light,
    },
    routeCardActive: {
        backgroundColor: COLORS.primary.light, borderColor: COLORS.primary.main,
        shadowColor: COLORS.primary.main, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
    },
    routeCardContent: { gap: 12 },
    routeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    routeCodeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    routeCardCode: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary },
    routeTypeTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: COLORS.border.light },
    routeTypeText: { fontSize: 10, fontWeight: '700' },
    routeDetails: { flexDirection: 'row', gap: 16 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    detailText: { fontSize: 13, color: COLORS.text.secondary, fontWeight: '500' },
    routeCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    footerText: { fontSize: 13, color: COLORS.text.tertiary, fontWeight: '500' },
    // Route color dot style
    routeColorDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 4,
        borderWidth: 1,
        borderColor: COLORS.border.light,
    },
    emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary, marginTop: 16, marginBottom: 8 },
    emptyText: { fontSize: 14, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    retryButton: { backgroundColor: COLORS.primary.light, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    retryButtonText: { color: COLORS.primary.main, fontWeight: '600', fontSize: 14 },
    directionsHeader: {
        position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, left: 20, right: 20,
        flexDirection: 'row', alignItems: 'center', zIndex: 100,
    },
    backButton: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: COLORS.surface,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    },
    directionsCard: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.surface, borderRadius: 30,
        paddingVertical: 6, paddingLeft: 16, paddingRight: 6,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
    },
    locationRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    locationItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
    locationText: { fontSize: 14, color: COLORS.text.primary, fontWeight: '500', flexShrink: 1 },
    verticalDivider: { width: 1, height: 24, backgroundColor: COLORS.border.medium, marginHorizontal: 8 },
    goButton: {
        backgroundColor: COLORS.primary.main, paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 25, justifyContent: 'center', alignItems: 'center', minWidth: 60, marginLeft: 8,
    },
    goButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)',
        justifyContent: 'center', alignItems: 'center', zIndex: 200,
    },
    stepsContainer: { paddingVertical: 16, paddingHorizontal: 16 },
    stepContainer: { position: 'relative', marginLeft: 20, marginBottom: 16 },
    timelineLine: {
        position: 'absolute', left: 20, top: 40, bottom: -16,
        width: 2, backgroundColor: COLORS.border.medium, zIndex: 0,
    },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
    stepIconContainer: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3,
        elevation: 2, zIndex: 2,
    },
    stepContent: { flex: 1, paddingBottom: 16 },
    stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    stepTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary },
    stepDuration: { fontSize: 14, color: COLORS.primary.main, fontWeight: '500' },
    stepDetails: { flexDirection: 'row', gap: 12 },
    stepDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    stepDetailText: { fontSize: 12, color: COLORS.text.secondary },
    walkingCircle: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderWidth: 1, borderColor: 'rgba(200, 225, 255, 0.8)',
        shadowColor: '#A0C0FF', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8, shadowRadius: 4, elevation: 5,
    },
});