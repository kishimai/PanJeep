import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

export function RouteCreator({ regionId, operatorId }) {
    const mapContainer = useRef(null);
    const dragIndex = useRef(null);

    const [map, setMap] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [activeRouteId, setActiveRouteId] = useState(null);
    const [editMode, setEditMode] = useState(false);

    const [routeName, setRouteName] = useState("");
    const [routeCode, setRouteCode] = useState("");
    const [routeColor, setRouteColor] = useState("#2563eb");

    // --- Initialize Map ---
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

    // --- Map Click to Add Points ---
    useEffect(() => {
        if (!map) return;

        const handleClick = (e) => {
            if (!editMode || activeRouteId === null) return;

            setRoutes(prevRoutes =>
                prevRoutes.map(route => {
                    if (route.id !== activeRouteId) return route;

                    const newPoints = [[e.lngLat.lng, e.lngLat.lat], ...route.points];
                    return {
                        ...route,
                        points: newPoints,
                        manualPoints: new Set([...route.manualPoints, 0])
                    };
                })
            );
        };

        map.on("click", handleClick);
        return () => map.off("click", handleClick);
    }, [map, editMode, activeRouteId]);

    // --- Utility: Update Route ---
    const updateRoute = (id, data) => {
        setRoutes(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    };

    // --- Create Route ---
    const createRoute = () => {
        if (!routeName) return;
        const newRoute = {
            id: Date.now(),
            name: routeName,
            code: routeCode,
            color: routeColor,
            points: [],
            manualPoints: new Set(),
        };
        setRoutes(prev => [newRoute, ...prev]);
        setActiveRouteId(newRoute.id);
        setRouteName("");
        setRouteCode("");
    };

    // --- Snap Route ---
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

    // --- Delete Route ---
    const deleteRoute = (id) => {
        setRoutes(prev => prev.filter(r => r.id !== id));
        if (activeRouteId === id) setActiveRouteId(null);
    };

    // --- Clear Points ---
    const clearPoints = () => {
        if (!activeRouteId) return;
        updateRoute(activeRouteId, { points: [], manualPoints: new Set() });
    };

    // --- Update / Delete Point ---
    const updatePoint = (routeId, index, lng, lat) => {
        setRoutes(prev =>
            prev.map(r => {
                if (r.id !== routeId) return r;
                const newPoints = r.points.map((p, i) => i === index ? [parseFloat(lng), parseFloat(lat)] : p);
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

    // --- Draw Routes & Pins ---
    useEffect(() => {
        if (!map) return;

        routes.forEach(route => {
            // Remove previous layers & sources
            ["route-line", "route", "start-pin", "end-pin"].forEach(prefix => {
                const id = `${prefix}-${route.id}`;
                if (map.getLayer(id)) map.removeLayer(id);
                if (map.getSource(id)) map.removeSource(id);
            });
        });

        routes.forEach(route => {
            if (route.points.length < 2) return;

            // Route Line
            const sourceId = `route-${route.id}`;
            const lineId = `route-line-${route.id}`;
            map.addSource(sourceId, {
                type: "geojson",
                data: { type: "Feature", geometry: { type: "LineString", coordinates: route.points.slice().reverse() } }
            });
            map.addLayer({
                id: lineId,
                type: "line",
                source: sourceId,
                paint: { "line-color": route.color, "line-width": activeRouteId === route.id ? 6 : 4 }
            });

            // Click to select route
            map.on("click", lineId, () => setActiveRouteId(route.id));

            // Start Pin
            map.addSource(`start-pin-${route.id}`, {
                type: "geojson",
                data: { type: "Feature", geometry: { type: "Point", coordinates: route.points[0] } }
            });
            map.addLayer({
                id: `start-pin-${route.id}`,
                type: "circle",
                source: `start-pin-${route.id}`,
                paint: { "circle-radius": 6, "circle-color": "#10b981" }
            });

            // End Pin
            map.addSource(`end-pin-${route.id}`, {
                type: "geojson",
                data: { type: "Feature", geometry: { type: "Point", coordinates: route.points[route.points.length - 1] } }
            });
            map.addLayer({
                id: `end-pin-${route.id}`,
                type: "circle",
                source: `end-pin-${route.id}`,
                paint: { "circle-radius": 6, "circle-color": "#ef4444" }
            });
        });
    }, [map, routes, activeRouteId]);

    return (
        <div style={{ display: "flex", height: "100vh", width: "100%" }}>
            <div ref={mapContainer} style={{ flex: 1 }} />

            {/* Sidebar */}
            <div style={{ width: "320px", padding: "1rem", background: "#1f2937", color: "#fff", overflowY: "auto" }}>
                <h2>Route Setup</h2>

                <input placeholder="Route Name" value={routeName} onChange={e => setRouteName(e.target.value)}
                       style={{ width: "100%", marginBottom: "0.25rem", fontSize: "0.85rem", padding: "0.35rem" }} />
                <input placeholder="Route Code" value={routeCode} onChange={e => setRouteCode(e.target.value)}
                       style={{ width: "100%", marginBottom: "0.25rem", fontSize: "0.85rem", padding: "0.35rem" }} />
                <input type="color" value={routeColor} onChange={e => setRouteColor(e.target.value)}
                       style={{ width: "100%", marginBottom: "0.25rem", height: "28px" }} />

                {/* Vertical buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.5rem" }}>
                    <button onClick={createRoute} style={{ padding: "0.35rem", background: "#2563eb", color: "#fff", fontSize: "0.85rem" }}>Create Route</button>
                    <button onClick={snapRoute} style={{ padding: "0.35rem", background: "#16a34a", color: "#fff", fontSize: "0.85rem" }}>Snap Route</button>
                    <button onClick={clearPoints} style={{ padding: "0.35rem", background: "#dc2626", color: "#fff", fontSize: "0.85rem" }}>Clear Points</button>
                    <button onClick={() => setEditMode(!editMode)}
                            style={{ padding: "0.35rem", background: editMode ? "#facc15" : "#6b7280", color: "#000", fontSize: "0.85rem" }}>
                        {editMode ? "Add Point Mode: ON" : "Add Point Mode: OFF"}
                    </button>
                </div>

                <hr style={{ borderColor: "#374151" }} />

                {/* Route List */}
                <h3 style={{ marginBottom: "0.25rem" }}>Routes</h3>
                {routes.map(route => (
                    <div key={route.id} style={{
                        padding: "0.35rem",
                        marginBottom: "0.25rem",
                        background: activeRouteId === route.id ? "#374151" : "#111827",
                        borderRadius: "4px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer"
                    }}>
                        <span onClick={() => setActiveRouteId(route.id)}>{route.name}</span>
                        <button onClick={() => deleteRoute(route.id)} style={{ background: "#7f1d1d", fontSize: "0.7rem" }}>✕</button>
                    </div>
                ))}

                {activeRouteId && (
                    <>
                        <hr style={{ borderColor: "#374151" }} />
                        <h3>Route Points</h3>
                        {routes.find(r => r.id === activeRouteId)?.points.map(([lng, lat], index) => (
                            <div key={index} style={{
                                display: "flex",
                                gap: "0.25rem",
                                alignItems: "center",
                                marginBottom: "0.25rem",
                                fontSize: "0.75rem"
                            }}>
                                <span>{index + 1}</span>
                                <input type="number" step="0.000001" value={lng} onChange={e => updatePoint(activeRouteId, index, e.target.value, lat)} style={{ width: "90px" }} />
                                <input type="number" step="0.000001" value={lat} onChange={e => updatePoint(activeRouteId, index, lng, e.target.value)} style={{ width: "90px" }} />
                                <button onClick={() => deletePoint(activeRouteId, index)} style={{ background: "#7f1d1d", fontSize: "0.7rem" }}>✕</button>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
