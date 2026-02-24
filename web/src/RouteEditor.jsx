import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { estimateLength, clonePoints, simplifyRoute, validateCoordinate } from "./routeUtils.jsx";
import { supabase } from "./supabase";

// ----------------------------------------------------------------------
// Euclidean distance between two points [lng, lat]
// ----------------------------------------------------------------------
const distance = (p1, p2) => {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    return Math.sqrt(dx * dx + dy * dy);
};

// ----------------------------------------------------------------------
// Distance from point to line segment (moved outside component)
// ----------------------------------------------------------------------
const distanceToSegment = (point, segmentStart, segmentEnd) => {
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
};

// ----------------------------------------------------------------------
// Simple toast system (replaces alerts for non‑blocking messages)
// ----------------------------------------------------------------------
const useToast = () => {
    const [toast, setToast] = useState({ message: "", visible: false });
    const timeoutRef = useRef(null);

    const showToast = useCallback((message, duration = 3000) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setToast({ message, visible: true });
        timeoutRef.current = setTimeout(() => {
            setToast({ message: "", visible: false });
        }, duration);
    }, []);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return { toast, showToast };
};

const Toast = ({ message, visible, style }) => {
    if (!visible) return null;
    return (
        <div style={style}>
            {message}
        </div>
    );
};

// ----------------------------------------------------------------------
// Custom Hook: Point Editing with History
// ----------------------------------------------------------------------
const usePointEditing = (initialPoints = []) => {
    const [points, setPoints] = useState(initialPoints);
    const [history, setHistory] = useState([initialPoints]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const saveToHistory = useCallback(
        (newPoints) => {
            setHistory((prev) => {
                const newHistory = prev.slice(0, historyIndex + 1);
                newHistory.push([...newPoints]);
                return newHistory;
            });
            setHistoryIndex((prev) => prev + 1);
        },
        [historyIndex]
    );

    const updatePoint = useCallback(
        (index, lng, lat) => {
            if (!validateCoordinate(lng, "lng") || !validateCoordinate(lat, "lat")) return;
            const newPoints = [...points];
            newPoints[index] = [parseFloat(lng), parseFloat(lat)];
            setPoints(newPoints);
            saveToHistory(newPoints);
        },
        [points, saveToHistory]
    );

    const addPoint = useCallback(
        (lng, lat, insertAtIndex = -1) => {
            if (!validateCoordinate(lng, "lng") || !validateCoordinate(lat, "lat")) return;
            const newPoint = [parseFloat(lng), parseFloat(lat)];
            let newPoints;

            if (insertAtIndex === -1 || insertAtIndex >= points.length) {
                newPoints = [...points, newPoint];
            } else {
                newPoints = [...points];
                newPoints.splice(insertAtIndex, 0, newPoint);
            }

            setPoints(newPoints);
            saveToHistory(newPoints);
        },
        [points, saveToHistory]
    );

    const deletePoint = useCallback(
        (index) => {
            if (points.length <= 1) return;
            const newPoints = points.filter((_, i) => i !== index);
            setPoints(newPoints);
            saveToHistory(newPoints);
        },
        [points, saveToHistory]
    );

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
        canRedo: historyIndex < history.length - 1,
    };
};

// ----------------------------------------------------------------------
// Custom Hook: Route Visualization (uses routeColor prop)
// ----------------------------------------------------------------------
const useRouteVisualization = (map, points, activeRouteId, updatePoint, routeColor = "#0066CC") => {
    const markersRef = useRef([]);
    const polylineLayerId = useRef(null);
    const popupTimeoutRef = useRef(null);
    const popupRef = useRef(null);

    const clearVisuals = useCallback(() => {
        markersRef.current.forEach((marker) => marker?.remove?.());
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
                console.warn("Error clearing map layers:", error);
            }
            polylineLayerId.current = null;
        }
        // Clear any pending popup timeout
        if (popupTimeoutRef.current) {
            clearTimeout(popupTimeoutRef.current);
            popupTimeoutRef.current = null;
        }
        if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
        }
    }, [map, activeRouteId]);

    const updateVisuals = useCallback(() => {
        if (!map || !activeRouteId || points.length === 0) {
            clearVisuals();
            return;
        }

        markersRef.current.forEach((marker) => marker?.remove?.());
        markersRef.current = [];

        points.forEach(([lng, lat], i) => {
            const el = document.createElement("div");
            el.style.cssText = `
                width: 18px;
                height: 18px;
                background: ${routeColor};
                border: 2px solid #FFFFFF;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                cursor: move;
            `;

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
                offset: [0, 0],
            })
                .setLngLat([lng, lat])
                .addTo(map);

            marker.on("dragstart", () => {
                el.style.boxShadow = `0 0 0 3px ${routeColor}80`;
            });

            marker.on("dragend", () => {
                const { lng: newLng, lat: newLat } = marker.getLngLat();
                updatePoint(i, newLng, newLat);
                el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
            });

            markersRef.current[i] = marker;
        });

        const sourceId = `editor-source-${activeRouteId}`;
        const layerId = `editor-line-${activeRouteId}`;
        polylineLayerId.current = layerId;

        const lineData = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: points,
            },
        };

        try {
            if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                    type: "geojson",
                    data: lineData,
                    lineMetrics: true,
                });

                map.addLayer({
                    id: layerId,
                    type: "line",
                    source: sourceId,
                    layout: {
                        "line-join": "round",
                        "line-cap": "round",
                    },
                    paint: {
                        "line-color": routeColor,
                        "line-width": 4,
                        "line-opacity": 0.8,
                    },
                });
            } else {
                map.getSource(sourceId).setData(lineData);
                map.setPaintProperty(layerId, 'line-color', routeColor);
            }
        } catch (error) {
            console.warn("Error updating polyline:", error);
        }

        return clearVisuals;
    }, [map, points, activeRouteId, updatePoint, routeColor, clearVisuals]);

    // Helper to show a temporary popup (used by map click handler)
    const showTempPopup = useCallback((lngLat, message, color) => {
        if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
        if (popupRef.current) popupRef.current.remove();

        const popup = new mapboxgl.Popup({ closeButton: false })
            .setLngLat(lngLat)
            .setHTML(`<div style="padding:4px; font-size:12px; background:${color}; color:white; border-radius:4px;">${message}</div>`)
            .addTo(map);
        popupRef.current = popup;
        popupTimeoutRef.current = setTimeout(() => {
            popup.remove();
            popupRef.current = null;
            popupTimeoutRef.current = null;
        }, 1000);
    }, [map]);

    return { clearVisuals, updateVisuals, showTempPopup };
};

// ----------------------------------------------------------------------
// UI Components
// ----------------------------------------------------------------------

// Color Picker Component (reusable)
const ColorPicker = ({ color, onChange, label = "Route Color" }) => (
    <div style={styles.formGroup}>
        <div style={styles.label}>{label}</div>
        <div style={styles.colorPickerRow}>
            <input
                type="color"
                value={color || '#0066CC'}
                onChange={(e) => onChange(e.target.value)}
                style={styles.colorInput}
                aria-label="Select route color"
            />
            <span style={styles.colorValue}>{color || '#0066CC'}</span>
        </div>
    </div>
);

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

const QuickActions = ({
                          addMode,
                          setAddMode,
                          onSnapToRoad,
                          isSnapping,
                          points,
                          onSave,
                          isSaving
                      }) => {
    const handleAddPointsClick = () => {
        setAddMode(addMode === 'insert' ? 'off' : 'insert');
    };

    const cycleStartEnd = () => {
        let nextMode;
        if (addMode === 'end') {
            nextMode = 'start';
        } else if (addMode === 'start') {
            nextMode = 'off';
        } else {
            nextMode = 'end';
        }
        setAddMode(nextMode);
    };

    const getStartEndLabel = () => {
        if (addMode === 'end') return 'Adding to End';
        if (addMode === 'start') return 'Adding to Start';
        return 'Add to End';
    };

    const getStartEndTitle = () => {
        if (addMode === 'end') return 'Switch to adding at start';
        if (addMode === 'start') return 'Turn off adding';
        return 'Start adding points at the end (click again for start)';
    };

    return (
        <div style={styles.quickActions}>
            <button
                onClick={handleAddPointsClick}
                style={{
                    ...styles.quickActionButton,
                    background: addMode === 'insert' ? '#DC2626' : '#0066CC'
                }}
                title={addMode === 'insert' ? 'Stop adding points (Esc)' : 'Add / insert points on map'}
            >
                {addMode === 'insert' ? 'Stop Adding' : 'Add Points'}
            </button>

            <button
                onClick={cycleStartEnd}
                style={{
                    ...styles.quickActionButton,
                    background: addMode === 'start' || addMode === 'end' ? '#DC2626' : '#7C3AED'
                }}
                disabled={points.length === 0}
                title={getStartEndTitle()}
            >
                {getStartEndLabel()}
            </button>

            <button
                onClick={onSnapToRoad}
                disabled={isSnapping || points.length < 2}
                style={{
                    ...styles.quickActionButton,
                    background: '#065F46'
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
};

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

        <ColorPicker
            color={newRoute.color}
            onChange={(color) => setNewRoute(prev => ({ ...prev, color }))}
        />

        <div style={styles.formGroup}>
            <div style={styles.label}>Region *</div>
            <select
                value={newRoute.regionId}
                onChange={e => setNewRoute(prev => ({ ...prev, regionId: e.target.value }))}
                style={styles.select}
                required
                aria-required="true"
            >
                <option value="" disabled>Select a region</option>
                {regions.map(region => (
                    <option key={region.region_id} value={region.region_id}>
                        {region.name} ({region.code})
                    </option>
                ))}
            </select>
        </div>

        <button
            onClick={onCreateRoute}
            disabled={!newRoute.name.trim() || !newRoute.code.trim() || !newRoute.regionId || isSaving}
            style={styles.createButton}
            aria-busy={isSaving}
        >
            {isSaving ? 'Creating...' : 'Create Route'}
        </button>
    </div>
);

// ----------------------------------------------------------------------
// Updated RouteStats component (version added)
// ----------------------------------------------------------------------
const RouteStats = ({ routeLength, estimatedTime, points, version, onViewHistory }) => (
    <div style={styles.card}>
        <div style={styles.cardTitle}>
            Route Information
            <button onClick={onViewHistory} style={styles.versionButton}>
                Version {version} • View History
            </button>
        </div>
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

const RouteAppearanceCard = ({ activeRoute, activeRouteId, updateRoute }) => (
    <div style={styles.card}>
        <div style={styles.cardTitle}>Route Appearance</div>
        <ColorPicker
            color={activeRoute.color || '#0066CC'}
            onChange={(color) => updateRoute(activeRouteId, (route) => ({
                ...route,
                color
            }))}
            label="Line Color"
        />
    </div>
);

const RouteStatusCard = ({ activeRoute, activeRouteId, updateRoute, showToast }) => {
    const handleCreditChange = async (newStatus) => {
        if (newStatus === activeRoute.credit_status) return;
        const delta = newStatus === 'credited' ? 1 : (newStatus === 'credit_revoked' ? -1 : 0);
        try {
            const { error } = await supabase.rpc('adjust_route_credit', {
                p_route_id: activeRouteId,
                p_credit_delta: delta,
                p_new_credit_confidence: activeRoute.credit_confidence || 0,
                p_resolution_method: 'approved_with_adjustments',
                p_credit_reason: activeRoute.credit_reason || null
            });
            if (error) throw error;

            updateRoute(activeRouteId, (route) => ({ ...route, credit_status: newStatus }));
            if (showToast) showToast('Credit status updated', 3000);
        } catch (error) {
            console.error('Credit adjustment failed:', error);
            if (showToast) showToast('Credit update failed', 3000);
        }
    };

    return (
        <div style={styles.card}>
            <div style={styles.cardTitle}>Route Status & Credit</div>
            <div style={styles.formGroup}>
                <div style={styles.label}>Status</div>
                <select
                    value={activeRoute.status || "draft"}
                    onChange={(e) =>
                        updateRoute(activeRouteId, (route) => ({
                            ...route,
                            status: e.target.value,
                        }))
                    }
                    style={styles.select}
                >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="temporarily_suspended">Temporarily Suspended</option>
                    <option value="deprecated">Deprecated</option>
                </select>
            </div>
            <div style={styles.formGroup}>
                <div style={styles.label}>Credit Status</div>
                <select
                    value={activeRoute.credit_status || "uncredited"}
                    onChange={(e) => handleCreditChange(e.target.value)}
                    style={styles.select}
                >
                    <option value="uncredited">Uncredited</option>
                    <option value="credited">Credited</option>
                    <option value="credit_revoked">Credit Revoked</option>
                </select>
            </div>
            {activeRoute.credit_status === "credited" && activeRoute.credited_by_operator_id && (
                <div style={styles.creditInfo}>
                    <div style={styles.detailLabel}>Credited by</div>
                    <div style={styles.detailValue}>Operator ID: {activeRoute.credited_by_operator_id}</div>
                    {activeRoute.credited_at && (
                        <div style={styles.detailValue}>
                            Date: {new Date(activeRoute.credited_at).toLocaleDateString()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

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
                    Click between existing points to insert new ones, or use Add to Start/End buttons
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

// ----------------------------------------------------------------------
// Version History Modal (new)
// ----------------------------------------------------------------------
const VersionHistoryModal = ({ routeId, onClose }) => {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVersions = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .rpc('get_route_version_history', { p_route_id: routeId });
            if (error) {
                console.error("Error fetching version history:", error);
            } else {
                setVersions(data || []);
            }
            setLoading(false);
        };
        fetchVersions();
    }, [routeId]);

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <div style={modalHeaderStyle}>
                    <h3>Version History</h3>
                    <button onClick={onClose} style={modalCloseButton}>×</button>
                </div>
                <div style={modalBodyStyle}>
                    {loading ? (
                        <div>Loading...</div>
                    ) : versions.length === 0 ? (
                        <div>No version history available.</div>
                    ) : (
                        <table style={versionTableStyle}>
                            <thead>
                            <tr>
                                <th>Version</th>
                                <th>Date</th>
                                <th>Changed By</th>
                                <th>Change Type</th>
                                <th>Resolution</th>
                            </tr>
                            </thead>
                            <tbody>
                            {versions.map(v => (
                                <tr key={v.version_number}>
                                    <td>{v.version_number}</td>
                                    <td>{new Date(v.recorded_at).toLocaleString()}</td>
                                    <td>{v.actor_name || "System"}</td>
                                    <td>{v.change_type.replace(/_/g, ' ')}</td>
                                    <td>{v.resolution_method || "—"}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
};

const modalContentStyle = {
    backgroundColor: '#fff',
    borderRadius: '8px',
    width: '80%',
    maxWidth: '800px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
};

const modalHeaderStyle = {
    padding: '1rem',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
};

const modalCloseButton = {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#64748b',
};

const modalBodyStyle = {
    padding: '1rem',
    overflowY: 'auto',
};

const versionTableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
    '& th, & td': {
        padding: '0.75rem',
        textAlign: 'left',
        borderBottom: '1px solid #e2e8f0',
    },
    '& th': {
        backgroundColor: '#f8fafc',
        fontWeight: 600,
    },
};

// ----------------------------------------------------------------------
// Main RouteEditor Component
// ----------------------------------------------------------------------
export function RouteEditor({
                                map,
                                routes,
                                setRoutes,
                                activeRouteId,
                                setActiveRouteId,
                                exitEditor,
                                saveRouteToDatabase,
                                deleteRouteFromDatabase,
                                regions = [],
                            }) {
    // State
    const [addMode, setAddMode] = useState('off'); // 'off', 'insert', 'start', 'end'
    const [newRoute, setNewRoute] = useState({
        name: "",
        code: "",
        regionId: "",
        color: "#0066CC",
    });
    const [activePointIndex, setActivePointIndex] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSnapping, setIsSnapping] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [simplifyTolerance, setSimplifyTolerance] = useState(0.0001);
    const [isUpdatingGraph, setIsUpdatingGraph] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(false);   // new

    // Toast
    const { toast, showToast } = useToast();

    // Refs for cleanup
    const abortControllerRef = useRef(null);
    const clickHandlerRef = useRef(null);
    const contentRef = useRef(null);

    // Memoized values
    const activeRoute = useMemo(
        () => routes.find((r) => r.id === activeRouteId),
        [routes, activeRouteId]
    );

    // Custom hooks
    const pointEditing = usePointEditing(activeRoute?.rawPoints || []);
    const { clearVisuals, updateVisuals, showTempPopup } = useRouteVisualization(
        map,
        pointEditing.points,
        activeRouteId,
        pointEditing.updatePoint,
        activeRoute?.color || "#0066CC"
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

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // UPDATED: createRoute using RPC
    const createRoute = useCallback(async () => {
        if (!newRoute.name.trim() || !newRoute.code.trim() || !newRoute.regionId) {
            showToast("Please enter route name, code, and select a region", 3000);
            return;
        }

        try {
            setIsSaving(true);

            const { data: newRouteId, error } = await supabase.rpc('create_route_with_history', {
                p_route_code: newRoute.code.trim(),
                p_route_name: newRoute.name.trim(),
                p_region_id: newRoute.regionId,
                p_route_color: newRoute.color || '#0066CC',
                p_geometry: { type: 'LineString', coordinates: [] }
            });

            if (error) throw error;

            // Fetch the newly created route
            const { data: newRouteDb, error: fetchError } = await supabase
                .from('routes')
                .select('*, region:region_id(*)')
                .eq('id', newRouteId)
                .single();

            if (fetchError) throw fetchError;

            const editorRoute = {
                id: newRouteDb.id,
                name: newRouteDb.geometry?.properties?.name || newRouteDb.route_code,
                code: newRouteDb.route_code,
                color: newRouteDb.route_color || '#0066CC',
                rawPoints: newRouteDb.geometry?.coordinates || [],
                regionId: newRouteDb.region_id,
                regionName: newRouteDb.region?.name,
                status: newRouteDb.status,
                length_meters: newRouteDb.length_meters,
                created_at: newRouteDb.created_at,
                updated_at: newRouteDb.updated_at,
                credit_status: newRouteDb.credit_status,
                credited_by_operator_id: newRouteDb.credited_by_operator_id,
                credited_at: newRouteDb.credited_at,
                credit_confidence: newRouteDb.credit_confidence,
                credit_reason: newRouteDb.credit_reason,
                version: newRouteDb.version || 1,   // include version
            };

            setRoutes((prev) => [editorRoute, ...prev]);
            setActiveRouteId(newRouteDb.id);
            setNewRoute({ name: "", code: "", regionId: "", color: "#0066CC" });
            pointEditing.resetPoints([]);
            setAddMode('off');

            showToast(`Route "${newRoute.name.trim()}" created`, 3000);
        } catch (error) {
            console.error("Error creating route:", error);
            showToast(`Failed: ${error.message}`, 5000);
        } finally {
            setIsSaving(false);
        }
    }, [newRoute, setRoutes, setActiveRouteId, pointEditing, showToast]);

    const deleteRoute = useCallback(
        async (id) => {
            if (
                !window.confirm(
                    "Are you sure you want to delete this route? This action cannot be undone."
                )
            )
                return;

            try {
                await deleteRouteFromDatabase(id);
                if (activeRouteId === id) {
                    pointEditing.resetPoints([]);
                    setAddMode('off');
                }
                showToast("Route deleted", 3000);
            } catch (error) {
                console.error("Error deleting route:", error);
                showToast("Failed to delete route", 5000);
            }
        },
        [activeRouteId, deleteRouteFromDatabase, pointEditing, showToast]
    );

    const pointsEqual = (p1, p2) => JSON.stringify(p1) === JSON.stringify(p2);

    // UPDATED: saveRoute using the RPC (via saveRouteToDatabase prop)
    const saveRoute = useCallback(async () => {
        if (!activeRoute || pointEditing.points.length < 2) {
            showToast("Route must have at least 2 points", 3000);
            return;
        }

        if (pointsEqual(pointEditing.points, activeRoute.rawPoints)) {
            showToast("No changes to save", 3000);
            return;
        }

        try {
            setIsSaving(true);

            const routeToSave = {
                ...activeRoute,
                rawPoints: pointEditing.points,
                length_meters: routeLength * 1000,
            };

            await saveRouteToDatabase(routeToSave);
            showToast("Route saved successfully", 3000);
        } catch (error) {
            console.error("Error saving route:", error);
            showToast(`Failed to save route: ${error.message}`, 5000);
        } finally {
            setIsSaving(false);
        }
    }, [activeRoute, saveRouteToDatabase, pointEditing.points, routeLength, showToast]);

    // UPDATED: updateRoute with credit adjustment detection
    const updateRoute = useCallback(
        (id, updater) => {
            const currentRoute = routes.find(r => r.id === id);
            const updatedRoute = updater(currentRoute);

            setRoutes((prev) => prev.map((r) => (r.id === id ? updatedRoute : r)));

            if (currentRoute?.credit_status !== updatedRoute.credit_status) {
                (async () => {
                    try {
                        let delta = 0;
                        if (updatedRoute.credit_status === 'credited' && currentRoute?.credit_status !== 'credited') delta = 1;
                        else if (updatedRoute.credit_status === 'credit_revoked' && currentRoute?.credit_status === 'credited') delta = -1;

                        const { error } = await supabase.rpc('adjust_route_credit', {
                            p_route_id: id,
                            p_credit_delta: delta,
                            p_new_credit_confidence: updatedRoute.credit_confidence || 0,
                            p_resolution_method: 'approved_with_adjustments',
                            p_credit_reason: updatedRoute.credit_reason || null
                        });

                        if (error) throw error;
                        showToast('Credit status updated', 3000);
                    } catch (error) {
                        console.error('Error updating credit:', error);
                        showToast('Credit update failed', 3000);
                        setRoutes((prev) => prev.map((r) => (r.id === id ? currentRoute : r)));
                    }
                })();
            }
        },
        [routes, showToast]
    );

    // ... (triggerRouteGraphUpdate, handleMapClick, snapToRoad, simplifyRoutePoints, exportRoute remain unchanged) ...

    const triggerRouteGraphUpdate = useCallback(async (routeId) => {
        if (!routeId) return;
        try {
            setIsUpdatingGraph(true);
            const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-route-graph-nodes`;
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({ routeId }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to update route graph:', errorData);
                showToast('Graph update failed', 3000);
            } else {
                const result = await response.json();
                console.log(`Route graph updated: ${result.count} nodes linked`);
                showToast('Graph updated', 2000);
            }
        } catch (err) {
            console.error('Error calling edge function:', err);
            showToast('Graph update error', 3000);
        } finally {
            setIsUpdatingGraph(false);
        }
    }, [showToast]);

    const handleMapClick = useCallback(
        (e) => {
            if (!map || !activeRouteId || addMode === 'off') return;

            const { lng, lat } = e.lngLat;
            let insertAtIndex = -1;

            if (addMode === 'start') {
                insertAtIndex = 0;
            } else if (addMode === 'end') {
                insertAtIndex = -1;
            } else if (addMode === 'insert') {
                const points = pointEditing.points;
                const clickThreshold = 0.0001;

                if (points.length >= 2) {
                    const [x1, y1] = points[0];
                    const [x2, y2] = points[1];
                    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
                    if (len > 0) {
                        const t = ((lng - x1) * dx + (lat - y1) * dy) / (len * len);
                        if (t < 0) {
                            const projX = x1 + t * dx, projY = y1 + t * dy;
                            if (Math.hypot(lng - projX, lat - projY) < clickThreshold) {
                                insertAtIndex = 0;
                            }
                        }
                    }
                } else if (points.length === 1) {
                    if (distance([lng, lat], points[0]) < clickThreshold) {
                        insertAtIndex = 0;
                    }
                }

                if (insertAtIndex === -1 && points.length >= 2) {
                    const [x1, y1] = points[points.length - 2];
                    const [x2, y2] = points[points.length - 1];
                    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
                    if (len > 0) {
                        const t = ((lng - x1) * dx + (lat - y1) * dy) / (len * len);
                        if (t > 1) {
                            const projX = x1 + t * dx, projY = y1 + t * dy;
                            if (Math.hypot(lng - projX, lat - projY) < clickThreshold) {
                                insertAtIndex = -1;
                            }
                        }
                    }
                }

                if (insertAtIndex === -1 && points.length >= 2) {
                    for (let i = 0; i < points.length - 1; i++) {
                        const dist = distanceToSegment([lng, lat], points[i], points[i + 1]);
                        if (dist < clickThreshold) {
                            insertAtIndex = i + 1;
                            break;
                        }
                    }
                }

                if (insertAtIndex === -1) {
                    insertAtIndex = -1;
                }
            }

            pointEditing.addPoint(lng, lat, insertAtIndex);

            let message = "Point added";
            if (insertAtIndex === 0) message = "Added at start";
            else if (insertAtIndex === -1) message = "Added at end";
            else message = "Point inserted";

            showTempPopup([lng, lat], message, activeRoute?.color || '#0066CC');
        },
        [addMode, activeRouteId, map, pointEditing, showTempPopup, activeRoute?.color]
    );

    const snapToRoad = useCallback(async () => {
        if (pointEditing.points.length < 2) {
            showToast("At least 2 points are required to snap to roads", 3000);
            return;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;

        setIsSnapping(true);
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
                { signal }
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

            showToast("✓ Route snapped successfully", 3000);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Snap request cancelled');
                return;
            }
            console.error('Error snapping to road:', error);
            showToast(`Failed to snap to roads: ${error.message}`, 5000);
        } finally {
            setIsSnapping(false);
            abortControllerRef.current = null;
        }
    }, [pointEditing, showToast]);

    const simplifyRoutePoints = useCallback(() => {
        if (pointEditing.points.length < 3) {
            showToast("Route needs at least 3 points to simplify", 3000);
            return;
        }

        const simplified = simplifyRoute(pointEditing.points, simplifyTolerance);
        if (simplified.length < pointEditing.points.length) {
            pointEditing.resetPoints(simplified);
            showToast(`Simplified from ${pointEditing.points.length} to ${simplified.length} points`, 3000);
        } else {
            showToast("No simplification possible with current tolerance", 3000);
        }
    }, [pointEditing, simplifyTolerance, showToast]);

    const exportRoute = useCallback(async (format = 'geojson') => {
        if (pointEditing.points.length < 2) {
            showToast("Route must have at least 2 points to export", 3000);
            return;
        }

        setIsExporting(true);
        try {
            const geojson = {
                type: "Feature",
                properties: {
                    name: activeRoute?.name || "Unnamed Route",
                    code: activeRoute?.code || "",
                    color: activeRoute?.color || "#0066CC",
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

            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast(`Route exported as ${format.toUpperCase()}`, 3000);
        } catch (error) {
            console.error('Error exporting route:', error);
            showToast(`Failed to export route: ${error.message}`, 5000);
        } finally {
            setIsExporting(false);
        }
    }, [pointEditing.points, activeRoute, routeLength, showToast]);

    // Map interaction setup
    useEffect(() => {
        if (!map || !activeRouteId) return;

        if (addMode !== 'off') {
            if (clickHandlerRef.current) {
                map.off("click", clickHandlerRef.current);
            }
            clickHandlerRef.current = handleMapClick;
            map.on("click", handleMapClick);

            map.getCanvas().style.cursor = "crosshair";

            const handleKeyDown = (e) => {
                const target = e.target;
                const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
                if (isInput) return;

                if (e.key === "Escape") {
                    setAddMode('off');
                } else if (e.ctrlKey && e.key === "z") {
                    e.preventDefault();
                    pointEditing.undo();
                } else if (e.ctrlKey && e.key === "y") {
                    e.preventDefault();
                    pointEditing.redo();
                }
            };

            window.addEventListener("keydown", handleKeyDown);

            return () => {
                map.off("click", handleMapClick);
                map.getCanvas().style.cursor = "";
                window.removeEventListener("keydown", handleKeyDown);
            };
        } else {
            map.getCanvas().style.cursor = "";
        }
    }, [map, addMode, activeRouteId, handleMapClick, pointEditing]);

    useEffect(() => {
        return () => {
            clearVisuals();
        };
    }, [clearVisuals]);

    // --------------------------------------------------------------------
    // Render
    // --------------------------------------------------------------------
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

            {isUpdatingGraph && (
                <div style={{
                    position: 'fixed',
                    top: '10px',
                    right: '10px',
                    background: '#0066CC',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    zIndex: 1000,
                }}>
                    Updating graph…
                </div>
            )}

            <div ref={contentRef} style={styles.content}>
                {activeRoute && (
                    <>
                        <QuickActions
                            addMode={addMode}
                            setAddMode={setAddMode}
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
                            version={activeRoute.version || 1}
                            onViewHistory={() => setShowVersionHistory(true)}
                        />

                        <RegionAssignment
                            activeRoute={activeRoute}
                            activeRouteId={activeRouteId}
                            updateRoute={updateRoute}
                            regions={regions}
                        />

                        <RouteAppearanceCard
                            activeRoute={activeRoute}
                            activeRouteId={activeRouteId}
                            updateRoute={updateRoute}
                        />

                        <RouteStatusCard
                            activeRoute={activeRoute}
                            activeRouteId={activeRouteId}
                            updateRoute={updateRoute}
                            showToast={showToast}
                        />

                        <PointsList
                            points={pointEditing.points}
                            editMode={addMode !== 'off'}
                            activePointIndex={activePointIndex}
                            setActivePointIndex={setActivePointIndex}
                            onDeletePoint={pointEditing.deletePoint}
                            onUpdatePoint={pointEditing.updatePoint}
                            onClearPoints={pointEditing.clearPoints}
                        />
                    </>
                )}
            </div>

            <Toast message={toast.message} visible={toast.visible} style={styles.toast} />

            {showVersionHistory && activeRoute && (
                <VersionHistoryModal
                    routeId={activeRoute.id}
                    onClose={() => setShowVersionHistory(false)}
                />
            )}
        </div>
    );
}

// ----------------------------------------------------------------------
// Styles (original, with versionButton added)
// ----------------------------------------------------------------------
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
    },
    colorPickerRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    colorInput: {
        width: '40px',
        height: '40px',
        border: '1px solid #CBD5E1',
        borderRadius: '4px',
        cursor: 'pointer',
        padding: 0,
    },
    colorValue: {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#1E293B',
    },
    creditInfo: {
        marginTop: "12px",
        padding: "12px",
        background: "#F0FDF4",
        borderRadius: "6px",
        border: "1px solid #86EFAC",
    },
    detailLabel: {
        fontSize: "11px",
        color: "#166534",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: "2px",
    },
    detailValue: {
        fontSize: "13px",
        color: "#14532D",
        marginBottom: "4px",
        wordBreak: "break-all",
    },
    toast: {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: '#1E293B',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '6px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        zIndex: 1000,
        fontSize: '14px',
        maxWidth: '300px',
    },
    // New style for the version button
    versionButton: {
        background: 'none',
        border: '1px solid #0066CC',
        color: '#0066CC',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        cursor: 'pointer',
        marginLeft: '12px',
        ':hover': {
            background: '#E6F0FF',
        },
    },
};