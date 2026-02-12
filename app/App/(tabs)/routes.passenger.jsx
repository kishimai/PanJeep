import React, { useCallback } from 'react';
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
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { COLORS, minimalMapStyle, SCREEN_HEIGHT } from '../../components/passenger/constants';
import { useRouteData } from '../../components/passenger/hooks/useRouteData';

// ---------- SUB-COMPONENTS (keep in same file for tab cohesion) ----------
const LoadingScreen = React.memo(() => (
    <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
            <MaterialIcons name="directions-bus" size={48} color={COLORS.primary.main} style={styles.loadingIcon} />
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
    const getRouteTypeColor = (type) => COLORS.routeType[type] || COLORS.text.tertiary;
    const getRouteTypeLabel = (type) => type === 'community' ? 'COM' : type === 'field' ? 'FLD' : 'SYS';

    return (
        <TouchableOpacity
            style={[styles.routeCard, isActive && styles.routeCardActive]}
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
            if (!route.normalizedPoints?.length) return null;

            const isActive = activeRoute === route.id;
            const routeColor = isActive ? COLORS.map.active :
                route.originType === 'community' ? COLORS.routeType.community :
                    route.originType === 'field' ? COLORS.routeType.field :
                        COLORS.map.route;

            return (
                <React.Fragment key={`route-${route.id}`}>
                    <Polyline
                        coordinates={route.normalizedPoints}
                        strokeColor={routeColor}
                        strokeWidth={isActive ? 6 : 4}
                        strokeOpacity={isActive ? 1 : 0.9}
                        lineCap="round"
                        lineJoin="round"
                    />
                    {route.normalizedPoints.length > 0 && (
                        <>
                            <Marker coordinate={route.normalizedPoints[0]} anchor={{ x: 0.5, y: 0.5 }}>
                                <View style={[styles.routeEndpoint, { backgroundColor: routeColor }]}>
                                    <Text style={styles.endpointText}>S</Text>
                                </View>
                            </Marker>
                            <Marker coordinate={route.normalizedPoints[route.normalizedPoints.length - 1]} anchor={{ x: 0.5, y: 0.5 }}>
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
            customMapStyle={minimalMapStyle}
        >
            {renderRouteLines()}
            {userLocation && (
                <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
                    <View style={styles.userLocationMarker}>
                        <View style={styles.userLocationInner} />
                    </View>
                </Marker>
            )}
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

// ---------- MAIN TAB SCREEN ----------
export default function PassengerRoutes() {
    const navigation = useNavigation();
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

    const handleRetryConnection = useCallback(() => loadRoutes(true), [loadRoutes]);

    const goHome = useCallback(() => {
        navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home');
    }, [navigation]);

    if (state.loading) return <LoadingScreen />;

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

            <Animated.View style={[styles.bottomSheet, { height: bottomSheetHeight }]}>
                {/* Sheet Header */}
                <TouchableOpacity style={styles.sheetToggle} onPress={toggleBottomSheet} activeOpacity={0.7}>
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
                        <View style={styles.headerButtons}>
                            {!isOffline && state.routes.length > 0 && (
                                <TouchableOpacity
                                    style={styles.headerButton}
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
                            <TouchableOpacity
                                style={styles.headerButton}
                                onPress={centerOnUser}
                                disabled={!state.userLocation}
                            >
                                <Feather
                                    name="navigation"
                                    size={16}
                                    color={state.userLocation ? COLORS.text.secondary : COLORS.text.tertiary}
                                />
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
                                {state.routes.map(route => (
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

// ---------- STYLES ----------
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    map: { flex: 1 },
    loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
    loadingContent: { alignItems: 'center', paddingHorizontal: 40 },
    loadingIcon: { marginBottom: 20, opacity: 0.9 },
    loadingTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary },
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
    offlineText: { color: COLORS.text.light, fontSize: 12, fontWeight: '600', marginLeft: 6 },
    userLocationMarker: {
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: COLORS.map.userLocation,
    },
    userLocationInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.map.userLocation },
    routeEndpoint: {
        width: 28, height: 28, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
    },
    endpointText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
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
    emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary, marginTop: 16, marginBottom: 8 },
    emptyText: { fontSize: 14, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    retryButton: { backgroundColor: COLORS.primary.light, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    retryButtonText: { color: COLORS.primary.main, fontWeight: '600', fontSize: 14 },
});