import { useEffect, useMemo, useState, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { createEmptyRoute } from "./routeModel.jsx";

/* ---------------- Helpers ---------------- */

const haversineDistance = ([lat1, lon1], [lat2, lon2]) => {
    const toRad = d => d * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};


const estimateLength = (points = []) => {
    if (!points || points.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
        total += haversineDistance(
            [points[i][1], points[i][0]],
            [points[i + 1][1], points[i + 1][0]]
        );
    }
    return total.toFixed(2);
};

const clonePoints = (pts) => pts.map(p => [...p]);

/* ---------------- Route Editor ---------------- */

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
    const [routeColor, setRouteColor] = useState("#2563eb");
    const [activePointIndex, setActivePointIndex] = useState(null); // NEW

    const activeRoute = useMemo(
        () => routes.find(r => r.id === activeRouteId),
        [routes, activeRouteId]
    );

    const markersRef = useRef([]); // store Mapbox markers

    /* ---------------- Utilities ---------------- */

    const pushHistory = (route) => ({
        ...route,
        history: [...route.history, clonePoints(route.rawPoints)],
        future: []
    });

    const updateRoute = (id, updater) => {
        setRoutes(prev =>
            prev.map(r => (r.id === id ? updater(r) : r))
        );
    };

    const clearMarkersAndPolyline = () => {
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];
        if (map && map.getLayer("route-line")) {
            map.removeLayer("route-line");
            map.removeSource("route-line");
        }
    };

    /* ---------------- Route CRUD ---------------- */

    const createRoute = () => {
        if (!routeName) return;

        const route = createEmptyRoute({
            name: routeName,
            code: routeCode,
            color: routeColor
        });

        setRoutes(prev => [route, ...prev]);
        setActiveRouteId(route.id);

        setRouteName("");
        setRouteCode("");
    };

    const deleteRoute = (id) => {
        clearMarkersAndPolyline();
        setRoutes(prev => prev.filter(r => r.id !== id));
        if (activeRouteId === id) setActiveRouteId(null);
        setActivePointIndex(null); // NEW: clear active point
    };

    /* ---------------- Point Editing ---------------- */

    useEffect(() => {
        if (!map) return;

        const onClick = (e) => {
            if (!editMode || !activeRouteId) return;

            updateRoute(activeRouteId, route => {
                const updated = pushHistory(route);
                return {
                    ...updated,
                    rawPoints: [
                        ...route.rawPoints,
                        [e.lngLat.lng, e.lngLat.lat]
                    ],
                    snappedPoints: null
                };
            });
        };

        map.on("click", onClick);
        return () => map.off("click", onClick);
    }, [map, editMode, activeRouteId]);

    const updatePoint = (index, lng, lat) => {
        updateRoute(activeRouteId, route => {
            const updated = pushHistory(route);
            const pts = clonePoints(route.rawPoints);
            pts[index] = [parseFloat(lng), parseFloat(lat)];
            return { ...updated, rawPoints: pts, snappedPoints: null };
        });
    };

    const deletePoint = (index) => {
        updateRoute(activeRouteId, route => {
            const updated = pushHistory(route);
            const newPoints = route.rawPoints.filter((_, i) => i !== index);
            return {
                ...updated,
                rawPoints: newPoints,
                snappedPoints: null
            };
        });
        setActivePointIndex(null); // NEW: clear selection if deleted
    };

    /* ---------------- Undo / Redo ---------------- */

    const undo = () => {
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
    };

    const redo = () => {
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
    };

    /* ---------------- Snapping ---------------- */

    const snapRoute = async () => {
        if (!activeRoute || activeRoute.rawPoints.length < 2) return;

        updateRoute(activeRouteId, route => pushHistory(route));

        const coords = activeRoute.rawPoints
            .map(p => p.join(","))
            .join(";");

        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

        const res = await fetch(url);
        const data = await res.json();

        if (!data.routes?.[0]) return;

        updateRoute(activeRouteId, route => ({
            ...route,
            snappedPoints: data.routes[0].geometry.coordinates
        }));
    };

    /* ---------------- Map Markers & Polyline ---------------- */

    useEffect(() => {
        if (!map) return;
        if (!activeRoute || activeRoute.rawPoints.length === 0) {
            clearMarkersAndPolyline();
            return;
        }

        const pointsToShow = activeRoute.snappedPoints || activeRoute.rawPoints;

        // Remove old markers no longer needed
        markersRef.current.forEach((marker, i) => {
            if (i >= pointsToShow.length) marker.remove();
        });

        // Add new markers / update existing
        pointsToShow.forEach(([lng, lat], i) => {
            let marker = markersRef.current[i];
            const isActive = i === activePointIndex; // NEW: check active

            if (!marker) {
                const el = document.createElement("div");
                el.style.width = isActive ? "16px" : "12px"; // bigger if active
                el.style.height = isActive ? "16px" : "12px";
                el.style.background = activeRoute.color || "#2563eb";
                el.style.border = isActive ? "3px solid yellow" : "2px solid white"; // highlight
                el.style.borderRadius = "50%";
                el.style.boxShadow = "0 0 4px rgba(0,0,0,0.7)";
                el.title = `Point ${i + 1}`;

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
                el.style.width = isActive ? "16px" : "12px";
                el.style.height = isActive ? "16px" : "12px";
                el.style.border = isActive ? "3px solid yellow" : "2px solid white";
            }
        });

        markersRef.current = markersRef.current.slice(0, pointsToShow.length);

        // Polyline
        if (pointsToShow.length === 0) {
            clearMarkersAndPolyline();
        } else if (map.getSource("route-line")) {
            map.getSource("route-line").setData({
                type: "Feature",
                geometry: { type: "LineString", coordinates: pointsToShow }
            });
        } else {
            map.addSource("route-line", {
                type: "geojson",
                data: { type: "Feature", geometry: { type: "LineString", coordinates: pointsToShow } }
            });
            map.addLayer({
                id: "route-line",
                type: "line",
                source: "route-line",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: { "line-color": activeRoute.color || "#2563eb", "line-width": 4 }
            });
        }
    }, [activeRouteId, activeRoute, map, activePointIndex]);

    /* ---------------- Route Health ---------------- */

    const displayPoints = activeRoute?.snappedPoints || activeRoute?.rawPoints;
    const length = estimateLength(displayPoints);
    const eta = Math.round((length / 30) * 60);

    /* ---------------- UI ---------------- */

    const inputStyle = {
        padding: "0.25rem 0.5rem",
        margin: "0.25rem 0",
        fontSize: "0.875rem",
        width: "100%",
        borderRadius: "4px",
        border: "1px solid #ccc",
        background: "#f9f9f9",
        color: "#111"
    };

    const buttonStyle = {
        padding: "0.3rem 0.6rem",
        margin: "0.2rem",
        fontSize: "0.875rem",
        borderRadius: "4px",
        border: "1px solid #2563eb",
        background: "#2563eb",
        color: "#fff",
        cursor: "pointer"
    };

    const secondaryButton = {
        ...buttonStyle,
        background: "#ef4444",
        border: "1px solid #ef4444"
    };

    const smallButton = {
        ...buttonStyle,
        padding: "0.2rem 0.4rem",
        fontSize: "0.75rem",
        marginLeft: "0.25rem"
    };

    return (
        <div style={{ padding: "1rem", color: "#111", height: "100%", fontFamily: "Arial, sans-serif" }}>
            <h2 style={{ marginBottom: "0.5rem", color: "#1e40af" }}>Route Editor</h2>

            {/* Route Selection */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem", gap: "0.5rem" }}>
                <select
                    value={activeRouteId || ""}
                    onChange={e => setActiveRouteId(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                >
                    <option value="" disabled>Select Route</option>
                    {routes.map(r => (
                        <option key={r.id} value={r.id}>{r.name || r.code || r.id}</option>
                    ))}
                </select>
                {activeRouteId && (
                    <button style={secondaryButton} onClick={() => deleteRoute(activeRouteId)}>Delete</button>
                )}
            </div>

            {/* Create Route */}
            <input placeholder="Route Name" value={routeName} onChange={e => setRouteName(e.target.value)} style={inputStyle} />
            <input placeholder="Route Code" value={routeCode} onChange={e => setRouteCode(e.target.value)} style={inputStyle} />
            <input type="color" value={routeColor} onChange={e => setRouteColor(e.target.value)} style={{ ...inputStyle, padding: "0.1rem", height: "1.5rem" }} />

            <div style={{ display: "flex", flexWrap: "wrap", marginTop: "0.5rem" }}>
                <button style={buttonStyle} onClick={createRoute}>Create</button>
                <button style={buttonStyle} onClick={() => setEditMode(!editMode)}>Add Point: {editMode ? "ON" : "OFF"}</button>
                <button style={buttonStyle} onClick={snapRoute}>Snap</button>
                <button style={buttonStyle} onClick={undo} disabled={!activeRoute?.history.length}>Undo</button>
                <button style={buttonStyle} onClick={redo} disabled={!activeRoute?.future.length}>Redo</button>
                <button style={buttonStyle} onClick={exitEditor}>Back</button>
            </div>

            {activeRoute && (
                <div style={{ marginTop: "0.5rem" }}>
                    <hr />
                    <strong>Route Health</strong>
                    <div>Length: {length} km</div>
                    <div>ETA: ~{eta} mins</div>
                    <div>Status: {activeRoute.snappedPoints ? "Snapped" : "Manual"}</div>

                    <hr />
                    <h3>Route Points</h3>
                    {activeRoute.rawPoints.map(([lng, lat], i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.25rem" }}>
                            <input
                                value={lng}
                                onChange={e => updatePoint(i, e.target.value, lat)}
                                onFocus={() => setActivePointIndex(i)} // NEW: highlight on focus
                                style={{ ...inputStyle, flex: 1 }}
                            />
                            <input
                                value={lat}
                                onChange={e => updatePoint(i, lng, e.target.value)}
                                onFocus={() => setActivePointIndex(i)} // NEW: highlight on focus
                                style={{ ...inputStyle, flex: 1 }}
                            />
                            <button style={smallButton} onClick={() => deletePoint(i)}>✕</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
