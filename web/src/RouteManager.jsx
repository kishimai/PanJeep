import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { RouteEditor } from "./RouteEditor.jsx";
import { estimateLength } from "./routeUtils.jsx";
import { supabase } from "./supabase";
import { isValidUUID, getRandomColor } from './routeUtils.jsx';
import { POIManager } from "./POIManager";

// Helper to transform database route to editor format
const transformRoute = (dbRoute) => ({
    id: dbRoute.id,
    name: dbRoute.geometry?.properties?.name || dbRoute.route_code,
    code: dbRoute.route_code,
    color: dbRoute.route_color || '#0066CC',
    rawPoints: dbRoute.geometry?.coordinates || [],
    regionId: dbRoute.region_id,
    regionName: dbRoute.region?.name,
    status: dbRoute.status,
    length_meters: dbRoute.length_meters,
    created_at: dbRoute.created_at,
    updated_at: dbRoute.updated_at,
    credit_status: dbRoute.credit_status,
    credited_by_operator_id: dbRoute.credited_by_operator_id,
    credited_at: dbRoute.credited_at,
    credit_confidence: dbRoute.credit_confidence,
    credit_reason: dbRoute.credit_reason,
    version: dbRoute.version || 1,
});

// Custom Hook: Mapbox Initialization
const useMapbox = (containerRef) => {
    const [map, setMap] = useState(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        const accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
        if (!accessToken) {
            console.error("Mapbox access token is missing!");
            return;
        }

        mapboxgl.accessToken = accessToken;

        const mapInstance = new mapboxgl.Map({
            container: containerRef.current,
            style: "mapbox://styles/mapbox/light-v11",
            center: [120.9842, 14.5995],
            zoom: 12,
            maxZoom: 18,
            attributionControl: true,
            antialias: true,
            pitchWithRotate: false
        });

        mapInstance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
        mapInstance.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

        mapInstance.dragRotate.disable();
        mapInstance.touchZoomRotate.disableRotation();
        mapInstance.keyboard.disableRotation();

        mapInstance.on('load', () => {
            setMapLoaded(true);
            setMap(mapInstance);
        });

        mapInstance.on('error', (e) => {
            console.error('Mapbox error:', e.error);
        });

        return () => {
            mapInstance.remove();
        };
    }, [containerRef]);

    return { map, mapLoaded };
};

// Custom Hook: Regions Management
const useRegions = () => {
    const [regions, setRegions] = useState([]);
    const [isLoadingRegions, setIsLoadingRegions] = useState(false);

    const fetchRegions = useCallback(async () => {
        setIsLoadingRegions(true);
        try {
            const { data, error } = await supabase
                .from('regions')
                .select('region_id, name, code, type, geographic_level, is_active')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            setRegions(data || []);
        } catch (error) {
            console.error('Error fetching regions:', error);
        } finally {
            setIsLoadingRegions(false);
        }
    }, []);

    return { regions, isLoadingRegions, fetchRegions };
};

// Custom Hook: Routes Management
const useRoutes = (regionFilter = '') => {
    const [routes, setRoutes] = useState([]);
    const [isLoadingRoutes, setIsLoadingRoutes] = useState(true);
    const [routesError, setRoutesError] = useState(null);

    const fetchRoutes = useCallback(async () => {
        setIsLoadingRoutes(true);
        setRoutesError(null);

        try {
            let query = supabase
                .from('routes')
                .select(`
                    *,
                    region:region_id (
                        region_id,
                        name,
                        code
                    )
                `)
                .is('deleted_at', null)
                .neq('status', 'deprecated')
                .order('created_at', { ascending: false });

            if (regionFilter && regionFilter !== "unassigned") {
                query = query.eq('region_id', regionFilter);
            } else if (regionFilter === "unassigned") {
                query = query.is('region_id', null);
            }

            const { data, error } = await query;

            if (error) throw error;

            const transformedRoutes = (data || []).map(dbRoute => transformRoute(dbRoute));
            setRoutes(transformedRoutes);
        } catch (error) {
            console.error('Error fetching routes:', error);
            setRoutesError(error);
        } finally {
            setIsLoadingRoutes(false);
        }
    }, [regionFilter]);

    return { routes, isLoadingRoutes, routesError, fetchRoutes, setRoutes };
};

// Custom Hook: Route Visualization
const useRouteVisualization = (map, routes, selectedRouteId, onRouteSelect) => {
    const routeLayersRef = useRef(new Set());
    const routeSourcesRef = useRef(new Set());

    const clearAllRouteLayers = useCallback(() => {
        if (!map) return;

        routeLayersRef.current.forEach(layerId => {
            try {
                map.off("click", layerId);
                map.off("mouseenter", layerId);
                map.off("mouseleave", layerId);
            } catch (e) {}
        });

        routeLayersRef.current.forEach(layerId => {
            try {
                if (map.getLayer(layerId)) {
                    map.removeLayer(layerId);
                }
            } catch (e) {
                console.warn('Error removing layer:', e);
            }
        });

        routeSourcesRef.current.forEach(sourceId => {
            try {
                if (map.getSource(sourceId)) {
                    map.removeSource(sourceId);
                }
            } catch (e) {
                console.warn('Error removing source:', e);
            }
        });

        routeLayersRef.current.clear();
        routeSourcesRef.current.clear();
    }, [map]);

    const drawRoutes = useCallback((routesToDraw) => {
        if (!map || !map.isStyleLoaded()) return;

        routeLayersRef.current.forEach(layerId => {
            map.off("click", layerId);
            map.off("mouseenter", layerId);
            map.off("mouseleave", layerId);
        });

        clearAllRouteLayers();

        routesToDraw.forEach(route => {
            const points = route.rawPoints;
            if (!points || points.length < 2) return;

            const sourceId = `route-source-${route.id}`;
            const lineId = `route-line-${route.id}`;
            const hoverLayerId = `route-hover-${route.id}`;

            const geojson = {
                type: "Feature",
                geometry: { type: "LineString", coordinates: points }
            };

            try {
                if (!map.getSource(sourceId)) {
                    map.addSource(sourceId, { type: "geojson", data: geojson });
                    routeSourcesRef.current.add(sourceId);
                }

                if (!map.getLayer(lineId)) {
                    map.addLayer({
                        id: lineId,
                        type: "line",
                        source: sourceId,
                        layout: {
                            "line-join": "round",
                            "line-cap": "round"
                        },
                        paint: {
                            "line-color": selectedRouteId === route.id ? '#003366' : '#0066CC',
                            "line-width": selectedRouteId === route.id ? 4 : 3,
                            "line-opacity": selectedRouteId === route.id ? 1 : 0.8
                        }
                    });
                    routeLayersRef.current.add(lineId);
                }

                if (!map.getLayer(hoverLayerId)) {
                    map.addLayer({
                        id: hoverLayerId,
                        type: "line",
                        source: sourceId,
                        layout: {
                            "line-join": "round",
                            "line-cap": "round"
                        },
                        paint: {
                            "line-color": route.color,
                            "line-width": 20,
                            "line-opacity": 0
                        }
                    });
                    routeLayersRef.current.add(hoverLayerId);
                }

                map.getSource(sourceId).setData(geojson);

                map.setPaintProperty(lineId, 'line-color', route.color || '#0066CC');
                map.setPaintProperty(lineId, 'line-width', selectedRouteId === route.id ? 4 : 3);
                map.setPaintProperty(lineId, 'line-opacity', selectedRouteId === route.id ? 1 : 0.8);

                const handleClick = () => {
                    onRouteSelect(route);

                    if (points.length > 0) {
                        const bounds = points.reduce((bounds, coord) => {
                            return bounds.extend(coord);
                        }, new mapboxgl.LngLatBounds(points[0], points[0]));

                        map.fitBounds(bounds, {
                            padding: { top: 50, bottom: 50, left: 50, right: 400 },
                            duration: 1000
                        });
                    }
                };

                const handleMouseEnter = () => {
                    map.getCanvas().style.cursor = 'pointer';
                };

                const handleMouseLeave = () => {
                    map.getCanvas().style.cursor = '';
                };

                map.on("click", hoverLayerId, handleClick);
                map.on("mouseenter", hoverLayerId, handleMouseEnter);
                map.on("mouseleave", hoverLayerId, handleMouseLeave);

            } catch (error) {
                console.warn(`Error drawing route ${route.id}:`, error);
            }
        });
    }, [map, selectedRouteId, clearAllRouteLayers, onRouteSelect]);

    return { drawRoutes, clearAllRouteLayers };
};

// Header Component with POI toggle
const Header = ({ isLoading, filteredRoutes, selectedRegionFilter, getRegionName, onNewRoute, onManagePOIs, poiCount }) => (
    <div style={styles.header}>
        <div>
            <div style={styles.title}>Route Manager</div>
            <div style={styles.subtitle}>
                {isLoading ? 'Loading...' : `${filteredRoutes.length} routes`}
                {selectedRegionFilter && ` • ${getRegionName(selectedRegionFilter)}`}
                {poiCount > 0 && ` • ${poiCount} POIs`}
            </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onManagePOIs} style={styles.secondaryButton}>
                Manage POIs
            </button>
            <button onClick={onNewRoute} style={styles.primaryButton}>
                New Route
            </button>
        </div>
    </div>
);

const FilterSection = ({
                           regions,
                           selectedRegionFilter,
                           onRegionChange,
                           searchQuery,
                           onSearchChange,
                           getRegionRouteCount
                       }) => (
    <>
        <div style={styles.filtersSection}>
            <div style={styles.searchContainer}>
                <input
                    type="text"
                    placeholder="Search routes..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    style={styles.searchInput}
                />
            </div>
        </div>

        <div style={styles.section}>
            <div style={styles.sectionTitle}>Filter by Region</div>
            <div style={styles.filterRow}>
                <select
                    value={selectedRegionFilter}
                    onChange={(e) => onRegionChange(e.target.value)}
                    style={styles.select}
                >
                    <option value="">All Regions</option>
                    {regions.map(region => (
                        <option key={region.region_id} value={region.region_id}>
                            {region.name} ({region.type}) • {getRegionRouteCount(region.region_id)}
                        </option>
                    ))}
                    <option value="unassigned">
                        Unassigned • {getRegionRouteCount("unassigned")}
                    </option>
                </select>
                {selectedRegionFilter && (
                    <button
                        onClick={() => onRegionChange("")}
                        style={styles.clearFilterButton}
                    >
                        Clear
                    </button>
                )}
            </div>
        </div>
    </>
);

const RouteItem = React.memo(({
                                  route,
                                  isSelected,
                                  onClick,
                                  onEdit,
                                  onDuplicate,
                                  onDelete
                              }) => (
    <div
        onClick={() => onClick(route)}
        style={{
            ...styles.routeItem,
            borderLeft: `3px solid ${isSelected ? '#003366' : '#0066CC'}`,
            background: isSelected ? '#F0F7FF' : '#fff'
        }}
    >
        <div style={styles.routeHeader}>
            <div>
                <div style={styles.routeName}>{route.name || route.code}</div>
                <div style={styles.routeSubtitle}>
                    {route.regionName || "No region assigned"}
                    {route.snappedPoints && (
                        <span style={styles.snappedBadge}>Snapped</span>
                    )}
                </div>
            </div>
            <div style={styles.routeBadges}>
                <span style={{
                    ...styles.badgeStatus,
                    background: route.status === 'draft' ? '#F3F4F6' :
                        route.status === 'active' ? '#D1FAE5' : '#FEF3C7',
                    color: route.status === 'draft' ? '#374151' :
                        route.status === 'active' ? '#065F46' : '#92400E'
                }}>
                    {route.status}
                </span>
            </div>
        </div>

        <div style={styles.routeDetails}>
            <div style={styles.routeDetail}>
                <span style={styles.detailIcon}>Length:</span>
                {route.length_meters ? `${(route.length_meters / 1000).toFixed(1)} km` : 'N/A'}
            </div>
            <div style={styles.routeDetail}>
                <span style={styles.detailIcon}>Points:</span>
                {route.rawPoints.length}
            </div>
        </div>

        <div style={styles.routeActions}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit(route);
                }}
                style={styles.smallButton}
                title="Edit route"
            >
                Edit
            </button>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(route.id);
                }}
                style={styles.smallButton}
                title="Duplicate route"
            >
                Duplicate
            </button>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(route.id);
                }}
                style={{...styles.smallButton, color: '#DC2626'}}
                title="Delete route"
            >
                Delete
            </button>
        </div>
    </div>
));

const RouteListSkeleton = () => (
    <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <div>Loading routes...</div>
    </div>
);

const RouteDetailsCard = ({ route, regions, onEdit, onSave, onAssignRegion }) => (
    <div style={styles.selectedRouteCard}>
        <div style={styles.selectedRouteHeader}>
            <div>
                <div style={styles.selectedRouteTitle}>{route.name || route.code}</div>
                <div style={styles.selectedRouteSubtitle}>
                    {route.regionName || "No region assigned"}
                </div>
            </div>
            <span style={{
                ...styles.selectedStatusBadge,
                background: route.status === 'draft' ? '#F3F4F6' :
                    route.status === 'active' ? '#D1FAE5' : '#FEF3C7',
                color: route.status === 'draft' ? '#374151' :
                    route.status === 'active' ? '#065F46' : '#92400E'
            }}>
                {route.status}
            </span>
        </div>

        <div style={styles.selectedRouteGrid}>
            <div style={styles.selectedRouteStat}>
                <div style={styles.selectedRouteStatContent}>
                    <div style={styles.selectedRouteStatLabel}>Distance</div>
                    <div style={styles.selectedRouteStatValue}>
                        {route.length_meters ? `${(route.length_meters / 1000).toFixed(2)} km` : 'N/A'}
                    </div>
                </div>
            </div>
            <div style={styles.selectedRouteStat}>
                <div style={styles.selectedRouteStatContent}>
                    <div style={styles.selectedRouteStatLabel}>Estimated Time</div>
                    <div style={styles.selectedRouteStatValue}>
                        {route.length_meters ?
                            `${Math.round((route.length_meters / 1000 / 30) * 60)} min` : 'N/A'}
                    </div>
                </div>
            </div>
            <div style={styles.selectedRouteStat}>
                <div style={styles.selectedRouteStatContent}>
                    <div style={styles.selectedRouteStatLabel}>Points</div>
                    <div style={styles.selectedRouteStatValue}>
                        {route.rawPoints.length}
                    </div>
                </div>
            </div>
        </div>

        <div style={styles.regionSelector}>
            <div style={styles.regionLabel}>Assign Region</div>
            <select
                value={route.regionId || ""}
                onChange={(e) => onAssignRegion(route.id, e.target.value)}
                style={styles.regionSelect}
            >
                <option value="">Select Region</option>
                {regions.map(region => (
                    <option key={region.region_id} value={region.region_id}>
                        {region.name} ({region.type})
                    </option>
                ))}
            </select>
        </div>

        <div style={styles.routeActions}>
            <button
                onClick={onEdit}
                style={styles.primaryButton}
            >
                Edit Route
            </button>
            // In RouteDetailsCard, when calling onSave:
            <button
                onClick={async () => {
                    // Optional: only save if something changed
                    // You'd need to track original route or compare with current version
                    try {
                        await onSave(route);
                        alert('Route saved successfully');
                    } catch (error) {
                        // Error handled in function
                    }
                }}
                style={styles.secondaryButton}
            >
                Save Route
            </button>
        </div>
    </div>
);

const EmptyState = ({ searchQuery, selectedRegionFilter, getRegionName, onCreateNew }) => (
    <div style={styles.emptyState}>
        <div style={styles.emptyTitle}>
            {searchQuery ? "No matching routes" :
                selectedRegionFilter ? `No routes in ${getRegionName(selectedRegionFilter)}`
                    : "No routes created"}
        </div>
        <div style={styles.emptyText}>
            {searchQuery ? "Try a different search term" :
                "Create your first route to get started"}
        </div>
        <button onClick={onCreateNew} style={styles.emptyButton}>
            Create New Route
        </button>
    </div>
);

// Main Component
export function RouteManager({ operatorId }) {
    const mapContainer = useRef(null);
    const { map, mapLoaded } = useMapbox(mapContainer);

    const [selectedRegionFilter, setSelectedRegionFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [viewEditRoute, setViewEditRoute] = useState(false);
    const [selectedRouteId, setSelectedRouteId] = useState(null);
    const [activeRouteId, setActiveRouteId] = useState(null);
    const [showPOIManager, setShowPOIManager] = useState(false);

    const { regions, isLoadingRegions, fetchRegions } = useRegions();
    const { routes, isLoadingRoutes, routesError, fetchRoutes, setRoutes } = useRoutes(selectedRegionFilter);

    const poiCount = 0;

    const getRegionName = useCallback((regionId) => {
        if (regionId === "unassigned") return "Unassigned";
        const region = regions.find(r => r.region_id === regionId);
        return region ? region.name : "Unknown Region";
    }, [regions]);

    const getRegionRouteCount = useCallback((regionId) => {
        if (regionId === "unassigned") {
            return routes.filter(r => !r.regionId).length;
        }
        return routes.filter(r => r.regionId === regionId).length;
    }, [routes]);

    const filteredRoutes = useMemo(() => {
        let result = routes;

        if (selectedRegionFilter) {
            if (selectedRegionFilter === "unassigned") {
                result = result.filter(route => !route.regionId);
            } else {
                result = result.filter(route => route.regionId === selectedRegionFilter);
            }
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(route =>
                route.name.toLowerCase().includes(query) ||
                route.code.toLowerCase().includes(query) ||
                (route.regionName && route.regionName.toLowerCase().includes(query))
            );
        }

        return result;
    }, [routes, selectedRegionFilter, searchQuery]);

    const selectedRoute = useMemo(
        () => routes.find(r => r.id === selectedRouteId),
        [routes, selectedRouteId]
    );

    const handleRouteSelect = useCallback((route) => {
        setSelectedRouteId(route.id);
        setActiveRouteId(route.id);
    }, []);

    const { drawRoutes, clearAllRouteLayers } = useRouteVisualization(
        map,
        routes,
        selectedRouteId,
        handleRouteSelect
    );

    const zoomToRoute = useCallback((route) => {
        if (!map || !route.rawPoints.length) return;

        const bounds = route.rawPoints.reduce((bounds, coord) => {
            return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(route.rawPoints[0], route.rawPoints[0]));

        map.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 400 },
            duration: 1000
        });
    }, [map]);

    // UPDATED: saveRouteToDatabase using RPC
    const saveRouteToDatabase = useCallback(async (route) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // Build the geometry object
            const geometry = {
                type: 'LineString',
                coordinates: route.rawPoints || [],
                properties: {
                    name: route.name || route.code || 'Unnamed Route',
                    color: route.color || '#0066CC',
                }
            };

            // Call the RPC function
            const { error } = await supabase.rpc('update_route_geometry', {
                p_route_id: route.id,
                p_new_geometry: geometry,
                p_resolution_method: 'approved_with_adjustments'
            });

            if (error) throw error;

            // Refetch the updated route to sync local state
            const { data: updated, error: fetchError } = await supabase
                .from('routes')
                .select('*, region:region_id(*)')
                .eq('id', route.id)
                .single();

            if (fetchError) throw fetchError;

            const updatedRoute = transformRoute(updated);

            setRoutes(prev => prev.map(r => r.id === route.id ? updatedRoute : r));

            return updated;
        } catch (error) {
            console.error('Error saving route:', error);
            throw new Error(error.message);
        }
    }, [setRoutes]);

    // UPDATED: deleteRouteFromDatabase (soft delete - optionally add history logging later)
    const deleteRouteFromDatabase = useCallback(async (routeId) => {
        try {
            const { error } = await supabase.rpc('soft_delete_route', {
                p_route_id: routeId
            });

            if (error) throw error;

            // Remove from local state
            setRoutes(prev => prev.filter(r => r.id !== routeId));

            if (selectedRouteId === routeId) {
                setSelectedRouteId(null);
            }
            if (activeRouteId === routeId) {
                setActiveRouteId(null);
            }

            return true;
        } catch (error) {
            console.error('Error deleting route:', error);
            alert('Failed to delete route');
            return false;
        }
    }, [selectedRouteId, activeRouteId, setRoutes]);

    const assignRegion = useCallback(async (routeId, regionId) => {
        try {
            const { error } = await supabase
                .from('routes')
                .update({ region_id: regionId || null })
                .eq('id', routeId);

            if (error) throw error;

            setRoutes(prev =>
                prev.map(r =>
                    r.id === routeId ? {
                        ...r,
                        regionId: regionId || null,
                        regionName: regionId ? getRegionName(regionId) : null
                    } : r
                )
            );

            if (selectedRoute?.id === routeId) {
                setSelectedRouteId(routeId);
            }
        } catch (error) {
            console.error('Error assigning region:', error);
            alert('Failed to assign region');
        }
    }, [selectedRoute, getRegionName, setRoutes]);

    const duplicateRoute = useCallback(async (routeId) => {
        const route = routes.find(r => r.id === routeId);
        if (!route) {
            alert('Route not found');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            let newRouteCode = `${route.code}-COPY`;
            let counter = 1;
            let codeExists = true;
            while (codeExists) {
                const { data: existing } = await supabase
                    .from('routes')
                    .select('route_code')
                    .eq('route_code', newRouteCode)
                    .maybeSingle();
                if (!existing) {
                    codeExists = false;
                } else {
                    counter++;
                    newRouteCode = `${route.code}-COPY-${counter}`;
                }
            }

            const duplicateColor = getRandomColor();

            const routeData = {
                route_code: newRouteCode,
                origin_type: route.origin_type || 'field',
                proposed_by_user_id: user.id,
                status: 'draft',
                route_color: route.color || '#0066CC',
                geometry: {
                    type: 'LineString',
                    coordinates: route.rawPoints || [],
                    properties: {
                        color: duplicateColor,
                        name: `${route.name || route.code} (Copy)`,
                        original_route_id: route.id,
                        duplicated_at: new Date().toISOString(),
                        duplicated_by: user.id
                    }
                },
                length_meters: route.length_meters || 0,
                last_geometry_update_at: new Date().toISOString(),
                region_id: route.regionId || null,
                credit_status: 'uncredited',
                credit_confidence: 0,
                credit_reason: null,
                credited_by_operator_id: null,
                credited_at: null,
                status_changed_at: new Date().toISOString(),
                status_changed_by: user.id
            };

            const { data: newRoute, error } = await supabase
                .from('routes')
                .insert([routeData])
                .select('*, region:region_id(*)')
                .single();

            if (error) throw error;

            const newEditorRoute = transformRoute(newRoute);

            setRoutes(prev => [newEditorRoute, ...prev]);
            setSelectedRouteId(newRoute.id);
            setActiveRouteId(newRoute.id);
            alert(`Route duplicated as "${newEditorRoute.name}"`);

            if (newEditorRoute.rawPoints.length > 0) {
                zoomToRoute(newEditorRoute);
            }

            return newEditorRoute;
        } catch (error) {
            console.error('Error duplicating route:', error);
            alert(`Failed to duplicate route: ${error.message}`);
        }
    }, [routes, setRoutes, setSelectedRouteId, setActiveRouteId, zoomToRoute]);

    // Effects
    useEffect(() => {
        fetchRegions();
    }, [fetchRegions]);

    useEffect(() => {
        fetchRoutes();
    }, [fetchRoutes]);

    useEffect(() => {
        if (map && mapLoaded) {
            drawRoutes(filteredRoutes);
        }
    }, [filteredRoutes, map, mapLoaded, drawRoutes]);

    useEffect(() => {
        return () => {
            clearAllRouteLayers();
        };
    }, [clearAllRouteLayers]);

    const isLoading = isLoadingRoutes || isLoadingRegions;

    return (
        <div style={styles.container}>
            <div ref={mapContainer} style={styles.map} />

            <div style={styles.sidebar}>
                {viewEditRoute ? (
                    <RouteEditor
                        map={map}
                        routes={routes}
                        setRoutes={setRoutes}
                        activeRouteId={activeRouteId}
                        setActiveRouteId={setActiveRouteId}
                        exitEditor={() => {
                            setViewEditRoute(false);
                            if (map && mapLoaded) {
                                setTimeout(() => drawRoutes(filteredRoutes), 100);
                            }
                        }}
                        saveRouteToDatabase={saveRouteToDatabase}
                        deleteRouteFromDatabase={deleteRouteFromDatabase}
                        regions={regions}
                    />
                ) : (
                    <>
                        <Header
                            isLoading={isLoading}
                            filteredRoutes={filteredRoutes}
                            selectedRegionFilter={selectedRegionFilter}
                            getRegionName={getRegionName}
                            onNewRoute={() => {
                                setViewEditRoute(true);
                                setActiveRouteId(null);
                            }}
                            onManagePOIs={() => setShowPOIManager(true)}
                            poiCount={poiCount}
                        />

                        <FilterSection
                            regions={regions}
                            selectedRegionFilter={selectedRegionFilter}
                            onRegionChange={(value) => {
                                setSelectedRegionFilter(value);
                                setSelectedRouteId(null);
                            }}
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            getRegionRouteCount={getRegionRouteCount}
                        />

                        <div style={styles.section}>
                            <div style={styles.sectionHeader}>
                                <div style={styles.sectionTitle}>
                                    {selectedRegionFilter ? (
                                        selectedRegionFilter === 'unassigned' ?
                                            `Unassigned Routes` :
                                            `${getRegionName(selectedRegionFilter)}`
                                    ) : `All Routes`} ({filteredRoutes.length})
                                </div>
                            </div>

                            <div style={styles.routesList}>
                                {isLoading ? (
                                    <RouteListSkeleton />
                                ) : filteredRoutes.length === 0 ? (
                                    <EmptyState
                                        searchQuery={searchQuery}
                                        selectedRegionFilter={selectedRegionFilter}
                                        getRegionName={getRegionName}
                                        onCreateNew={() => {
                                            setViewEditRoute(true);
                                            setActiveRouteId(null);
                                        }}
                                    />
                                ) : (
                                    filteredRoutes.map(route => (
                                        <RouteItem
                                            key={route.id}
                                            route={route}
                                            isSelected={selectedRouteId === route.id}
                                            onClick={(route) => {
                                                handleRouteSelect(route);
                                                zoomToRoute(route);
                                            }}
                                            onEdit={(route) => {
                                                setViewEditRoute(true);
                                                setActiveRouteId(route.id);
                                            }}
                                            onDuplicate={duplicateRoute}
                                            onDelete={(routeId) => {
                                                if (window.confirm(`Delete "${route.name || route.code}"?`)) {
                                                    deleteRouteFromDatabase(routeId);
                                                }
                                            }}
                                        />
                                    ))
                                )}
                            </div>
                        </div>

                        {selectedRoute && !isLoading && (
                            <RouteDetailsCard
                                route={selectedRoute}
                                regions={regions}
                                onEdit={() => setViewEditRoute(true)}
                                onSave={saveRouteToDatabase}
                                onAssignRegion={assignRegion}
                            />
                        )}
                    </>
                )}
            </div>

            {/* POI Manager Overlay */}
            {showPOIManager && (
                <div style={styles.poiOverlay}>
                    <POIManager
                        map={map}
                        regions={regions}
                        regionFilter={selectedRegionFilter}
                        onClose={() => setShowPOIManager(false)}
                    />
                </div>
            )}
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        height: '100vh',
        width: '100%',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#F8FAFC'
    },
    map: {
        flex: 1,
        height: '100%',
        minWidth: 0,
        background: '#F1F5F9'
    },
    sidebar: {
        width: '420px',
        background: '#FFFFFF',
        borderLeft: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
    },
    poiOverlay: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: '420px',
        height: '100%',
        background: '#ffffff',
        borderLeft: '1px solid #e2e8f0',
        boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
        zIndex: 30,
        overflow: 'hidden'
    },
    header: {
        padding: '20px',
        borderBottom: '1px solid #E2E8F0',
        background: '#FFFFFF',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
    },
    title: {
        color: '#1E293B',
        fontSize: '18px',
        fontWeight: 600,
        marginBottom: '2px'
    },
    subtitle: {
        color: '#64748B',
        fontSize: '13px',
        fontWeight: 400
    },
    primaryButton: {
        background: '#0066CC',
        color: '#FFFFFF',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background 0.2s',
        '&:hover': {
            background: '#0052A3'
        }
    },
    secondaryButton: {
        padding: '8px 16px',
        background: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: '6px',
        color: '#475569',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
            background: '#F1F5F9'
        }
    },
    filtersSection: {
        padding: '16px 20px',
        borderBottom: '1px solid #E2E8F0',
        background: '#F8FAFC'
    },
    searchContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    searchInput: {
        width: '100%',
        padding: '10px 14px',
        border: '1px solid #CBD5E1',
        borderRadius: '6px',
        fontSize: '14px',
        background: '#FFFFFF',
        color: '#1E293B',
        '&:focus': {
            outline: 'none',
            borderColor: '#0066CC',
            boxShadow: '0 0 0 2px rgba(0, 102, 204, 0.1)'
        }
    },
    section: {
        padding: '20px',
        borderBottom: '1px solid #E2E8F0',
        background: '#FFFFFF'
    },
    sectionHeader: {
        marginBottom: '16px'
    },
    sectionTitle: {
        color: '#1E293B',
        fontSize: '15px',
        fontWeight: 600
    },
    filterRow: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
    },
    select: {
        flex: 1,
        padding: '10px 14px',
        border: '1px solid #CBD5E1',
        borderRadius: '6px',
        fontSize: '14px',
        background: '#FFFFFF',
        color: '#1E293B',
        cursor: 'pointer',
        '&:focus': {
            outline: 'none',
            borderColor: '#0066CC'
        }
    },
    clearFilterButton: {
        padding: '10px 14px',
        background: '#F1F5F9',
        border: '1px solid #CBD5E1',
        borderRadius: '6px',
        color: '#475569',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        '&:hover': {
            background: '#E2E8F0'
        }
    },
    loading: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        color: '#64748B',
        fontSize: '14px'
    },
    spinner: {
        width: '24px',
        height: '24px',
        border: '2px solid #E2E8F0',
        borderTopColor: '#0066CC',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '12px'
    },
    routesList: {
        flex: 1,
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 500px)',
        minHeight: '150px',
        paddingRight: '2px'
    },
    routeItem: {
        padding: '16px',
        marginBottom: '8px',
        background: '#FFFFFF',
        borderRadius: '6px',
        border: '1px solid #E2E8F0',
        cursor: 'pointer',
        transition: 'background 0.2s',
        '&:hover': {
            background: '#F8FAFC'
        }
    },
    routeHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '8px',
        gap: '8px'
    },
    routeName: {
        fontWeight: 500,
        color: '#1E293B',
        fontSize: '14px'
    },
    routeSubtitle: {
        fontSize: '12px',
        color: '#64748B',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '2px'
    },
    snappedBadge: {
        fontSize: '11px',
        background: '#D1FAE5',
        color: '#065F46',
        padding: '2px 6px',
        borderRadius: '4px',
        fontWeight: 500
    },
    routeBadges: {
        flexShrink: 0
    },
    badgeStatus: {
        fontSize: '11px',
        padding: '3px 8px',
        borderRadius: '4px',
        fontWeight: 500
    },
    routeDetails: {
        display: 'flex',
        gap: '16px',
        marginBottom: '12px',
        fontSize: '12px',
        color: '#64748B'
    },
    routeDetail: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
    },
    detailIcon: {
        fontWeight: 500
    },
    routeActions: {
        display: 'flex',
        gap: '6px'
    },
    smallButton: {
        padding: '6px 10px',
        background: 'transparent',
        border: '1px solid #CBD5E1',
        borderRadius: '4px',
        color: '#475569',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background 0.2s',
        '&:hover': {
            background: '#F1F5F9'
        }
    },
    emptyState: {
        padding: '40px 20px',
        textAlign: 'center',
        color: '#64748B'
    },
    emptyTitle: {
        fontSize: '14px',
        fontWeight: 500,
        marginBottom: '4px',
        color: '#475569'
    },
    emptyText: {
        fontSize: '13px',
        marginBottom: '16px',
        color: '#94A3B8'
    },
    emptyButton: {
        background: '#0066CC',
        color: '#FFFFFF',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        '&:hover': {
            background: '#0052A3'
        }
    },
    selectedRouteCard: {
        padding: '20px',
        background: '#F8FAFC',
        borderTop: '1px solid #E2E8F0',
        marginTop: 'auto'
    },
    selectedRouteHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px',
        gap: '8px'
    },
    selectedRouteTitle: {
        color: '#1E293B',
        fontSize: '16px',
        fontWeight: 600
    },
    selectedRouteSubtitle: {
        fontSize: '13px',
        color: '#64748B',
        marginTop: '2px'
    },
    selectedStatusBadge: {
        fontSize: '11px',
        padding: '4px 8px',
        borderRadius: '4px',
        fontWeight: 500
    },
    selectedRouteGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '16px'
    },
    selectedRouteStat: {
        padding: '12px',
        background: '#FFFFFF',
        borderRadius: '6px',
        border: '1px solid #E2E8F0'
    },
    selectedRouteStatContent: {
        display: 'flex',
        flexDirection: 'column'
    },
    selectedRouteStatLabel: {
        fontSize: '11px',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '2px'
    },
    selectedRouteStatValue: {
        fontSize: '14px',
        fontWeight: 600,
        color: '#1E293B'
    },
    regionSelector: {
        marginBottom: '16px'
    },
    regionLabel: {
        color: '#475569',
        fontSize: '13px',
        fontWeight: 500,
        marginBottom: '6px'
    },
    regionSelect: {
        width: '100%',
        padding: '10px 14px',
        border: '1px solid #CBD5E1',
        borderRadius: '6px',
        fontSize: '14px',
        background: '#FFFFFF',
        color: '#1E293B',
        cursor: 'pointer',
        '&:focus': {
            outline: 'none',
            borderColor: '#0066CC'
        }
    }
};

if (typeof document !== 'undefined') {
    const styleSheet = document.styleSheets[0];
    if (styleSheet) {
        styleSheet.insertRule(`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `, styleSheet.cssRules.length);
    }
}