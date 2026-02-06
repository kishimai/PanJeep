import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { createEmptyRoute } from "./routeModel.jsx";
import { estimateLength, clonePoints } from "./routeUtils.jsx";

export function RouteEditor({
                                map,
                                routes,
                                setRoutes,
                                activeRouteId,
                                setActiveRouteId,
                                exitEditor
                            }) {
    const [editMode, setEditMode] = useState(false);
    const [routeName, setRouteName] = useState("");
    const [routeCode, setRouteCode] = useState("");
    const [routeColor, setRouteColor] = useState("#1d4ed8");
    const [activePointIndex, setActivePointIndex] = useState(null);

    const activeRoute = useMemo(
        () => routes.find(r => r.id === activeRouteId),
        [routes, activeRouteId]
    );

    const markersRef = useRef([]);
    const polylineLayerId = useRef(null);

    /* ---------------- Core Functions ---------------- */

    const pushHistory = useCallback((route) => ({
        ...route,
        history: [...route.history, clonePoints(route.rawPoints)],
        future: []
    }), []);

    const updateRoute = useCallback((id, updater) => {
        setRoutes(prev =>
            prev.map(r => (r.id === id ? updater(r) : r))
        );
    }, [setRoutes]);

    const clearEditorVisuals = useCallback(() => {
        markersRef.current.forEach(m => m?.remove?.());
        markersRef.current = [];

        if (map && polylineLayerId.current && map.getLayer(polylineLayerId.current)) {
            const sourceId = `editor-source-${activeRouteId}`;
            map.removeLayer(polylineLayerId.current);
            if (map.getSource(sourceId)) map.removeSource(sourceId);
            polylineLayerId.current = null;
        }
    }, [map, activeRouteId]);

    /* ---------------- Route CRUD ---------------- */

    const createRoute = useCallback(() => {
        if (!routeName.trim()) {
            alert("Please enter a route name");
            return;
        }

        const route = createEmptyRoute({
            name: routeName,
            code: routeCode,
            color: routeColor
        });

        setRoutes(prev => [route, ...prev]);
        setActiveRouteId(route.id);

        // Reset form
        setRouteName("");
        setRouteCode("");
        setRouteColor("#1d4ed8");
    }, [routeName, routeCode, routeColor, setRoutes, setActiveRouteId]);

    const deleteRoute = useCallback((id) => {
        if (!window.confirm("Are you sure you want to delete this route? This action cannot be undone.")) return;

        clearEditorVisuals();
        setRoutes(prev => prev.filter(r => r.id !== id));
        if (activeRouteId === id) {
            setActiveRouteId(null);
            setActivePointIndex(null);
        }
    }, [clearEditorVisuals, setRoutes, activeRouteId, setActiveRouteId]);

    /* ---------------- Point Editing ---------------- */

    useEffect(() => {
        if (!map || !editMode || !activeRouteId) return;

        const onClick = (e) => {
            updateRoute(activeRouteId, route => {
                const updated = pushHistory(route);
                return {
                    ...updated,
                    rawPoints: [...route.rawPoints, [e.lngLat.lng, e.lngLat.lat]],
                    snappedPoints: null
                };
            });
        };

        map.on("click", onClick);
        return () => map.off("click", onClick);
    }, [map, editMode, activeRouteId, updateRoute, pushHistory]);

    const updatePoint = useCallback((index, lng, lat) => {
        if (!activeRouteId) return;

        updateRoute(activeRouteId, route => {
            const updated = pushHistory(route);
            const pts = clonePoints(route.rawPoints);
            pts[index] = [parseFloat(lng) || 0, parseFloat(lat) || 0];
            return { ...updated, rawPoints: pts, snappedPoints: null };
        });
    }, [activeRouteId, updateRoute, pushHistory]);

    const deletePoint = useCallback((index) => {
        if (!activeRouteId) return;

        updateRoute(activeRouteId, route => {
            const updated = pushHistory(route);
            const newPoints = route.rawPoints.filter((_, i) => i !== index);
            return {
                ...updated,
                rawPoints: newPoints,
                snappedPoints: null
            };
        });
        setActivePointIndex(null);
    }, [activeRouteId, updateRoute, pushHistory]);

    /* ---------------- Undo / Redo ---------------- */

    const undo = useCallback(() => {
        if (!activeRouteId) return;

        updateRoute(activeRouteId, route => {
            if (!route.history.length) return route;
            const previous = route.history.at(-1);
            return {
                ...route,
                rawPoints: clonePoints(previous),
                history: route.history.slice(0, -1),
                future: [clonePoints(route.rawPoints), ...route.future],
                snappedPoints: null
            };
        });
        setActivePointIndex(null);
    }, [activeRouteId, updateRoute]);

    const redo = useCallback(() => {
        if (!activeRouteId) return;

        updateRoute(activeRouteId, route => {
            if (!route.future.length) return route;
            const next = route.future[0];
            return {
                ...route,
                rawPoints: clonePoints(next),
                history: [...route.history, clonePoints(route.rawPoints)],
                future: route.future.slice(1),
                snappedPoints: null
            };
        });
        setActivePointIndex(null);
    }, [activeRouteId, updateRoute]);

    /* ---------------- Map Markers & Polyline ---------------- */

    useEffect(() => {
        if (!map) return;
        return () => clearEditorVisuals();
    }, [map, clearEditorVisuals]);

    useEffect(() => {
        if (!map) return;
        if (!activeRoute || activeRoute.rawPoints.length === 0) {
            clearEditorVisuals();
            return;
        }

        const pointsToShow = activeRoute.snappedPoints || activeRoute.rawPoints;

        // Update markers
        markersRef.current.forEach((marker, i) => {
            if (i >= pointsToShow.length) marker?.remove?.();
        });

        pointsToShow.forEach(([lng, lat], i) => {
            let marker = markersRef.current[i];
            const isActive = i === activePointIndex;

            if (!marker) {
                const el = document.createElement("div");
                el.style.cssText = `
                    width: ${isActive ? '20px' : '16px'};
                    height: ${isActive ? '20px' : '16px'};
                    background: ${activeRoute.color || '#1d4ed8'};
                    border: ${isActive ? '3px solid #f59e0b' : '2px solid #ffffff'};
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    cursor: move;
                `;

                marker = new mapboxgl.Marker({ element: el, draggable: true })
                    .setLngLat([lng, lat])
                    .addTo(map);

                marker.on("dragend", () => {
                    const { lng, lat } = marker.getLngLat();
                    updatePoint(i, lng, lat);
                });

                markersRef.current[i] = marker;
            } else {
                marker.setLngLat([lng, lat]);
                const el = marker.getElement();
                el.style.width = isActive ? '20px' : '16px';
                el.style.height = isActive ? '20px' : '16px';
                el.style.border = isActive ? '3px solid #f59e0b' : '2px solid #ffffff';
            }
        });

        markersRef.current = markersRef.current.slice(0, pointsToShow.length);

        // Update polyline
        const sourceId = `editor-source-${activeRouteId}`;
        const layerId = `editor-line-${activeRouteId}`;
        polylineLayerId.current = layerId;

        const lineData = {
            type: "Feature",
            geometry: { type: "LineString", coordinates: pointsToShow }
        };

        if (map.getSource(sourceId)) {
            map.getSource(sourceId).setData(lineData);
        } else {
            map.addSource(sourceId, { type: "geojson", data: lineData });
            if (!map.getLayer(layerId)) {
                map.addLayer({
                    id: layerId,
                    type: "line",
                    source: sourceId,
                    layout: { "line-join": "round", "line-cap": "round" },
                    paint: {
                        "line-color": activeRoute.color || '#1d4ed8',
                        "line-width": 4,
                        "line-dasharray": [2, 2],
                        "line-opacity": 0.8
                    }
                });
            }
        }
    }, [activeRouteId, activeRoute, map, activePointIndex, updatePoint]);

    /* ---------------- Cleanup ---------------- */

    useEffect(() => {
        return () => clearEditorVisuals();
    }, [clearEditorVisuals]);

    /* ---------------- Route Statistics ---------------- */

    const displayPoints = activeRoute?.snappedPoints || activeRoute?.rawPoints || [];
    const length = estimateLength(displayPoints);
    const eta = Math.round((length / 30) * 60);

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h2 style={styles.title}>Route Editor</h2>
                    <div style={styles.subtitle}>
                        {activeRoute ? `Editing: ${activeRoute.name}` : "Create new route"}
                    </div>
                </div>
                <button onClick={exitEditor} style={styles.backButton}>
                    ← Back to Routes
                </button>
            </div>

            {/* Scrollable Content */}
            <div style={styles.content}>
                {/* Route Selection */}
                <div style={styles.card}>
                    <div style={styles.sectionTitle}>Select or Create Route</div>
                    <div style={styles.row}>
                        <select
                            value={activeRouteId || ""}
                            onChange={e => {
                                setActiveRouteId(e.target.value);
                                setActivePointIndex(null);
                            }}
                            style={styles.select}
                        >
                            <option value="">Create New Route</option>
                            {routes.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.name || `Route ${r.code || r.id.slice(0, 8)}`}
                                </option>
                            ))}
                        </select>
                        {activeRouteId && (
                            <button
                                onClick={() => deleteRoute(activeRouteId)}
                                style={styles.dangerButton}
                            >
                                Delete
                            </button>
                        )}
                    </div>
                </div>

                {/* Create Route Form */}
                <div style={styles.card}>
                    <div style={styles.sectionTitle}>Create New Route</div>
                    <input
                        placeholder="Route Name *"
                        value={routeName}
                        onChange={e => setRouteName(e.target.value)}
                        style={styles.input}
                    />
                    <input
                        placeholder="Route Code (Optional)"
                        value={routeCode}
                        onChange={e => setRouteCode(e.target.value)}
                        style={styles.input}
                    />
                    <div style={{...styles.row, marginTop: '10px', alignItems: 'center'}}>
                        <div style={styles.label}>Color:</div>
                        <input
                            type="color"
                            value={routeColor}
                            onChange={e => setRouteColor(e.target.value)}
                            style={styles.colorInput}
                        />
                        <div style={{...styles.colorPreview, backgroundColor: routeColor}}></div>
                    </div>
                    <button
                        onClick={createRoute}
                        disabled={!routeName.trim()}
                        style={{
                            ...styles.primaryButton,
                            opacity: !routeName.trim() ? 0.6 : 1
                        }}
                    >
                        Create Route
                    </button>
                </div>

                {/* Controls */}
                <div style={styles.card}>
                    <div style={styles.sectionTitle}>Editing Controls</div>
                    <div style={styles.buttonGrid}>
                        <button
                            onClick={() => setEditMode(!editMode)}
                            style={{
                                ...styles.secondaryButton,
                                background: editMode ? '#059669' : '#6b7280',
                                color: '#fff',
                                border: 'none'
                            }}
                        >
                            {editMode ? '✓ Adding Points' : 'Add Points'}
                        </button>
                        <button
                            onClick={undo}
                            disabled={!activeRoute?.history?.length}
                            style={{
                                ...styles.secondaryButton,
                                opacity: activeRoute?.history?.length ? 1 : 0.5
                            }}
                        >
                            Undo
                        </button>
                        <button
                            onClick={redo}
                            disabled={!activeRoute?.future?.length}
                            style={{
                                ...styles.secondaryButton,
                                opacity: activeRoute?.future?.length ? 1 : 0.5
                            }}
                        >
                            Redo
                        </button>
                    </div>
                    <div style={styles.editNote}>
                        {editMode
                            ? "Click on the map to add route points"
                            : "Turn on 'Add Points' to start drawing"}
                    </div>
                </div>

                {/* Route Details */}
                {activeRoute && (
                    <div style={styles.card}>
                        <div style={styles.routeHeader}>
                            <div style={styles.sectionTitle}>Route Details</div>
                            <div style={styles.statsRow}>
                                <div style={styles.statItem}>
                                    <div style={styles.statValue}>{length.toFixed(2)}</div>
                                    <div style={styles.statLabel}>km</div>
                                </div>
                                <div style={styles.statItem}>
                                    <div style={styles.statValue}>~{eta}</div>
                                    <div style={styles.statLabel}>min</div>
                                </div>
                                <div style={styles.statItem}>
                                    <div style={styles.statValue}>{displayPoints.length}</div>
                                    <div style={styles.statLabel}>points</div>
                                </div>
                            </div>
                        </div>

                        <div style={styles.pointsHeader}>
                            <div style={styles.pointsTitle}>Route Points ({activeRoute.rawPoints.length})</div>
                            <button
                                onClick={() => {
                                    const points = activeRoute.rawPoints.map(p => p.join(', ')).join('\n');
                                    navigator.clipboard.writeText(points);
                                    alert('Points copied to clipboard');
                                }}
                                style={styles.smallButton}
                            >
                                Copy All
                            </button>
                        </div>

                        <div style={styles.pointsContainer}>
                            {activeRoute.rawPoints.map(([lng, lat], i) => (
                                <div key={i} style={styles.pointRow}>
                                    <div style={styles.pointNumber}>{i + 1}</div>
                                    <input
                                        value={lng.toFixed(6)}
                                        onChange={e => updatePoint(i, e.target.value, lat)}
                                        onFocus={() => setActivePointIndex(i)}
                                        onBlur={() => setActivePointIndex(null)}
                                        style={styles.coordinateInput}
                                        placeholder="Longitude"
                                    />
                                    <input
                                        value={lat.toFixed(6)}
                                        onChange={e => updatePoint(i, lng, e.target.value)}
                                        onFocus={() => setActivePointIndex(i)}
                                        onBlur={() => setActivePointIndex(null)}
                                        style={styles.coordinateInput}
                                        placeholder="Latitude"
                                    />
                                    <button
                                        onClick={() => deletePoint(i)}
                                        disabled={activeRoute.rawPoints.length <= 1}
                                        style={{
                                            ...styles.deletePointButton,
                                            opacity: activeRoute.rawPoints.length <= 1 ? 0.5 : 1
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>

                        {activeRoute.rawPoints.length === 0 && (
                            <div style={styles.emptyState}>
                                <div style={styles.emptyIcon}>📍</div>
                                <div style={styles.emptyText}>No points added yet.</div>
                                <div style={styles.emptySubtext}>Turn on "Add Points" and click on the map to add points.</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        background: '#ffffff'
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
        margin: 0,
        color: '#1f2937',
        fontSize: '20px',
        fontWeight: 700,
        letterSpacing: '-0.025em'
    },
    subtitle: {
        color: '#6b7280',
        fontSize: '14px',
        marginTop: '4px'
    },
    backButton: {
        background: 'transparent',
        border: '1px solid #d1d5db',
        color: '#4b5563',
        padding: '8px 16px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 500,
        fontSize: '14px',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap'
    },
    content: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    card: {
        background: '#f9fafb',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
    },
    sectionTitle: {
        color: '#374151',
        fontSize: '16px',
        fontWeight: 600,
        marginBottom: '15px',
        letterSpacing: '-0.01em'
    },
    row: {
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
    },
    select: {
        flex: 1,
        padding: '10px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '14px',
        background: '#ffffff',
        color: '#1f2937',
        cursor: 'pointer'
    },
    input: {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '14px',
        marginBottom: '10px',
        background: '#ffffff',
        color: '#1f2937',
        boxSizing: 'border-box'
    },
    label: {
        color: '#4b5563',
        fontSize: '14px',
        fontWeight: 500,
        minWidth: '50px'
    },
    colorInput: {
        width: '40px',
        height: '40px',
        padding: 0,
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        cursor: 'pointer'
    },
    colorPreview: {
        width: '24px',
        height: '24px',
        borderRadius: '4px',
        border: '1px solid #d1d5db',
        marginLeft: '10px'
    },
    primaryButton: {
        width: '100%',
        background: '#1d4ed8',
        color: '#ffffff',
        border: 'none',
        padding: '12px',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        marginTop: '10px',
        transition: 'background-color 0.2s'
    },
    secondaryButton: {
        flex: 1,
        background: '#ffffff',
        color: '#4b5563',
        border: '1px solid #d1d5db',
        padding: '10px',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    editNote: {
        marginTop: '15px',
        padding: '10px',
        background: '#f3f4f6',
        borderRadius: '6px',
        fontSize: '14px',
        color: '#6b7280',
        textAlign: 'center',
        border: '1px solid #e5e7eb'
    },
    dangerButton: {
        background: '#dc2626',
        color: '#ffffff',
        border: 'none',
        padding: '10px 16px',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        minWidth: '80px',
        transition: 'background-color 0.2s'
    },
    buttonGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px'
    },
    routeHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '15px'
    },
    statsRow: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
    },
    statItem: {
        textAlign: 'center',
        padding: '10px 12px',
        background: '#ffffff',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        minWidth: '70px'
    },
    statValue: {
        fontSize: '16px',
        fontWeight: 700,
        color: '#1f2937',
        marginBottom: '2px'
    },
    statLabel: {
        fontSize: '12px',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    },
    pointsHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        paddingBottom: '10px',
        borderBottom: '1px solid #e5e7eb'
    },
    pointsTitle: {
        color: '#4b5563',
        fontSize: '15px',
        fontWeight: 600
    },
    smallButton: {
        background: 'transparent',
        border: '1px solid #d1d5db',
        color: '#4b5563',
        padding: '6px 12px',
        borderRadius: '5px',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    pointsContainer: {
        maxHeight: '300px',
        overflowY: 'auto',
        marginTop: '10px'
    },
    pointRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
        padding: '10px',
        background: '#ffffff',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        transition: 'all 0.2s'
    },
    pointNumber: {
        width: '28px',
        height: '28px',
        background: '#1d4ed8',
        color: '#ffffff',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '13px',
        fontWeight: 600,
        flexShrink: 0
    },
    coordinateInput: {
        flex: 1,
        padding: '8px 10px',
        border: '1px solid #d1d5db',
        borderRadius: '5px',
        fontSize: '14px',
        background: '#ffffff',
        color: '#1f2937',
        fontFamily: 'monospace'
    },
    deletePointButton: {
        width: '28px',
        height: '28px',
        background: '#ef4444',
        color: '#ffffff',
        border: 'none',
        borderRadius: '5px',
        fontSize: '16px',
        cursor: 'pointer',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.2s'
    },
    emptyState: {
        textAlign: 'center',
        padding: '40px 20px',
        color: '#9ca3af'
    },
    emptyIcon: {
        fontSize: '32px',
        marginBottom: '10px'
    },
    emptyText: {
        fontSize: '16px',
        fontWeight: 600,
        marginBottom: '8px',
        color: '#6b7280'
    },
    emptySubtext: {
        fontSize: '14px'
    }
};