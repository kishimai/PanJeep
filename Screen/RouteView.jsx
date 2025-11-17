import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, FlatList } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import axios from 'axios';
import routesData from '../routesData.json';

MapboxGL.setAccessToken('YOUR_MAPBOX_ACCESS_TOKEN');

export function RouteView({ navigation }) {
    const [activeRoute, setActiveRoute] = useState(null);
    const [roadPath, setRoadPath] = useState([]); // Road-following coordinates

    useEffect(() => {
        if (routesData.length) setActiveRoute(routesData[0]);
    }, []);

    // Fetch road-following route when activeRoute changes
    useEffect(() => {
        if (!activeRoute) return;

        const fetchRoadRoute = async () => {
            try {
                // Create a coordinate string: lng,lat;lng,lat;...
                const coords = activeRoute.path.map(p => `${p.longitude},${p.latitude}`).join(';');

                // Mapbox Directions API
                const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&access_token=YOUR_MAPBOX_ACCESS_TOKEN`;
                const res = await axios.get(url);

                if (res.data.routes && res.data.routes.length > 0) {
                    const coordinates = res.data.routes[0].geometry.coordinates;
                    setRoadPath(coordinates); // lng,lat array
                }
            } catch (error) {
                console.error('Error fetching road route:', error);
                setRoadPath(activeRoute.path.map(p => [p.longitude, p.latitude])); // fallback
            }
        };

        fetchRoadRoute();
    }, [activeRoute]);

    if (!activeRoute) {
        return (
            <View style={styles.centered}>
                <Text style={styles.loadingText}>Loading routes...</Text>
            </View>
        );
    }

    const renderRouteItem = ({ item, index }) => {
        const isActive = item.id === activeRoute.id;
        return (
            <TouchableOpacity
                style={[styles.routeItem, isActive && styles.activeRouteItem]}
                onPress={() => setActiveRoute(item)}
            >
                <View style={styles.routeIcon}>
                    <Text style={styles.routeNumber}>{index + 1}</Text>
                </View>
                <View style={styles.routeInfo}>
                    <Text style={styles.routeName}>{item.name}</Text>
                    <Text style={styles.routeStops}>
                        {item.stops[0].title} → {item.stops[item.stops.length - 1].title}
                    </Text>
                </View>
                <Text style={styles.routeTime}>{2 + index * 3} Min</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <MapboxGL.MapView style={styles.map} compassEnabled={false}>
                <MapboxGL.Camera
                    zoomLevel={14}
                    centerCoordinate={[activeRoute.path[0].longitude, activeRoute.path[0].latitude]}
                />

                {/* Road-following route */}
                {roadPath.length > 0 && (
                    <MapboxGL.ShapeSource
                        id="routeSource"
                        shape={{
                            type: 'Feature',
                            geometry: { type: 'LineString', coordinates: roadPath },
                        }}
                    >
                        <MapboxGL.LineLayer
                            id="routeLine"
                            style={{ lineColor: activeRoute.color, lineWidth: 4 }}
                        />
                    </MapboxGL.ShapeSource>
                )}

                {/* Stops */}
                {activeRoute.stops.map((stop, i) => (
                    <MapboxGL.PointAnnotation
                        key={i}
                        id={`stop-${i}`}
                        coordinate={[stop.longitude, stop.latitude]}
                    >
                        <View
                            style={{
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                backgroundColor: activeRoute.color,
                                borderWidth: 2,
                                borderColor: '#fff',
                            }}
                        />
                    </MapboxGL.PointAnnotation>
                ))}
            </MapboxGL.MapView>

            <TouchableOpacity
                onPress={() => navigation.replace('LiveView')}
                style={styles.topButton}
            >
                <Text style={styles.topButtonText}>Show Live</Text>
            </TouchableOpacity>

            <View style={styles.infoCard}>
                <Text style={styles.coordText}>
                    {`${activeRoute.path[0].latitude.toFixed(4)}, ${activeRoute.path[0].longitude.toFixed(4)}`} ({activeRoute.name})
                </Text>

                <FlatList
                    data={routesData}
                    renderItem={renderRouteItem}
                    keyExtractor={item => item.id.toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            </View>

            <View style={styles.footer}>
                <View style={styles.circle}>
                    <Text style={styles.logoText}>
                        <Text style={[styles.logoPart, { color: 'orange' }]}>Pan</Text>
                        <Text style={[styles.logoPart, { color: 'white' }]}>Jeep</Text>
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontSize: 18, color: '#555' },
    topButton: { position: 'absolute', top: 40, left: 20, backgroundColor: '#720E1D', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, zIndex: 2 },
    topButtonText: { color: '#fff', fontWeight: 'bold' },
    infoCard: { position: 'absolute', bottom: 80, width: '100%', height: '40%', backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, elevation: 8 },
    coordText: { textAlign: 'center', color: '#333', marginBottom: 10, fontWeight: '500' },
    routeItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F4F4F4', borderRadius: 12, padding: 10, marginVertical: 5 },
    activeRouteItem: { backgroundColor: '#FFD580' },
    routeIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#720E1D', alignItems: 'center', justifyContent: 'center' },
    routeNumber: { color: '#fff', fontWeight: 'bold' },
    routeInfo: { flex: 1, marginLeft: 10 },
    routeName: { fontWeight: 'bold', color: '#333' },
    routeStops: { color: '#666', fontSize: 12 },
    routeTime: { color: '#555', fontWeight: '600' },
    footer: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center' },
    circle: { width: '120%', height: 80, borderRadius: 40, backgroundColor: '#720E1D', alignItems: 'center', justifyContent: 'center' },
    logoText: { textAlign: 'center' },
    logoPart: { fontSize: 28, fontFamily: 'MartianMono_700Bold' },
});
