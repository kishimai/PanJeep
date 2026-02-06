import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { RouteEditor } from "./RouteEditor.jsx";
import { estimateLength } from "./routeUtils.jsx";

export function RouteManager({ operatorId }) {
    const mapContainer = useRef(null);
    const [map, setMap] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [activeRouteId, setActiveRouteId] = useState(null);
    const [selectedRouteId, setSelectedRouteId] = useState(null);
    const [viewEditRoute, setViewEditRoute] = useState(false);
    const [selectedRegionFilter, setSelectedRegionFilter] = useState("");

    const [regions] = useState([
        { id: 1, name: "North Region" },
        { id: 2, name: "South Region" },
        { id: 3, name: "East Region" },
        { id: 4, name: "West Region" }
    ]);

    const selectedRoute = useMemo(
        () => routes.find(r => r.id === selectedRouteId),
        [routes, selectedRouteId]
    );

    const routeLayersRef = useRef(new Set());

    /* ---------------- Map Initialization ---------------- */

    useEffect(() => {
        if (!mapContainer.current) return;

        const mapInstance = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/light-v11",
            center: [120.9842, 14.5995],
            zoom: 12,
            minZoom: 10,
            maxZoom: 18,
            attributionControl: true
        });

        mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
        mapInstance.dragRotate.disable();
        mapInstance.keyboard.disableRotation();

        setMap(mapInstance);

        return () => {
            routeLayersRef.current.forEach(layerId => {
                if (mapInstance.getLayer(layerId)) mapInstance.removeLayer(layerId);
                const sourceId = layerId.replace('route-line-', 'route-');
                if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
            });
            routeLayersRef.current.clear();
            mapInstance.remove();
        };
    }, []);

    /* ---------------- Route Drawing ---------------- */

    const drawRoutes = useCallback(() => {
        if (!map || !map.isStyleLoaded()) return;

        routes.forEach(route => {
            const points = route.snappedPoints ?? route.rawPoints;
            if (!points || points.length < 2) return;

            const sourceId = `route-${route.id}`;
            const lineId = `route-line-${route.id}`;

            const geojson = {
                type: "Feature",
                geometry: { type: "LineString", coordinates: points }
            };

            if (map.getSource(sourceId)) {
                map.getSource(sourceId).setData(geojson);
            } else {
                map.addSource(sourceId, { type: "geojson", data: geojson });
                map.addLayer({
                    id: lineId,
                    type: "line",
                    source: sourceId,
                    layout: { "line-join": "round", "line-cap": "round" },
                    paint: {
                        "line-color": route.color,
                        "line-width": selectedRouteId === route.id ? 5 : 3,
                        "line-opacity": selectedRouteId === route.id ? 0.9 : 0.5
                    }
                });

                map.on("click", lineId, () => {
                    setSelectedRouteId(route.id);
                    setActiveRouteId(route.id);
                });

                routeLayersRef.current.add(lineId);
            }
        });
    }, [map, routes, selectedRouteId, activeRouteId]);

    useEffect(() => {
        if (!map) return;

        if (map.isStyleLoaded()) {
            drawRoutes();
        } else {
            map.once("load", drawRoutes);
        }

        return () => {
            if (map) {
                routeLayersRef.current.forEach(layerId => {
                    map.off("click", layerId);
                });
            }
        };
    }, [map, drawRoutes]);

    /* ---------------- Helper Functions ---------------- */

    const getRegionName = useCallback((id) =>
            regions.find(r => r.id === id)?.name ?? "Unassigned",
        [regions]);

    const assignRegion = useCallback((routeId, regionId) => {
        setRoutes(prev =>
            prev.map(r =>
                r.id === routeId ? { ...r, regionId: Number(regionId) } : r
            )
        );
    }, []);

    const duplicateRoute = useCallback((routeId) => {
        const route = routes.find(r => r.id === routeId);
        if (!route) return;

        const newRoute = {
            ...route,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: `${route.name} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        setRoutes(prev => [newRoute, ...prev]);
        setSelectedRouteId(newRoute.id);
        setActiveRouteId(newRoute.id);
    }, [routes]);

    const exportRoutes = useCallback(() => {
        const dataStr = JSON.stringify(routes, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `routes-${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }, [routes]);

    const importRoutes = useCallback((event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("File too large. Maximum size is 5MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedRoutes = JSON.parse(e.target.result);
                if (Array.isArray(importedRoutes)) {
                    const updatedRoutes = importedRoutes.map(route => ({
                        ...route,
                        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    }));

                    setRoutes(prev => [...updatedRoutes, ...prev]);
                    alert(`Successfully imported ${importedRoutes.length} routes.`);
                } else {
                    alert("Invalid file format. Expected an array of routes.");
                }
            } catch (error) {
                console.error("Import error:", error);
                alert("Failed to import routes. Invalid JSON format.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }, []);

    return (
        <div style={styles.container}>
            {/* Main Map */}
            <div ref={mapContainer} style={styles.map} />

            {/* Sidebar Panel */}
            <div style={styles.sidebar}>
                {!viewEditRoute ? (
                    <>
                        {/* Header */}
                        <div style={styles.header}>
                            <div>
                                <div style={styles.title}>Route Manager</div>
                                <div style={styles.subtitle}>
                                    {routes.length} route{routes.length !== 1 ? 's' : ''}
                                </div>
                            </div>
                            <button
                                onClick={() => setViewEditRoute(true)}
                                style={styles.primaryButton}
                            >
                                New Route
                            </button>
                        </div>

                        {/* Data Management */}
                        <div style={styles.section}>
                            <div style={styles.sectionTitle}>Data Management</div>
                            <div style={styles.dataButtons}>
                                <button
                                    onClick={exportRoutes}
                                    style={styles.secondaryButton}
                                >
                                    Export Routes
                                </button>
                                <div style={styles.fileInputWrapper}>
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={importRoutes}
                                        style={styles.fileInput}
                                        id="route-import"
                                    />
                                    <label htmlFor="route-import" style={styles.secondaryButton}>
                                        Import Routes
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Region Filter */}
                        <div style={styles.section}>
                            <div style={styles.sectionTitle}>Filter by Region</div>
                            <select
                                value={selectedRegionFilter}
                                onChange={e => setSelectedRegionFilter(e.target.value)}
                                style={styles.select}
                            >
                                <option value="">All Regions</option>
                                {regions.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Routes List */}
                        <div style={styles.section}>
                            <div style={styles.sectionHeader}>
                                <div style={styles.sectionTitle}>
                                    Routes ({routes.filter(r => !selectedRegionFilter || r.regionId === Number(selectedRegionFilter)).length})
                                </div>
                            </div>

                            <div style={styles.routesList}>
                                {routes
                                    .filter(r => !selectedRegionFilter || r.regionId === Number(selectedRegionFilter))
                                    .map(route => (
                                        <div
                                            key={route.id}
                                            onClick={() => {
                                                setSelectedRouteId(route.id);
                                                setActiveRouteId(route.id);
                                                if (map && (route.snappedPoints || route.rawPoints).length > 0) {
                                                    const points = route.snappedPoints || route.rawPoints;
                                                    const bounds = points.reduce((bounds, coord) => {
                                                        return bounds.extend(coord);
                                                    }, new mapboxgl.LngLatBounds(points[0], points[0]));
                                                    map.fitBounds(bounds, { padding: 50, duration: 1000 });
                                                }
                                            }}
                                            style={{
                                                ...styles.routeItem,
                                                borderLeft: `4px solid ${route.color}`,
                                                background: selectedRouteId === route.id ? '#f1f5f9' : '#fff'
                                            }}
                                        >
                                            <div style={styles.routeHeader}>
                                                <div style={styles.routeName}>{route.name}</div>
                                                <div style={styles.routeBadges}>
                                                    {route.snappedPoints && (
                                                        <span style={styles.badgeSnapped}>Snapped</span>
                                                    )}
                                                    {route.optimized && (
                                                        <span style={styles.badgeOptimized}>Optimized</span>
                                                    )}
                                                    {route.regionId && (
                                                        <span style={styles.badgeRegion}>
                                                            {getRegionName(route.regionId).charAt(0)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={styles.routeDetails}>
                                                <div style={styles.routeDetail}>
                                                    {estimateLength(route.snappedPoints || route.rawPoints)} km
                                                </div>
                                                <div style={styles.routeDetail}>
                                                    {(route.snappedPoints || route.rawPoints).length} points
                                                </div>
                                            </div>

                                            <div style={styles.routeActions}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        duplicateRoute(route.id);
                                                    }}
                                                    style={styles.smallButton}
                                                >
                                                    Duplicate
                                                </button>
                                                <button
                                                    onClick={() => setViewEditRoute(true)}
                                                    style={styles.smallButton}
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                {routes.length === 0 && (
                                    <div style={styles.emptyState}>
                                        <div style={styles.emptyTitle}>No routes yet</div>
                                        <div style={styles.emptyText}>
                                            Create your first route to get started
                                        </div>
                                        <button
                                            onClick={() => setViewEditRoute(true)}
                                            style={styles.emptyButton}
                                        >
                                            Create New Route
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Selected Route Details */}
                        {selectedRoute && (
                            <div style={styles.selectedRouteCard}>
                                <div style={styles.selectedRouteHeader}>
                                    <div style={styles.selectedRouteTitle}>{selectedRoute.name}</div>
                                    <div style={styles.selectedRouteStatus}>
                                        {selectedRoute.snappedPoints ? (
                                            <span style={styles.statusSnapped}>Snapped to Road</span>
                                        ) : (
                                            <span style={styles.statusManual}>Manual Points</span>
                                        )}
                                        {selectedRoute.optimized && (
                                            <span style={styles.statusOptimized}>Optimized</span>
                                        )}
                                    </div>
                                </div>

                                <div style={styles.selectedRouteGrid}>
                                    <div style={styles.selectedRouteStat}>
                                        <div style={styles.selectedRouteStatValue}>
                                            {estimateLength(selectedRoute.snappedPoints ?? selectedRoute.rawPoints)} km
                                        </div>
                                        <div style={styles.selectedRouteStatLabel}>Distance</div>
                                    </div>
                                    <div style={styles.selectedRouteStat}>
                                        <div style={styles.selectedRouteStatValue}>
                                            ~{Math.round((estimateLength(selectedRoute.snappedPoints ?? selectedRoute.rawPoints) / 30) * 60)} min
                                        </div>
                                        <div style={styles.selectedRouteStatLabel}>Estimated Time</div>
                                    </div>
                                    <div style={styles.selectedRouteStat}>
                                        <div style={styles.selectedRouteStatValue}>
                                            {(selectedRoute.snappedPoints ?? selectedRoute.rawPoints).length}
                                        </div>
                                        <div style={styles.selectedRouteStatLabel}>Points</div>
                                    </div>
                                </div>

                                <div style={styles.regionSelector}>
                                    <div style={styles.regionLabel}>Assign Region</div>
                                    <select
                                        value={selectedRoute.regionId || ""}
                                        onChange={e => assignRegion(selectedRoute.id, e.target.value)}
                                        style={styles.regionSelect}
                                    >
                                        <option value="">Select Region</option>
                                        {regions.map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                    {selectedRoute.regionId && (
                                        <div style={styles.currentRegion}>
                                            Current: {getRegionName(selectedRoute.regionId)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <RouteEditor
                        map={map}
                        routes={routes}
                        setRoutes={setRoutes}
                        activeRouteId={activeRouteId}
                        setActiveRouteId={setActiveRouteId}
                        exitEditor={() => {
                            setViewEditRoute(false);
                            setActiveRouteId(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        height: '100%',
        width: '100%',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        background: '#ffffff',
        overflow: 'hidden'
    },
    map: {
        flex: 1,
        height: '100%',
        minWidth: 0
    },
    sidebar: {
        width: '400px',
        background: '#ffffff',
        borderLeft: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
        zIndex: 10
    },
    header: {
        padding: '20px',
        borderBottom: '1px solid #e5e7eb',
        background: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    title: {
        color: '#1f2937',
        fontSize: '20px',
        fontWeight: 700,
        marginBottom: '4px',
        letterSpacing: '-0.025em'
    },
    subtitle: {
        color: '#6b7280',
        fontSize: '13px',
        fontWeight: 500
    },
    primaryButton: {
        background: '#1d4ed8',
        color: '#ffffff',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background-color 0.2s',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
    },
    section: {
        padding: '20px',
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb'
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
    },
    sectionTitle: {
        color: '#374151',
        fontSize: '16px',
        fontWeight: 600,
        marginBottom: '15px',
        letterSpacing: '-0.01em'
    },
    dataButtons: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    },
    secondaryButton: {
        padding: '12px',
        background: '#f9fafb',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        color: '#4b5563',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s'
    },
    fileInputWrapper: {
        position: 'relative',
        width: '100%'
    },
    fileInput: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0,
        cursor: 'pointer'
    },
    select: {
        width: '100%',
        padding: '12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '14px',
        background: '#ffffff',
        color: '#1f2937',
        cursor: 'pointer'
    },
    routesList: {
        maxHeight: 'calc(100vh - 500px)',
        overflowY: 'auto',
        minHeight: '200px'
    },
    routeItem: {
        padding: '16px',
        marginBottom: '10px',
        background: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
    },
    routeHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '10px'
    },
    routeName: {
        fontWeight: 600,
        color: '#1f2937',
        fontSize: '15px',
        flex: 1
    },
    routeBadges: {
        display: 'flex',
        gap: '6px',
        flexShrink: 0
    },
    badgeSnapped: {
        fontSize: '11px',
        background: '#059669',
        color: '#ffffff',
        padding: '3px 8px',
        borderRadius: '12px',
        fontWeight: 500,
        textTransform: 'uppercase'
    },
    badgeOptimized: {
        fontSize: '11px',
        background: '#7c3aed',
        color: '#ffffff',
        padding: '3px 8px',
        borderRadius: '12px',
        fontWeight: 500,
        textTransform: 'uppercase'
    },
    badgeRegion: {
        fontSize: '11px',
        background: '#4b5563',
        color: '#ffffff',
        padding: '3px 8px',
        borderRadius: '12px',
        fontWeight: 500,
        minWidth: '24px',
        textAlign: 'center'
    },
    routeDetails: {
        display: 'flex',
        gap: '15px',
        marginBottom: '12px',
        fontSize: '13px',
        color: '#6b7280'
    },
    routeDetail: {
        display: 'flex',
        alignItems: 'center'
    },
    routeActions: {
        display: 'flex',
        gap: '8px'
    },
    smallButton: {
        flex: 1,
        padding: '8px 12px',
        background: 'transparent',
        border: '1px solid #d1d5db',
        borderRadius: '5px',
        color: '#4b5563',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontWeight: 500
    },
    emptyState: {
        padding: '40px 20px',
        textAlign: 'center',
        color: '#9ca3af'
    },
    emptyTitle: {
        fontSize: '16px',
        fontWeight: 600,
        marginBottom: '8px',
        color: '#6b7280'
    },
    emptyText: {
        fontSize: '14px',
        marginBottom: '20px'
    },
    emptyButton: {
        background: '#1d4ed8',
        color: '#ffffff',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    selectedRouteCard: {
        padding: '20px',
        background: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        marginTop: 'auto'
    },
    selectedRouteHeader: {
        marginBottom: '15px'
    },
    selectedRouteTitle: {
        color: '#1f2937',
        fontSize: '18px',
        fontWeight: 700,
        marginBottom: '8px',
        letterSpacing: '-0.025em'
    },
    selectedRouteStatus: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
    },
    statusSnapped: {
        fontSize: '12px',
        background: '#d1fae5',
        color: '#065f46',
        padding: '4px 10px',
        borderRadius: '12px',
        fontWeight: 500
    },
    statusManual: {
        fontSize: '12px',
        background: '#fef3c7',
        color: '#92400e',
        padding: '4px 10px',
        borderRadius: '12px',
        fontWeight: 500
    },
    statusOptimized: {
        fontSize: '12px',
        background: '#ede9fe',
        color: '#5b21b6',
        padding: '4px 10px',
        borderRadius: '12px',
        fontWeight: 500
    },
    selectedRouteGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '15px',
        marginBottom: '20px'
    },
    selectedRouteStat: {
        textAlign: 'center',
        padding: '12px',
        background: '#f9fafb',
        borderRadius: '6px',
        border: '1px solid #e5e7eb'
    },
    selectedRouteStatValue: {
        fontSize: '16px',
        fontWeight: 700,
        color: '#1f2937',
        marginBottom: '4px'
    },
    selectedRouteStatLabel: {
        fontSize: '11px',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    },
    regionSelector: {
        marginTop: '15px'
    },
    regionLabel: {
        color: '#4b5563',
        fontSize: '14px',
        fontWeight: 500,
        marginBottom: '8px'
    },
    regionSelect: {
        width: '100%',
        padding: '12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '14px',
        background: '#ffffff',
        color: '#1f2937',
        marginBottom: '10px',
        cursor: 'pointer'
    },
    currentRegion: {
        fontSize: '14px',
        color: '#6b7280',
        padding: '8px',
        background: '#f9fafb',
        borderRadius: '4px',
        textAlign: 'center',
        border: '1px solid #e5e7eb'
    }
};