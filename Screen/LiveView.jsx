import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, TextInput } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

export function LiveView({ navigation }) {
    const [location, setLocation] = useState(null);
    const mapRef = useRef(null);
    useEffect(() => {
        let isMounted = true;

        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync(); // Requests permission for location
            if (status !== 'granted') return; // ToDo: When user declines location permission return to main menu.

            const current = await Location.getCurrentPositionAsync({}); // Gets current location
            if (!isMounted) return;
            setLocation(current.coords); // Sets the current location

            const watcher = await Location.watchPositionAsync( // Awaits for updates live.
                { // Settings of Map
                    accuracy: Location.Accuracy.High,
                    distanceInterval: 5,
                    timeInterval: 2000,
                },
                (pos) => { // Sets the location with update
                    if (!isMounted) return;
                    setLocation(pos.coords);

                    mapRef.current?.animateCamera({
                        center: pos.coords,
                        zoom: 16,
                    });
                }
            );

            watcherRef.current = watcher;
        })();

        return () => {
            isMounted = false;
            watcherRef.current?.remove();
        }; // Dismounts the watcher
    }, []);

    const watcherRef = useRef(null);

    if (!location) return null;

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                showsCompass={false}
                showsUserLocation
                customMapStyle={[{ featureType: "all", elementType: "all", stylers: [{ visibility: "on" }] }]}
                region={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
            >
                <Marker coordinate={location} title="Your Location" pinColor="orange" />
            </MapView>

            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.topButton}
                    onPress={() => navigation.replace('RouteView')}
                >
                    <Text style={styles.topButtonText}>Show Routes</Text>
                </TouchableOpacity>

                <TextInput
                    style={styles.searchBar}
                    placeholder="Search route..."
                    placeholderTextColor="#999"
                    editable={false}
                />
            </View>

            {/* FOOTER */}
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

    header: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    topButton: {
        backgroundColor: '#720E1D',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 100,
    },
    topButtonText: { color: '#fff', fontWeight: 'bold' },
    searchBar: {
        flex: 1,
        marginLeft: 10,
        backgroundColor: '#fff',
        borderRadius: 50,
        paddingHorizontal: 15,
        paddingVertical: 8,
        fontSize: 14,
    },

    footer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        alignItems: 'center',
    },
    circle: {
        width: '120%',
        height: 80,
        borderRadius: 40,
        backgroundColor: '#720E1D',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: { textAlign: 'center' },
    logoPart: { fontSize: 28, fontFamily: 'MartianMono_700Bold' },
});
