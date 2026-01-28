import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

// ------------------------- Helpers -------------------------
const haversineDistance = ([lat1, lon1], [lat2, lon2]) => {
    const toRad = (deg) => deg * Math.PI / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const estimateLength = (points) => {
    if (!points || points.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const [lng1, lat1] = points[i];
        const [lng2, lat2] = points[i + 1];
        total += haversineDistance([lat1, lng1], [lat2, lng2]);
    }
    return total.toFixed(2);
};

const estimateETA = (points) => Math.round((estimateLength(points) / 30) * 60);

// ------------------------- Route Editor -------------------------
export function RouteEditor({ map, routes, setRoutes, activeRouteId, setActiveRouteId, exitEditor }) {
    const [editMode, setEditMode] = useState(false);
    const [routeName, setRouteName] = useState("");
    const [routeCode, setRouteCode] = useState("");
    const [routeColor, setRouteColor] = useState("#2563eb");

    const updateRoute = (id, data) => {
        setRoutes(prev => prev.map(r => (r.id === id ? { ...r, ...data } : r)));
    };

    const createRoute = () => {
        if (!routeName) return;
        const newRoute = {
            id: Date.now(),
            name: routeName,
            code: routeCode,
            color: routeColor,
            points: [],
            manualPoints: new Set(),
            regionId: null
        };
        setRoutes(prev => [newRoute, ...prev]);
        setActiveRouteId(newRoute.id);
        setRouteName("");
        setRouteCode("");
    };

    const snapRoute = async () => {
        if (!activeRouteId) return;
        const route = routes.find(r => r.id === activeRouteId);
        if (!route || route.points.length < 2) return;

        const coords = route.points.slice().reverse().map(([lng, lat]) => `${lng},${lat}`).join(";");
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

        try {
            const res = await fetch(url);
            const data = await res.json();
            if (!data.routes?.[0]) return;

            updateRoute(activeRouteId, {
                points: data.routes[0].geometry.coordinates.slice().reverse(),
                manualPoints: new Set()
            });
        } catch (err) {
            console.error("Road snapping failed", err);
        }
    };

    // ------------------ Fix delete route ------------------
    const deleteRoute = (id) => {
        setRoutes(prev => prev.filter(r => r.id !== id));
        // Clear activeRouteId if we just deleted the active one
        if (activeRouteId === id) setActiveRouteId(null);
    };

    const clearPoints = () => {
        if (!activeRouteId) return;
        updateRoute(activeRouteId, { points: [], manualPoints: new Set() });
    };

    const updatePoint = (routeId, index, lng, lat) => {
        setRoutes(prev =>
            prev.map(r => {
                if (r.id !== routeId) return r;
                const newPoints = r.points.map((p, i) => (i === index ? [parseFloat(lng), parseFloat(lat)] : p));
                return { ...r, points: newPoints, manualPoints: new Set([...r.manualPoints, index]) };
            })
        );
    };

    const deletePoint = (routeId, index) => {
        setRoutes(prev =>
            prev.map(r => {
                if (r.id !== routeId) return r;
                const newPoints = r.points.filter((_, i) => i !== index);
                const newManual = new Set([...r.manualPoints].filter(i => i !== index));
                return { ...r, points: newPoints, manualPoints: newManual };
            })
        );
    };

    // ------------------ Add point on map click ------------------
    useEffect(() => {
        if (!map) return;
        const handleClick = (e) => {
            if (!editMode || activeRouteId === null) return;

            setRoutes(prev =>
                prev.map(route => {
                    if (route.id !== activeRouteId) return route;
                    const newPoints = [[e.lngLat.lng, e.lngLat.lat], ...route.points];
                    return { ...route, points: newPoints, manualPoints: new Set([...route.manualPoints, 0]) };
                })
            );
        };

        map.on("click", handleClick);
        return () => map.off("click", handleClick);
    }, [map, editMode, activeRouteId]);

    // ------------------ Memoize active route ------------------
    const activeRoute = activeRouteId ? routes.find(r => r.id === activeRouteId) : null;

    return (
        <div style={{ padding: "1rem", background: "#1f2937", color: "#fff", height: "100%", overflowY: "auto" }}>
            <h2>Route Editor</h2>
            <input
                placeholder="Route Name"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                style={{ width: "100%", marginBottom: "0.25rem", fontSize: "0.85rem", padding: "0.35rem" }}
            />
            <input
                placeholder="Route Code"
                value={routeCode}
                onChange={(e) => setRouteCode(e.target.value)}
                style={{ width: "100%", marginBottom: "0.25rem", fontSize: "0.85rem", padding: "0.35rem" }}
            />
            <input
                type="color"
                value={routeColor}
                onChange={(e) => setRouteColor(e.target.value)}
                style={{ width: "100%", marginBottom: "0.25rem", height: "28px" }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.5rem" }}>
                <button onClick={createRoute} style={{ padding: "0.35rem", background: "#2563eb", color: "#fff" }}>
                    Create Route
                </button>
                <button onClick={snapRoute} style={{ padding: "0.35rem", background: "#16a34a", color: "#fff" }}>
                    Snap Route
                </button>
                <button onClick={clearPoints} style={{ padding: "0.35rem", background: "#dc2626", color: "#fff" }}>
                    Clear Points
                </button>
                <button
                    onClick={() => setEditMode(!editMode)}
                    style={{ padding: "0.35rem", background: editMode ? "#facc15" : "#6b7280", color: "#000" }}
                >
                    {editMode ? "Add Point Mode: ON" : "Add Point Mode: OFF"}
                </button>
                <button onClick={exitEditor} style={{ padding: "0.35rem", background: "#6b7280", color: "#fff" }}>
                    Back to Overview
                </button>
            </div>

            <hr style={{ borderColor: "#374151" }} />
            <h3>Routes</h3>
            {routes.map((route) => (
                <div
                    key={route.id}
                    style={{
                        padding: "0.35rem",
                        marginBottom: "0.25rem",
                        background: activeRouteId === route.id ? "#374151" : "#111827",
                        borderRadius: "4px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                    }}
                    onClick={() => setActiveRouteId(route.id)}
                >
                    <span>{route.name}</span>
                    <button onClick={() => deleteRoute(route.id)} style={{ background: "#7f1d1d", fontSize: "0.7rem" }}>
                        ✕
                    </button>
                </div>
            ))}

            {activeRoute && (
                <>
                    <hr style={{ borderColor: "#374151" }} />
                    <h3>Route Points</h3>
                    {activeRoute.points.map(([lng, lat], index) => (
                        <div key={index} style={{ display: "flex", gap: "0.25rem", alignItems: "center", marginBottom: "0.25rem", fontSize: "0.75rem" }}>
                            <span>{index + 1}</span>
                            <input
                                type="number"
                                step="0.000001"
                                value={lng}
                                onChange={(e) => updatePoint(activeRouteId, index, e.target.value, lat)}
                                style={{ width: "90px" }}
                            />
                            <input
                                type="number"
                                step="0.000001"
                                value={lat}
                                onChange={(e) => updatePoint(activeRouteId, index, lng, e.target.value)}
                                style={{ width: "90px" }}
                            />
                            <button onClick={() => deletePoint(activeRouteId, index)} style={{ background: "#7f1d1d", fontSize: "0.7rem" }}>
                                ✕
                            </button>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}


// ------------------------- Route Manager -------------------------
export function RouteManager({ operatorId }) {
    const mapContainer = useRef(null);
    const [map, setMap] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [activeRouteId, setActiveRouteId] = useState(null);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [viewEditRoute, setViewEditRoute] = useState(false);

    const [regions] = useState([
        { id: 1, name: "Region A" },
        { id: 2, name: "Region B" },
        { id: 3, name: "Region C" },
    ]);
    const [selectedRegionFilter, setSelectedRegionFilter] = useState("");

    // ------------------------- Initialize Map -------------------------
    useEffect(() => {
        if (!mapContainer.current) return;
        const mapInstance = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [120.9842, 14.5995],
            zoom: 12,
            minZoom: 10,
            maxZoom: 16,
        });
        mapInstance.dragRotate.disable();
        mapInstance.keyboard.disableRotation();
        setMap(mapInstance);
        return () => mapInstance.remove();
    }, []);

    // ------------------------- Draw/Update Routes Safely -------------------------
    useEffect(() => {
        if (!map) return;

        routes.forEach((route) => {
            if (route.points.length < 2) return;

            const lineId = `route-line-${route.id}`;
            const startPinId = `start-pin-${route.id}`;
            const endPinId = `end-pin-${route.id}`;
            const sourceId = `route-${route.id}`;

            // If source exists, update data instead of re-adding
            if (map.getSource(sourceId)) {
                map.getSource(sourceId).setData({ type: "Feature", geometry: { type: "LineString", coordinates: route.points.slice().reverse() } });
            } else {
                map.addSource(sourceId, { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: route.points.slice().reverse() } } });
            }

            if (!map.getLayer(lineId)) {
                map.addLayer({ id: lineId, type: "line", source: sourceId, paint: { "line-color": route.color, "line-width": activeRouteId === route.id ? 6 : 4 } });
                map.on("click", lineId, () => {
                    setSelectedRoute(route);
                    setActiveRouteId(route.id);
                });
            }

            // Start Pin
            if (!map.getSource(startPinId)) {
                map.addSource(startPinId, { type: "geojson", data: { type: "Feature", geometry: { type: "Point", coordinates: route.points[0] } } });
                map.addLayer({ id: startPinId, type: "circle", source: startPinId, paint: { "circle-radius": 6, "circle-color": "#10b981" } });
            } else {
                map.getSource(startPinId).setData({ type: "Feature", geometry: { type: "Point", coordinates: route.points[0] } });
            }

            // End Pin
            if (!map.getSource(endPinId)) {
                map.addSource(endPinId, { type: "geojson", data: { type: "Feature", geometry: { type: "Point", coordinates: route.points[route.points.length - 1] } } });
                map.addLayer({ id: endPinId, type: "circle", source: endPinId, paint: { "circle-radius": 6, "circle-color": "#ef4444" } });
            } else {
                map.getSource(endPinId).setData({ type: "Feature", geometry: { type: "Point", coordinates: route.points[route.points.length - 1] } });
            }
        });
    }, [map, routes, activeRouteId]);

    const assignRegion = (routeId, regionId) => {
        setRoutes((prev) => prev.map((r) => (r.id === routeId ? { ...r, regionId: parseInt(regionId) } : r)));
        if (selectedRoute?.id === routeId) setSelectedRoute({ ...selectedRoute, regionId: parseInt(regionId) });
    };

    const getRegionName = (id) => {
        const r = regions.find((r) => r.id === id);
        return r ? r.name : "Unassigned";
    };

    return (
        <div style={{ display: "flex", height: "100vh", width: "100%" }}>
            <div ref={mapContainer} style={{ flex: 1 }} />

            <div style={{ width: "320px", padding: "1rem", background: "#1f2937", color: "#fff", overflowY: "auto" }}>
                {!viewEditRoute ? (
                    <>
                        <h2>Route Overview</h2>
                        <button
                            onClick={() => setViewEditRoute(true)}
                            style={{ marginBottom: "0.5rem", padding: "0.35rem", width: "100%", background: "#2563eb", color: "#fff" }}
                        >
                            Create/Edit Route
                        </button>

                        <label>Filter by Region:</label>
                        <select value={selectedRegionFilter} onChange={(e) => setSelectedRegionFilter(e.target.value)} style={{ width: "100%", marginBottom: "1rem" }}>
                            <option value="">All Regions</option>
                            {regions.map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>

                        <h3>Routes</h3>
                        {routes
                            .filter((r) => !selectedRegionFilter || r.regionId === parseInt(selectedRegionFilter))
                            .map((route) => (
                                <div
                                    key={route.id}
                                    style={{
                                        padding: "0.35rem",
                                        marginBottom: "0.25rem",
                                        background: selectedRoute?.id === route.id ? "#374151" : "#111827",
                                        borderRadius: "4px",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        cursor: "pointer",
                                    }}
                                    onClick={() => setSelectedRoute(route)}
                                >
                                    <span>{route.name}</span>
                                    <div style={{ display: "flex", gap: "0.25rem" }}>
                                        <button onClick={() => setViewEditRoute(true)} style={{ padding: "0.25rem", fontSize: "0.75rem" }}>
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            ))}

                        {selectedRoute && (
                            <>
                                <hr style={{ borderColor: "#374151", margin: "0.5rem 0" }} />
                                <h3>{selectedRoute.name}</h3>
                                <p>Region: {selectedRoute.regionId ? getRegionName(selectedRoute.regionId) : "Unassigned"}</p>
                                <p>Points: {selectedRoute.points.length}</p>
                                <p>Length: {estimateLength(selectedRoute.points)} km</p>
                                <p>ETA: {estimateETA(selectedRoute.points)} min</p>

                                <label>Assign/Change Region:</label>
                                <select
                                    value={selectedRoute.regionId || ""}
                                    onChange={(e) => assignRegion(selectedRoute.id, e.target.value)}
                                    style={{ width: "100%", marginTop: "0.25rem" }}
                                >
                                    <option value="">Unassigned</option>
                                    {regions.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </>
                        )}
                    </>
                ) : (
                    <RouteEditor
                        map={map}
                        routes={routes}
                        setRoutes={setRoutes}
                        activeRouteId={activeRouteId}
                        setActiveRouteId={setActiveRouteId}
                        exitEditor={() => setViewEditRoute(false)}
                    />
                )}
            </div>
        </div>
    );
}
