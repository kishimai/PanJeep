import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { estimateLength, clonePoints, simplifyRoute, validateCoordinate } from "./routeUtils.jsx";
import { supabase } from "./supabase";

// Custom Hook: Point Editing with History
const usePointEditing = (initialPoints = []) => {
    const [points, setPoints] = useState(initialPoints);
    const [history, setHistory] = useState([initialPoints]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const saveToHistory = useCallback((newPoints) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push([...newPoints]);
            return newHistory;
        });
        setHistoryIndex(prev => prev + 1);
    }, [historyIndex]);

    const updatePoint = useCallback((index, lng, lat) => {
        if (!validateCoordinate(lng, 'lng') || !validateCoordinate(lat, 'lat')) {
            return;
        }

        const newPoints = [...points];
        newPoints[index] = [parseFloat(lng), parseFloat(lat)];
        setPoints(newPoints);
        saveToHistory(newPoints);
    }, [points, saveToHistory]);

    const addPoint = useCallback((lng, lat, index = -1) => {
        if (!validateCoordinate(lng, 'lng') || !validateCoordinate(lat, 'lat')) {
            return;
        }

        const newPoint = [parseFloat(lng), parseFloat(lat)];
        let newPoints;

        if (index === -1) {
            newPoints = [...points, newPoint];
        } else {
            newPoints = [...points];
            newPoints.splice(index + 1, 0, newPoint);
        }

        setPoints(newPoints);
        saveToHistory(newPoints);
    }, [points, saveToHistory]);

    const deletePoint = useCallback((index) => {
        if (points.length <= 1) return;

        const newPoints = points.filter((_, i) => i !== index);
        setPoints(newPoints);
        saveToHistory(newPoints);
    }, [points, saveToHistory]);

    const clearPoints = useCallback(() => {
        setPoints([]);
        saveToHistory([]);
    }, [saveToHistory]);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setPoints([...history[newIndex]]);
        }
    }, [history, historyIndex]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setPoints([...history[newIndex]]);
        }
    }, [history, historyIndex]);

    const resetPoints = useCallback((newPoints) => {
        setPoints([...newPoints]);
        setHistory([newPoints]);
        setHistoryIndex(0);
    }, []);

    return {
        points,
        setPoints,
        updatePoint,
        addPoint,
        deletePoint,
        clearPoints,
        undo,
        redo,
        resetPoints,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1
    };
};

// Custom Hook: Route Visualization
const useRouteVisualization = (map, points, activeRouteId, updatePoint) => {
    const markersRef = useRef([]);
    const polylineLayerId = useRef(null);

    const clearVisuals = useCallback(() => {
        markersRef.current.forEach(marker => marker?.remove?.());
        markersRef.current = [];

        if (map && polylineLayerId.current) {
            try {
                if (map.getLayer(polylineLayerId.current)) {
                    map.removeLayer(polylineLayerId.current);
                }
                const sourceId = `editor-source-${activeRouteId}`;
                if (map.getSource(sourceId)) {
                    map.removeSource(sourceId);
                }
            } catch (error) {
                console.warn('Error clearing map layers:', error);
            }
            polylineLayerId.current = null;
        }
    }, [map, activeRouteId]);

    const updateVisuals = useCallback(() => {
        if (!map || !activeRouteId || points.length === 0) {
            clearVisuals();
            return;
        }

        // Clear existing markers
        markersRef.current.forEach(marker => marker?.remove?.());
        markersRef.current = [];

        // Create new markers with accurate positioning
        points.forEach(([lng, lat], i) => {
            const el = document.createElement("div");
            el.style.cssText = `
        width: 18px;
        height: 18px;
        background: #0066CC;
        border: 2px solid #FFFFFF;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        cursor: move;
      `;

            // Add point number
            const number = document.createElement("div");
            number.textContent = i + 1;
            number.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 10px;
        font-weight: bold;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      `;
            el.appendChild(number);

            const marker = new mapboxgl.Marker({
                element: el,
                draggable: true,
                offset: [0, 0]
            })
                .setLngLat([lng, lat])
                .addTo(map);

            marker.on("dragstart", () => {
                el.style.boxShadow = "0 0 0 3px rgba(0,102,204,0.3)";
            });

            marker.on("dragend", () => {
                const { lng: newLng, lat: newLat } = marker.getLngLat();
                updatePoint(i, newLng, newLat);
                el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
            });

            markersRef.current[i] = marker;
        });

        // Update polyline with smooth interpolation
        const sourceId = `editor-source-${activeRouteId}`;
        const layerId = `editor-line-${activeRouteId}`;
        polylineLayerId.current = layerId;

        const lineData = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: points
            }
        };

        try {
            if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                    type: "geojson",
                    data: lineData,
                    lineMetrics: true
                });

                map.addLayer({
                    id: layerId,
                    type: "line",
                    source: sourceId,
                    layout: {
                        "line-join": "round",
                        "line-cap": "round"
                    },
                    paint: {
                        "line-color": '#0066CC',
                        "line-width": 4,
                        "line-opacity": 0.8,
                        "line-gradient": [
                            'interpolate',
                            ['linear'],
                            ['line-progress'],
                            0, '#0066CC',
                            0.5, '#4da6ff',
                            1, '#0066CC'
                        ]
                    }
                });
            } else {
                map.getSource(sourceId).setData(lineData);
            }
        } catch (error) {
            console.warn('Error updating polyline:', error);
        }

        return clearVisuals;
    }, [map, points, activeRouteId, updatePoint, clearVisuals]);

    return { clearVisuals, updateVisuals };
};

// UI Components for RouteEditor
const HeaderSection = ({ activeRoute, exitEditor, undo, redo, canUndo, canRedo }) => (
    <div style={styles.header}>
        <div style={styles.headerLeft}>
            <button onClick={exitEditor} style={styles.backButton}>
                ← Back
            </button>
            <div>
                <div style={styles.title}>Route Editor</div>
                <div style={styles.subtitle}>
                    {activeRoute ? (
                        <>
                            <span>Editing: </span>
                            <span style={{ fontWeight: 500 }}>{activeRoute.name}</span>
                            <span style={{ marginLeft: 8, fontSize: '12px', color: '#6B7280' }}>
                {activeRoute.code}
              </span>
                        </>
                    ) : "Create new route"}
                </div>
            </div>
        </div>

        {activeRoute && (
            <div style={styles.undoRedo}>
                <button
                    onClick={undo}
                    disabled={!canUndo}
                    style={styles.undoButton}
                    title="Undo (Ctrl+Z)"
                >
                    ↶
                </button>
                <button
                    onClick={redo}
                    disabled={!canRedo}
                    style={styles.redoButton}
                    title="Redo (Ctrl+Y)"
                >
                    ↷
                </button>
            </div>
        )}
    </div>
);

const QuickActions = ({ editMode, toggleEditMode, onSnapToRoad, isSnapping, points, onSave, isSaving }) => (
    <div style={styles.quickActions}>
        <button
            onClick={toggleEditMode}
            style={{
                ...styles.quickActionButton,
                background: editMode ? '#DC2626' : '#0066CC'
            }}
            title={editMode ? 'Stop adding points (Esc)' : 'Add points to map'}
        >
            {editMode ? 'Stop Adding' : 'Add Points'}
        </button>
        <button
            onClick={onSnapToRoad}
            disabled={isSnapping || points.length < 2}
            style={{
                ...styles.quickActionButton,
                background: '#7C3AED'
            }}
            title="Snap route to nearest roads"
        >
            {isSnapping ? 'Snapping...' : 'Snap to Road'}
        </button>
        <button
            onClick={onSave}
            disabled={isSaving || points.length < 2}
            style={{
                ...styles.quickActionButton,
                background: '#065F46'
            }}
            title="Save route to database"
        >
            {isSaving ? 'Saving...' : 'Save Route'}
        </button>
    </div>
);

const AdvancedTools = ({
                           simplifyTolerance,
                           setSimplifyTolerance,
                           onSimplify,
                           points,
                           onExport,
                           isExporting,
                           activeRoute
                       }) => (
    <div style={styles.advancedTools}>
        <div style={styles.toolGroup}>
            <div style={styles.toolLabel}>Simplify Route</div>
            <div style={styles.toolControls}>
                <input
                    type="range"
                    min="0.00001"
                    max="0.001"
                    step="0.00001"
                    value={simplifyTolerance}
                    onChange={(e) => setSimplifyTolerance(parseFloat(e.target.value))}
                    style={styles.slider}
                />
                <span style={styles.toleranceValue}>
          {simplifyTolerance.toFixed(5)}
        </span>
                <button
                    onClick={onSimplify}
                    disabled={points.length < 3}
                    style={styles.toolButton}
                >
                    Simplify
                </button>
            </div>
        </div>

        <div style={styles.toolGroup}>
            <div style={styles.toolLabel}>Export Route</div>
            <div style={styles.exportButtons}>
                <button
                    onClick={() => onExport('geojson')}
                    disabled={isExporting || points.length < 2}
                    style={styles.exportButton}
                >
                    {isExporting ? 'Exporting...' : 'GeoJSON'}
                </button>
                <button
                    onClick={() => onExport('gpx')}
                    disabled={isExporting || points.length < 2}
                    style={styles.exportButton}
                >
                    {isExporting ? 'Exporting...' : 'GPX'}
                </button>
            </div>
        </div>
    </div>
);

const RouteSelector = ({ routes, activeRouteId, setActiveRouteId, onDeleteRoute, regions }) => (
    <div style={styles.card}>
        <div style={styles.cardTitle}>Select or Create Route</div>
        <div style={styles.selectRow}>
            <select
                value={activeRouteId || ""}
                onChange={e => setActiveRouteId(e.target.value)}
                style={styles.select}
                aria-label="Select route to edit"
            >
                <option value="">Create New Route</option>
                {routes.map(r => (
                    <option key={r.id} value={r.id}>
                        {r.name || r.code} {r.regionName ? `(${r.regionName})` : ''}
                    </option>
                ))}
            </select>
            {activeRouteId && (
                <button
                    onClick={() => onDeleteRoute(activeRouteId)}
                    style={styles.deleteButton}
                    title="Delete route"
                    aria-label="Delete selected route"
                >
                    Delete
                </button>
            )}
        </div>
    </div>
);

const CreateRouteForm = ({ newRoute, setNewRoute, onCreateRoute, isSaving, regions }) => (
    <div style={styles.card}>
        <div style={styles.cardTitle}>Create New Route</div>
        <div style={styles.formGroup}>
            <div style={styles.label}>Route Name *</div>
            <input
                placeholder="e.g., Main Highway Route"
                value={newRoute.name}
                onChange={e => setNewRoute(prev => ({ ...prev, name: e.target.value }))}
                style={styles.input}
                aria-required="true"
            />
        </div>
        <div style={styles.formGroup}>
            <div style={styles.label}>Route Code *</div>
            <input
                placeholder="e.g., RTE-001"
                value={newRoute.code}
                onChange={e => setNewRoute(prev => ({ ...prev, code: e.target.value }))}
                style={styles.input}
                aria-required="true"
            />
        </div>

        <div style={styles.formGroup}>
            <div style={styles.label}>Region (Optional)</div>
            <select
                value={newRoute.regionId}
                onChange={e => setNewRoute(prev => ({ ...prev, regionId: e.target.value }))}
                style={styles.select}
            >
                <option value="">No Region</option>
                {regions.map(region => (
                    <option key={region.region_id} value={region.region_id}>
                        {region.name} ({region.code})
                    </option>
                ))}
            </select>
        </div>

        <button
            onClick={onCreateRoute}
            disabled={!newRoute.name.trim() || !newRoute.code.trim() || isSaving}
            style={styles.createButton}
            aria-busy={isSaving}
        >
            {isSaving ? 'Creating...' : 'Create Route'}
        </button>
    </div>
);

const RouteStats = ({ routeLength, estimatedTime, points }) => (
    <div style={styles.card}>
        <div style={styles.cardTitle}>Route Information</div>
        <div style={styles.statsGrid}>
            <div style={styles.statCard}>
                <div style={styles.statContent}>
                    <div style={styles.statValue}>{routeLength.toFixed(2)} km</div>
                    <div style={styles.statLabel}>Distance</div>
                </div>
            </div>
            <div style={styles.statCard}>
                <div style={styles.statContent}>
                    <div style={styles.statValue}>~{estimatedTime} min</div>
                    <div style={styles.statLabel}>Estimated Time</div>
                </div>
            </div>
            <div style={styles.statCard}>
                <div style={styles.statContent}>
                    <div style={styles.statValue}>{points.length}</div>
                    <div style={styles.statLabel}>Points</div>
                </div>
            </div>
        </div>
    </div>
);

const RegionAssignment = ({ activeRoute, activeRouteId, updateRoute, regions }) => (
    <div style={styles.card}>
        <div style={styles.cardTitle}>Region Assignment</div>
        <div style={styles.regionSection}>
            <select
                value={activeRoute.regionId || ""}
                onChange={e => {
                    updateRoute(activeRouteId, route => ({
                        ...route,
                        regionId: e.target.value || null
                    }));
                }}
                style={styles.select}
            >
                <option value="">No Region</option>
                {regions.map(region => (
                    <option key={region.region_id} value={region.region_id}>
                        {region.name}
                    </option>
                ))}
            </select>
        </div>
    </div>
);

const PointItem = ({ point, index, isActive, onSelect, onDelete, onUpdate, pointsLength }) => {
    const [lng, lat] = point;

    return (
        <div
            style={{
                ...styles.pointItem,
                borderColor: isActive ? '#0066CC' : '#E2E8F0'
            }}
            onClick={() => onSelect(index)}
        >
            <div style={styles.pointHeader}>
                <div style={styles.pointNumber}>
                    {index + 1}
                </div>
                <div style={styles.pointActions}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(index);
                        }}
                        disabled={pointsLength <= 1}
                        style={styles.pointDelete}
                        title="Delete point"
                        aria-label={`Delete point ${index + 1}`}
                    >
                        ×
                    </button>
                </div>
            </div>
            <div style={styles.coordinateInputs}>
                <div style={styles.coordinateGroup}>
                    <div style={styles.coordinateLabel}>Longitude</div>
                    <input
                        type="text"
                        value={lng.toFixed(6)}
                        onChange={e => onUpdate(index, e.target.value, lat)}
                        onFocus={() => onSelect(index)}
                        style={styles.coordinateInput}
                        aria-label={`Longitude for point ${index + 1}`}
                    />
                </div>
                <div style={styles.coordinateGroup}>
                    <div style={styles.coordinateLabel}>Latitude</div>
                    <input
                        type="text"
                        value={lat.toFixed(6)}
                        onChange={e => onUpdate(index, lng, e.target.value)}
                        onFocus={() => onSelect(index)}
                        style={styles.coordinateInput}
                        aria-label={`Latitude for point ${index + 1}`}
                    />
                </div>
            </div>
        </div>
    );
};

const PointsList = ({
                        points,
                        editMode,
                        activePointIndex,
                        setActivePointIndex,
                        onDeletePoint,
                        onUpdatePoint,
                        onClearPoints
                    }) => (
    <div style={styles.card}>
        <div style={styles.pointsHeader}>
            <div style={styles.cardTitle}>
                Route Points ({points.length})
                {editMode && (
                    <span style={styles.editHint}>
            Click on map to add points
          </span>
                )}
            </div>
            <div style={styles.pointActions}>
                <button
                    onClick={() => {
                        if (points.length > 0) {
                            if (window.confirm("Clear all points? This cannot be undone.")) {
                                onClearPoints();
                            }
                        }
                    }}
                    style={styles.clearButton}
                    disabled={points.length === 0}
                    title="Remove all points"
                >
                    Clear All
                </button>
            </div>
        </div>

        {points.length === 0 ? (
            <div style={styles.emptyPoints}>
                <div style={styles.emptyIcon}>📍</div>
                <div style={styles.emptyTitle}>No points added</div>
                <div style={styles.emptyMessage}>
                    Click "Add Points" then click on the map to add route points
                </div>
                <div style={styles.emptyHint}>
                    Click between existing points to insert new ones
                </div>
            </div>
        ) : (
            <div style={styles.pointsList}>
                {points.map((point, i) => (
                    <PointItem
                        key={i}
                        point={point}
                        index={i}
                        isActive={activePointIndex === i}
                        onSelect={setActivePointIndex}
                        onDelete={onDeletePoint}
                        onUpdate={onUpdatePoint}
                        pointsLength={points.length}
                    />
                ))}
            </div>
        )}
    </div>
);

// Main RouteEditor Component
export function RouteEditor({
                                map,
                                routes,
                                setRoutes,
                                activeRouteId,
                                setActiveRouteId,
                                exitEditor,
                                saveRouteToDatabase,
                                deleteRouteFromDatabase,
                                regions = []
                            }) {
    // State
    const [editMode, setEditMode] = useState(false);
    const [newRoute, setNewRoute] = useState({
        name: "",
        code: "",
        regionId: ""
    });
    const [activePointIndex, setActivePointIndex] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSnapping, setIsSnapping] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [simplifyTolerance, setSimplifyTolerance] = useState(0.0001);

    // Refs
    const clickHandlerRef = useRef(null);
    const contentRef = useRef(null);

    // Memoized values
    const activeRoute = useMemo(
        () => routes.find(r => r.id === activeRouteId),
        [routes, activeRouteId]
    );

    // Custom hooks
    const pointEditing = usePointEditing(activeRoute?.rawPoints || []);
    const { clearVisuals, updateVisuals } = useRouteVisualization(
        map,
        pointEditing.points,
        activeRouteId,
        pointEditing.updatePoint
    );

    const routeLength = useMemo(
        () => estimateLength(pointEditing.points),
        [pointEditing.points]
    );

    const estimatedTime = useMemo(() => {
        return Math.round((routeLength / 30) * 60);
    }, [routeLength]);

    // Update points when active route changes
    useEffect(() => {
        if (activeRoute) {
            pointEditing.resetPoints(activeRoute.rawPoints || []);
        } else {
            pointEditing.resetPoints([]);
        }
    }, [activeRoute]);

    // Update visualization
    useEffect(() => {
        updateVisuals();
    }, [updateVisuals]);

    // Helper function for distance calculation
    const distanceToSegment = useCallback((point, segmentStart, segmentEnd) => {
        const [px, py] = point;
        const [x1, y1] = segmentStart;
        const [x2, y2] = segmentEnd;

        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }, []);

    /* ---------------- Enhanced Map Click Handler ---------------- */
    const handleMapClick = useCallback((e) => {
        if (!editMode || !activeRouteId) return;

        // Get precise coordinates from the click event
        const { lng, lat } = e.lngLat;

        // Check if we're clicking near an existing point
        const clickThreshold = 0.0001; // ~11 meters
        let insertAtIndex = -1;

        for (let i = 0; i < pointEditing.points.length - 1; i++) {
            const [lng1, lat1] = pointEditing.points[i];
            const [lng2, lat2] = pointEditing.points[i + 1];

            // Calculate distance to line segment
            const distance = distanceToSegment([lng, lat], [lng1, lat1], [lng2, lat2]);

            if (distance < clickThreshold) {
                insertAtIndex = i;
                break;
            }
        }

        pointEditing.addPoint(lng, lat, insertAtIndex);

        // Visual feedback
        if (map) {
            const popup = new mapboxgl.Popup({ closeButton: false })
                .setLngLat([lng, lat])
                .setHTML(`<div style="padding: 4px; font-size: 12px;">Point added</div>`)
                .addTo(map);

            setTimeout(() => popup.remove(), 1000);
        }
    }, [editMode, activeRouteId, pointEditing, map, distanceToSegment]);

    /* ---------------- Enhanced Snap to Road ---------------- */
    const snapToRoad = useCallback(async () => {
        if (pointEditing.points.length < 2) {
            alert("At least 2 points are required to snap to roads");
            return;
        }

        setIsSnapping(true);
        let abortController = new AbortController();

        try {
            const coordinates = pointEditing.points
                .map(p => `${p[0]},${p[1]}`)
                .join(';');

            const accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

            if (!accessToken) {
                throw new Error("Mapbox access token not found");
            }

            const response = await fetch(
                `https://api.mapbox.com/matching/v5/mapbox/driving/${coordinates}?access_token=${accessToken}&geometries=geojson&steps=true&overview=simplified`,
                { signal: abortController.signal }
            );

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again in a minute.');
                }
                throw new Error(`HTTP ${response.status}: Failed to connect to Mapbox`);
            }

            const data = await response.json();

            if (data.code !== 'Ok' || !data.matchings?.[0]?.geometry?.coordinates) {
                if (data.code === 'NoSegment') {
                    throw new Error('No road segment found for these points. Try adding more points.');
                }
                throw new Error(`Map matching failed: ${data.message || 'Unknown error'}`);
            }

            const snappedCoordinates = data.matchings[0].geometry.coordinates;
            pointEditing.resetPoints(snappedCoordinates);

            // Show success message
            if (map) {
                const popup = new mapboxgl.Popup({ closeButton: false })
                    .setLngLat(snappedCoordinates[Math.floor(snappedCoordinates.length / 2)])
                    .setHTML('<div style="padding: 8px; background: #10B981; color: white; border-radius: 4px;">✓ Route snapped successfully</div>')
                    .addTo(map);

                setTimeout(() => popup.remove(), 3000);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Snap request cancelled');
                return;
            }
            console.error('Error snapping to road:', error);
            alert(`Failed to snap to roads: ${error.message}`);
        } finally {
            setIsSnapping(false);
        }
    }, [pointEditing, map]);

    /* ---------------- Route CRUD ---------------- */
    const createRoute = useCallback(async () => {
        if (!newRoute.name.trim() || !newRoute.code.trim()) {
            alert("Please enter route name and code");
            return;
        }

        try {
            setIsSaving(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('Please log in to create routes.');
                return;
            }

            const routeData = {
                route_code: newRoute.code.trim(),
                origin_type: 'field',
                proposed_by_user_id: user.id,
                credited_by_operator_id: user.id, // ADD THIS LINE
                status: 'draft',
                geometry: {
                    type: 'LineString',
                    coordinates: [],
                    properties: {
                        color: '#0066CC',
                        name: newRoute.name.trim()
                    }
                },
                region_id: newRoute.regionId || null,
                length_meters: 0,
                last_geometry_update_at: new Date().toISOString()
            };

            const { data: newRouteDb, error } = await supabase
                .from('routes')
                .insert([routeData])
                .select(`
          *,
          region:region_id (
            region_id,
            name,
            code
          )
        `)
                .single();

            if (error) throw error;

            const editorRoute = {
                id: newRouteDb.id,
                name: newRoute.name.trim(),
                code: newRouteDb.route_code,
                color: '#0066CC',
                rawPoints: [],
                snappedPoints: null,
                regionId: newRouteDb.region_id,
                regionName: newRouteDb.region?.name,
                status: newRouteDb.status,
                length_meters: newRouteDb.length_meters,
                created_at: newRouteDb.created_at,
                updated_at: newRouteDb.updated_at
            };

            setRoutes(prev => [editorRoute, ...prev]);
            setActiveRouteId(newRouteDb.id);
            setNewRoute({ name: "", code: "", regionId: "" });
            pointEditing.resetPoints([]);

            alert(`Route "${newRoute.name.trim()}" created`);
        } catch (error) {
            console.error('Error creating route:', error);
            alert(`Failed: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    }, [newRoute, setRoutes, setActiveRouteId, pointEditing]);

    const deleteRoute = useCallback(async (id) => {
        if (!window.confirm("Are you sure you want to delete this route? This action cannot be undone.")) return;

        try {
            await deleteRouteFromDatabase(id);

            // Clear points if this was the active route
            if (activeRouteId === id) {
                pointEditing.resetPoints([]);
            }

            alert("Route deleted");
        } catch (error) {
            console.error('Error deleting route:', error);
            alert("Failed to delete route");
        }
    }, [activeRouteId, deleteRouteFromDatabase, pointEditing]);

    const saveRoute = useCallback(async () => {
        if (!activeRoute || pointEditing.points.length < 2) {
            alert("Route must have at least 2 points");
            return;
        }

        try {
            setIsSaving(true);

            const routeToSave = {
                ...activeRoute,
                rawPoints: pointEditing.points,
                length_meters: routeLength * 1000 // Convert km to meters
            };

            await saveRouteToDatabase(routeToSave);
            alert("Route saved successfully");
        } catch (error) {
            console.error('Error saving route:', error);
            alert(`Failed to save route: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    }, [activeRoute, saveRouteToDatabase, pointEditing.points, routeLength]);

    /* ---------------- Enhanced Route Operations ---------------- */
    const simplifyRoutePoints = useCallback(() => {
        if (pointEditing.points.length < 3) {
            alert("Route needs at least 3 points to simplify");
            return;
        }

        const simplified = simplifyRoute(pointEditing.points, simplifyTolerance);
        if (simplified.length < pointEditing.points.length) {
            pointEditing.resetPoints(simplified);
            alert(`Simplified from ${pointEditing.points.length} to ${simplified.length} points`);
        } else {
            alert("No simplification possible with current tolerance");
        }
    }, [pointEditing, simplifyTolerance]);

    const exportRoute = useCallback(async (format = 'geojson') => {
        if (pointEditing.points.length < 2) {
            alert("Route must have at least 2 points to export");
            return;
        }

        setIsExporting(true);
        try {
            const geojson = {
                type: "Feature",
                properties: {
                    name: activeRoute?.name || "Unnamed Route",
                    code: activeRoute?.code || "",
                    length_km: routeLength,
                    point_count: pointEditing.points.length,
                    created: new Date().toISOString()
                },
                geometry: {
                    type: "LineString",
                    coordinates: pointEditing.points
                }
            };

            let content, filename, mimeType;

            if (format === 'geojson') {
                content = JSON.stringify(geojson, null, 2);
                filename = `${activeRoute?.code || 'route'}.geojson`;
                mimeType = 'application/geo+json';
            } else if (format === 'gpx') {
                // Convert to GPX format
                const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Route Editor" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${activeRoute?.name || 'Unnamed Route'}</name>
    <trkseg>
${pointEditing.points.map(([lng, lat]) => `      <trkpt lat="${lat}" lon="${lng}"></trkpt>`).join('\n')}
    </trkseg>
  </trk>
</gpx>`;
                content = gpx;
                filename = `${activeRoute?.code || 'route'}.gpx`;
                mimeType = 'application/gpx+xml';
            }

            // Create download link
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert(`Route exported as ${format.toUpperCase()}`);
        } catch (error) {
            console.error('Error exporting route:', error);
            alert(`Failed to export route: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    }, [pointEditing.points, activeRoute, routeLength]);

    const updateRoute = useCallback((id, updater) => {
        setRoutes(prev => prev.map(r => (r.id === id ? updater(r) : r)));
    }, [setRoutes]);

    /* ---------------- Map Interaction Setup ---------------- */
    useEffect(() => {
        if (!map || !activeRouteId) return;

        if (editMode) {
            // Remove any existing click handler
            if (clickHandlerRef.current) {
                map.off("click", clickHandlerRef.current);
            }

            // Add new click handler with better precision
            clickHandlerRef.current = handleMapClick;
            map.on("click", handleMapClick);

            map.getCanvas().style.cursor = 'crosshair';

            // Add keyboard shortcuts
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    setEditMode(false);
                } else if (e.ctrlKey && e.key === 'z') {
                    e.preventDefault();
                    pointEditing.undo();
                } else if (e.ctrlKey && e.key === 'y') {
                    e.preventDefault();
                    pointEditing.redo();
                }
            };

            window.addEventListener('keydown', handleKeyDown);

            return () => {
                map.off("click", handleMapClick);
                map.getCanvas().style.cursor = '';
                window.removeEventListener('keydown', handleKeyDown);
            };
        } else {
            map.getCanvas().style.cursor = '';
        }
    }, [map, editMode, activeRouteId, handleMapClick, pointEditing]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearVisuals();
        };
    }, [clearVisuals]);

    const toggleEditMode = useCallback(() => {
        setEditMode(!editMode);
        setActivePointIndex(null);
    }, [editMode]);

    return (
        <div style={styles.container}>
            <HeaderSection
                activeRoute={activeRoute}
                exitEditor={exitEditor}
                undo={pointEditing.undo}
                redo={pointEditing.redo}
                canUndo={pointEditing.canUndo}
                canRedo={pointEditing.canRedo}
            />

            <div ref={contentRef} style={styles.content}>
                {activeRoute && (
                    <>
                        <QuickActions
                            editMode={editMode}
                            toggleEditMode={toggleEditMode}
                            onSnapToRoad={snapToRoad}
                            isSnapping={isSnapping}
                            points={pointEditing.points}
                            onSave={saveRoute}
                            isSaving={isSaving}
                        />

                        <AdvancedTools
                            simplifyTolerance={simplifyTolerance}
                            setSimplifyTolerance={setSimplifyTolerance}
                            onSimplify={simplifyRoutePoints}
                            points={pointEditing.points}
                            onExport={exportRoute}
                            isExporting={isExporting}
                            activeRoute={activeRoute}
                        />
                    </>
                )}

                <RouteSelector
                    routes={routes}
                    activeRouteId={activeRouteId}
                    setActiveRouteId={setActiveRouteId}
                    onDeleteRoute={deleteRoute}
                    regions={regions}
                />

                {!activeRouteId && (
                    <CreateRouteForm
                        newRoute={newRoute}
                        setNewRoute={setNewRoute}
                        onCreateRoute={createRoute}
                        isSaving={isSaving}
                        regions={regions}
                    />
                )}

                {activeRoute && (
                    <>
                        <RouteStats
                            routeLength={routeLength}
                            estimatedTime={estimatedTime}
                            points={pointEditing.points}
                        />

                        <RegionAssignment
                            activeRoute={activeRoute}
                            activeRouteId={activeRouteId}
                            updateRoute={updateRoute}
                            regions={regions}
                        />

                        <PointsList
                            points={pointEditing.points}
                            editMode={editMode}
                            activePointIndex={activePointIndex}
                            setActivePointIndex={setActivePointIndex}
                            onDeletePoint={pointEditing.deletePoint}
                            onUpdatePoint={pointEditing.updatePoint}
                            onClearPoints={pointEditing.clearPoints}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#F8FAFC',
        color: '#1E293B'
    },
    header: {
        padding: '16px 20px',
        borderBottom: '1px solid #E2E8F0',
        background: '#FFFFFF',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    undoRedo: {
        display: 'flex',
        gap: '4px'
    },
    undoButton: {
        background: '#F1F5F9',
        border: '1px solid #CBD5E1',
        color: '#475569',
        padding: '6px 10px',
        borderRadius: '4px',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover:not(:disabled)': {
            background: '#E2E8F0'
        },
        '&:disabled': {
            opacity: 0.5,
            cursor: 'not-allowed'
        }
    },
    redoButton: {
        background: '#F1F5F9',
        border: '1px solid #CBD5E1',
        color: '#475569',
        padding: '6px 10px',
        borderRadius: '4px',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover:not(:disabled)': {
            background: '#E2E8F0'
        },
        '&:disabled': {
            opacity: 0.5,
            cursor: 'not-allowed'
        }
    },
    backButton: {
        background: 'transparent',
        border: '1px solid #CBD5E1',
        color: '#475569',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background 0.2s',
        '&:hover': {
            background: '#F1F5F9'
        }
    },
    title: {
        margin: 0,
        color: '#1E293B',
        fontSize: '16px',
        fontWeight: 600
    },
    subtitle: {
        color: '#64748B',
        fontSize: '13px',
        marginTop: '2px',
        display: 'flex',
        alignItems: 'center'
    },
    content: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    quickActions: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
    },
    advancedTools: {
        background: '#FFFFFF',
        borderRadius: '6px',
        padding: '16px',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    toolGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    toolLabel: {
        fontSize: '13px',
        fontWeight: 500,
        color: '#475569'
    },
    toolControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    slider: {
        flex: 1,
        height: '4px',
        borderRadius: '2px',
        background: '#E2E8F0',
        outline: 'none',
        '&::-webkit-slider-thumb': {
            appearance: 'none',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: '#0066CC',
            cursor: 'pointer'
        }
    },
    toleranceValue: {
        fontSize: '12px',
        color: '#64748B',
        minWidth: '60px',
        fontFamily: 'monospace'
    },
    toolButton: {
        background: '#F1F5F9',
        border: '1px solid #CBD5E1',
        color: '#475569',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background 0.2s',
        '&:hover': {
            background: '#E2E8F0'
        },
        '&:disabled': {
            opacity: 0.5,
            cursor: 'not-allowed'
        }
    },
    exportButtons: {
        display: 'flex',
        gap: '8px'
    },
    exportButton: {
        flex: 1,
        background: '#F1F5F9',
        border: '1px solid #CBD5E1',
        color: '#475569',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background 0.2s',
        '&:hover': {
            background: '#E2E8F0'
        },
        '&:disabled': {
            opacity: 0.5,
            cursor: 'not-allowed'
        }
    },
    quickActionButton: {
        flex: 1,
        minWidth: '120px',
        background: '#0066CC',
        color: '#FFFFFF',
        border: 'none',
        padding: '10px 16px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '&:hover': {
            opacity: 0.9
        },
        '&:disabled': {
            opacity: 0.6,
            cursor: 'not-allowed'
        }
    },
    card: {
        background: '#FFFFFF',
        borderRadius: '6px',
        padding: '16px',
        border: '1px solid #E2E8F0'
    },
    cardTitle: {
        color: '#1E293B',
        fontSize: '14px',
        fontWeight: 600,
        marginBottom: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    editHint: {
        fontSize: '12px',
        fontWeight: 'normal',
        color: '#94A3B8',
        fontStyle: 'italic'
    },
    selectRow: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
    },
    select: {
        flex: 1,
        padding: '10px 12px',
        border: '1px solid #CBD5E1',
        borderRadius: '6px',
        fontSize: '13px',
        background: '#FFFFFF',
        color: '#1E293B',
        cursor: 'pointer',
        '&:focus': {
            outline: 'none',
            borderColor: '#0066CC',
            boxShadow: '0 0 0 3px rgba(0,102,204,0.1)'
        }
    },
    deleteButton: {
        background: '#DC2626',
        color: '#FFFFFF',
        border: 'none',
        padding: '10px 12px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background 0.2s',
        '&:hover': {
            background: '#B91C1C'
        }
    },
    input: {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #CBD5E1',
        borderRadius: '6px',
        fontSize: '13px',
        background: '#FFFFFF',
        color: '#1E293B',
        '&:focus': {
            outline: 'none',
            borderColor: '#0066CC',
            boxShadow: '0 0 0 3px rgba(0,102,204,0.1)'
        }
    },
    formGroup: {
        marginBottom: '16px'
    },
    label: {
        color: '#475569',
        fontSize: '13px',
        fontWeight: 500,
        marginBottom: '6px',
        display: 'block'
    },
    createButton: {
        width: '100%',
        background: '#0066CC',
        color: '#FFFFFF',
        border: 'none',
        padding: '12px',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background 0.2s',
        '&:hover': {
            background: '#0052A3'
        },
        '&:disabled': {
            opacity: 0.6,
            cursor: 'not-allowed'
        }
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px'
    },
    statCard: {
        padding: '12px',
        background: '#F8FAFC',
        borderRadius: '6px',
        border: '1px solid #E2E8F0'
    },
    statContent: {
        display: 'flex',
        flexDirection: 'column'
    },
    statValue: {
        fontSize: '16px',
        fontWeight: 600,
        color: '#1E293B',
        marginBottom: '2px'
    },
    statLabel: {
        fontSize: '12px',
        color: '#64748B'
    },
    regionSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    pointsHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
    },
    pointActions: {
        display: 'flex',
        gap: '8px'
    },
    clearButton: {
        background: 'transparent',
        border: '1px solid #CBD5E1',
        color: '#64748B',
        padding: '6px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background 0.2s',
        '&:hover': {
            background: '#F1F5F9'
        },
        '&:disabled': {
            opacity: 0.5,
            cursor: 'not-allowed'
        }
    },
    emptyPoints: {
        padding: '40px 20px',
        textAlign: 'center',
        color: '#94A3B8',
        background: '#F8FAFC',
        borderRadius: '6px',
        border: '2px dashed #E2E8F0'
    },
    emptyIcon: {
        fontSize: '32px',
        marginBottom: '12px'
    },
    emptyTitle: {
        fontSize: '14px',
        fontWeight: 500,
        marginBottom: '4px',
        color: '#64748B'
    },
    emptyMessage: {
        fontSize: '13px',
        maxWidth: '250px',
        margin: '0 auto 8px',
        lineHeight: '1.4'
    },
    emptyHint: {
        fontSize: '12px',
        color: '#94A3B8',
        fontStyle: 'italic'
    },
    pointsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '300px',
        overflowY: 'auto'
    },
    pointItem: {
        padding: '12px',
        background: '#F8FAFC',
        borderRadius: '4px',
        border: '2px solid #E2E8F0',
        cursor: 'pointer',
        transition: 'border-color 0.2s',
        '&:hover': {
            borderColor: '#CBD5E1'
        }
    },
    pointHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
    },
    pointNumber: {
        width: '24px',
        height: '24px',
        background: '#0066CC',
        color: '#FFFFFF',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 500,
        flexShrink: 0
    },
    pointDelete: {
        width: '24px',
        height: '24px',
        background: '#DC2626',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '4px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s',
        '&:hover': {
            background: '#B91C1C'
        },
        '&:disabled': {
            opacity: 0.5,
            cursor: 'not-allowed'
        }
    },
    coordinateInputs: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px'
    },
    coordinateGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    coordinateLabel: {
        fontSize: '11px',
        color: '#64748B',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    },
    coordinateInput: {
        padding: '8px 10px',
        border: '1px solid #CBD5E1',
        borderRadius: '4px',
        fontSize: '13px',
        background: '#FFFFFF',
        color: '#1E293B',
        fontFamily: 'monospace',
        '&:focus': {
            outline: 'none',
            borderColor: '#0066CC',
            boxShadow: '0 0 0 2px rgba(0,102,204,0.1)'
        }
    }
};