import React, { useState, useEffect, useRef } from 'react';
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
    ActivityIndicator,
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { getCurrentPositionAsync, requestForegroundPermissionsAsync } from 'expo-location';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');

export default function PassengerRoutes() {
    const [activeRoute, setActiveRoute] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRouteDetails, setSelectedRouteDetails] = useState(null);

    const mapRef = useRef(null);

    // Fetch routes from your Supabase database
    const fetchRoutes = async () => {
        try {
            setLoading(true);

            // Query routes from your public.routes table
            const { data, error } = await supabase
                .from('routes')
                .select(`
          id,
          route_code,
          status,
          geometry,
          length_meters,
          created_at,
          updated_at,
          region_id,
          regions:region_id (
            name,
            code
          )
        `)
                .is('deleted_at', null) // Only non-deleted routes
                .neq('status', 'deprecated') // Filter out deprecated routes
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform database data to match our app format
            const transformedRoutes = (data || []).map(dbRoute => {
                // Extract coordinates from geometry JSONB column
                const coordinates = dbRoute.geometry?.coordinates || [];

                return {
                    id: dbRoute.id,
                    name: dbRoute.geometry?.properties?.name || dbRoute.route_code,
                    code: dbRoute.route_code,
                    color: '#0066CC', // Default color
                    rawPoints: coordinates, // This is already in [lng, lat] format
                    status: dbRoute.status,
                    estimatedTime: dbRoute.length_meters
                        ? `${Math.round(dbRoute.length_meters / 1000 / 30 * 60)} min`
                        : 'N/A',
                    fare: '₱15', // You might want to add this to your database
                    rating: 4.5, // You might want to add this to your database
                    busNumber: dbRoute.route_code,
                    region: dbRoute.regions?.name || 'No region',
                    passengers: '12/20 seats', // You might want to add this to your database
                    nextStop: 'Next stop', // You might want to add stop data
                };
            });

            setRoutes(transformedRoutes);
        } catch (error) {
            console.error('Error fetching routes:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get user location
    useEffect(() => {
        const init = async () => {
            try {
                const { status } = await requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.log('Location permission denied');
                    return;
                }

                const location = await getCurrentPositionAsync({});
                setUserLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                });
            } catch (error) {
                console.log('Error getting location:', error);
            }
        };

        init();
        fetchRoutes();
    }, []);

    // Center map on user location
    const centerOnUserLocation = () => {
        if (userLocation && mapRef.current) {
            mapRef.current.animateToRegion(userLocation, 1000);
        }
    };

    // Center on selected route
    const centerOnRoute = (route) => {
        if (route.rawPoints && route.rawPoints.length > 0 && mapRef.current) {
            const coordinates = route.rawPoints.map(coord => ({
                latitude: coord[1], // Note: Your DB stores [lng, lat], MapView needs [lat, lng]
                longitude: coord[0],
            }));

            // Calculate bounds
            const minLat = Math.min(...coordinates.map(c => c.latitude));
            const maxLat = Math.max(...coordinates.map(c => c.latitude));
            const minLng = Math.min(...coordinates.map(c => c.longitude));
            const maxLng = Math.max(...coordinates.map(c => c.longitude));

            mapRef.current.fitToCoordinates(coordinates, {
                edgePadding: { top: 50, right: 50, bottom: 200, left: 50 },
                animated: true,
            });
        }
    };

    // Handle route selection
    const handleRouteSelect = (route) => {
        setActiveRoute(route.id);
        setSelectedRouteDetails(route);
        centerOnRoute(route);
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return '#22C55E';
            case 'temporarily_suspended':
                return '#EF4444';
            case 'draft':
                return '#3B82F6';
            default:
                return '#6B7280';
        }
    };

    // Get status text
    const getStatusText = (status) => {
        switch (status) {
            case 'active':
                return 'Active';
            case 'temporarily_suspended':
                return 'Suspended';
            case 'draft':
                return 'Draft';
            default:
                return 'Unknown';
        }
    };

    // Render route polylines on the map
    const renderRouteLines = () => {
        return routes.map(route => {
            if (!route.rawPoints || route.rawPoints.length < 2) return null;

            const coordinates = route.rawPoints.map(coord => ({
                latitude: coord[1], // Convert [lng, lat] to {lat, lng}
                longitude: coord[0],
            }));

            return (
                <Polyline
                    key={`line-${route.id}`}
                    coordinates={coordinates}
                    strokeColor={activeRoute === route.id ? '#FF6B6B' : route.color}
                    strokeWidth={activeRoute === route.id ? 5 : 3}
                    lineDashPattern={route.status === 'draft' ? [5, 5] : undefined}
                />
            );
        });
    };

    // Render route markers
    const renderRouteMarkers = () => {
        return routes.map(route => {
            if (!route.rawPoints || route.rawPoints.length === 0) return null;

            const midIndex = Math.floor(route.rawPoints.length / 2);
            const midPoint = route.rawPoints[midIndex];

            return (
                <Marker
                    key={`marker-${route.id}`}
                    coordinate={{
                        latitude: midPoint[1],
                        longitude: midPoint[0],
                    }}
                    onPress={() => handleRouteSelect(route)}
                >
                    <View style={[
                        styles.markerContainer,
                        { backgroundColor: activeRoute === route.id ? '#FF6B6B' : route.color }
                    ]}>
                        <Text style={styles.markerText}>{route.code}</Text>
                    </View>
                </Marker>
            );
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0066CC" />
                <Text style={styles.loadingText}>Loading routes...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Map View */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                showsUserLocation={true}
                showsMyLocationButton={false}
                initialRegion={userLocation || {
                    latitude: 14.5995, // Manila
                    longitude: 120.9842,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
            >
                {/* Render route lines and markers */}
                {renderRouteLines()}
                {renderRouteMarkers()}
            </MapView>

            {/* Top Controls */}
            <View style={styles.topControls}>
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <MaterialIcons name="search" size={20} color="#64748B" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search routes or destinations..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery ? (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <MaterialIcons name="close" size={20} color="#64748B" />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Location Button */}
                <TouchableOpacity style={styles.locationButton} onPress={centerOnUserLocation}>
                    <MaterialIcons name="my-location" size={22} color="#0066CC" />
                </TouchableOpacity>
            </View>

            {/* Bottom Routes List */}
            <View style={styles.bottomSheet}>
                <View style={styles.dragHandle}>
                    <View style={styles.dragIndicator} />
                </View>

                <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Available Routes</Text>
                    <Text style={styles.sheetSubtitle}>
                        {routes.length} routes from database
                    </Text>
                </View>

                <ScrollView
                    style={styles.routesList}
                    showsVerticalScrollIndicator={false}
                >
                    {routes.map((route) => (
                        <TouchableOpacity
                            key={route.id}
                            style={[
                                styles.routeCard,
                                activeRoute === route.id && styles.routeCardActive,
                            ]}
                            onPress={() => handleRouteSelect(route)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.routeHeader}>
                                <View style={[
                                    styles.routeBadge,
                                    { backgroundColor: route.color }
                                ]}>
                                    <Text style={styles.routeBadgeText}>{route.code}</Text>
                                </View>
                                <View style={styles.routeInfo}>
                                    <Text style={styles.routeName} numberOfLines={1}>
                                        {route.name}
                                    </Text>
                                    <View style={styles.routeMeta}>
                                        <Text style={styles.routeRegion}>{route.region}</Text>
                                        <View style={styles.statusBadge}>
                                            <View style={[
                                                styles.statusDot,
                                                { backgroundColor: getStatusColor(route.status) }
                                            ]} />
                                            <Text style={styles.statusText}>
                                                {getStatusText(route.status)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.routeFare}>
                                    <Text style={styles.fareText}>{route.fare}</Text>
                                </View>
                            </View>

                            <View style={styles.routeDetails}>
                                <View style={styles.detailItem}>
                                    <FontAwesome5 name="route" size={12} color="#64748B" />
                                    <Text style={styles.detailText}>
                                        {route.rawPoints?.length || 0} points
                                    </Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <MaterialIcons name="schedule" size={12} color="#64748B" />
                                    <Text style={styles.detailText}>
                                        {route.estimatedTime}
                                    </Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <MaterialIcons name="people" size={12} color="#64748B" />
                                    <Text style={styles.detailText}>{route.passengers}</Text>
                                </View>
                            </View>

                            <View style={styles.routeStats}>
                                <Text style={styles.statsText}>
                                    Length: {route.length_meters ? `${(route.length_meters / 1000).toFixed(1)} km` : 'N/A'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    map: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#64748B',
    },
    topControls: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 14,
        color: '#0F172A',
    },
    locationButton: {
        width: 50,
        height: 50,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: height * 0.4,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    dragHandle: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    dragIndicator: {
        width: 40,
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
    },
    sheetHeader: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
    },
    sheetSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
    },
    routesList: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    routeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    routeCardActive: {
        borderColor: '#0066CC',
        borderWidth: 2,
        backgroundColor: '#F0F7FF',
    },
    routeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    routeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginRight: 12,
    },
    routeBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    routeInfo: {
        flex: 1,
    },
    routeName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 4,
    },
    routeMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    routeRegion: {
        fontSize: 12,
        color: '#64748B',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
    },
    routeFare: {
        marginLeft: 'auto',
    },
    fareText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#22C55E',
    },
    routeDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    detailItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 12,
        color: '#64748B',
    },
    routeStats: {
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    statsText: {
        fontSize: 11,
        color: '#94A3B8',
        fontStyle: 'italic',
    },
    markerContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    markerText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
});