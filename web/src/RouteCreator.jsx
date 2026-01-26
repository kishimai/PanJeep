import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

export function RouteCreator({ regionId, operatorId }) {
    const mapContainer = useRef(null);
    const dragIndex = useRef(null);

    const [map, setMap] = useState(null);
    const [points, setPoints] = useState([]);
    const [snappedRoute, setSnappedRoute] = useState(null);
    const [routeName, setRouteName] = useState("");
    const [routeCode, setRouteCode] = useState("");
    const [manualPoints, setManualPoints] = useState(new Set()); // track manual points

    // Initialize map
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

    // Add point on map click
    useEffect(() => {
        if (!map) return;

        const onClick = (e) => {
            setPoints((prev) => [[e.lngLat.lng, e.lngLat.lat], ...prev]); // add on top
            setManualPoints((prev) => {
                const updated = new Set(Array.from(prev).map(i => i + 1));
                updated.add(0); // new top index is manual
                return updated;
            });
            setSnappedRoute(null);
        };

        map.on("click", onClick);
        return () => map.off("click", onClick);
    }, [map]);

    // Draw raw route (blue)
    useEffect(() => {
        if (!map) return;

        const geojson = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: points.slice().reverse(), // map order top-down
            },
        };

        if (map.getSource("route")) {
            map.getSource("route").setData(geojson);
        } else if (points.length >= 2) {
            map.addSource("route", { type: "geojson", data: geojson });
            map.addLayer({
                id: "route-line",
                type: "line",
                source: "route",
                paint: {
                    "line-color": "#2563eb",
                    "line-width": 4,
                },
            });
        }
    }, [map, points]);

    // Draw snapped route (green)
    useEffect(() => {
        if (!map || !snappedRoute) return;

        const geojson = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: snappedRoute,
            },
        };

        if (map.getSource("snapped-route")) {
            map.getSource("snapped-route").setData(geojson);
        } else {
            map.addSource("snapped-route", {
                type: "geojson",
                data: geojson,
            });

            map.addLayer({
                id: "snapped-route-line",
                type: "line",
                source: "snapped-route",
                paint: {
                    "line-color": "#22c55e",
                    "line-width": 5,
                },
            });
        }
    }, [map, snappedRoute]);

    // Road snapping via Mapbox Directions API
    const snapRouteToRoads = async () => {
        if (points.length < 2) return;

        const coordinates = points.slice().reverse()
            .map(([lng, lat]) => `${lng},${lat}`)
            .join(";");

        const url =
            `https://api.mapbox.com/directions/v5/mapbox/driving/` +
            `${coordinates}` +
            `?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

        try {
            const res = await fetch(url);
            const data = await res.json();

            if (!data.routes || !data.routes[0]) return;

            const snappedCoords = data.routes[0].geometry.coordinates;
            setPoints(snappedCoords.slice().reverse()); // latest on top
            setSnappedRoute(snappedCoords);
            setManualPoints(new Set());
        } catch (err) {
            console.error("Road snapping failed", err);
        }
    };

    // Update point
    const updatePoint = (index, axis, value) => {
        setPoints((prev) =>
            prev.map((p, i) =>
                i === index
                    ? axis === "lng"
                        ? [parseFloat(value), p[1]]
                        : [p[0], parseFloat(value)]
                    : p
            )
        );
        setSnappedRoute(null);
        setManualPoints((prev) => new Set(prev).add(index));
    };

    // Delete point
    const deletePoint = (index) => {
        setPoints((prev) => prev.filter((_, i) => i !== index));
        setSnappedRoute(null);
        setManualPoints((prev) => {
            const updated = new Set(prev);
            updated.delete(index);
            return updated;
        });
    };

    // Drag reorder
    const onDragStart = (index) => {
        dragIndex.current = index;
    };

    const onDrop = (index) => {
        const from = dragIndex.current;
        if (from === null || from === index) return;

        setPoints((prev) => {
            const updated = [...prev];
            const [moved] = updated.splice(from, 1);
            updated.splice(index, 0, moved);
            return updated;
        });

        setSnappedRoute(null);

        setManualPoints((prev) => {
            const updated = new Set(prev);
            const newSet = new Set();
            Array.from(updated).forEach((i) => {
                if (i === from) newSet.add(index);
                else if (from < index && i > from && i <= index) newSet.add(i - 1);
                else if (from > index && i >= index && i < from) newSet.add(i + 1);
                else newSet.add(i);
            });
            return newSet;
        });

        dragIndex.current = null;
    };

    // Clear routes
    const clearRoutes = () => {
        setPoints([]);
        setSnappedRoute(null);
        setManualPoints(new Set());
    };

    return (
        <div style={{ display: "flex", height: "100vh", width: "100%" }}>
            <div ref={mapContainer} style={{ flex: 1 }} />

            {/* SIDEBAR */}
            <div
                style={{
                    width: "320px",
                    padding: "1rem",
                    background: "#1f2937",
                    color: "#fff",
                    overflowY: "auto",
                }}
            >
                <h2>Route Setup</h2>

                <input
                    placeholder="Route Name"
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    style={{ width: "100%", marginBottom: "0.5rem" }}
                />
                <input
                    placeholder="Route Code"
                    value={routeCode}
                    onChange={(e) => setRouteCode(e.target.value)}
                    style={{ width: "100%", marginBottom: "0.5rem" }}
                />

                {/* Buttons on top for easy access */}
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <button
                        onClick={snapRouteToRoads}
                        style={{ flex: 1, background: "#166534" }}
                    >
                        Snap Route
                    </button>
                    <button
                        onClick={clearRoutes}
                        style={{ flex: 1, background: "#7f1d1d" }}
                    >
                        Clear
                    </button>
                </div>

                <hr />

                <h3 style={{ marginBottom: "0.25rem" }}>Route Points</h3>

                {points.map(([lng, lat], index) => (
                    <div
                        key={index}
                        draggable
                        onDragStart={() => onDragStart(index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => onDrop(index)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            background: "#111827",
                            padding: "0.35rem",
                            marginBottom: "0.25rem",
                            borderRadius: "4px",
                            cursor: "grab",
                            fontSize: "0.75rem",
                        }}
                    >
                        <span style={{ opacity: 0.6 }}>{index + 1}</span>

                        {/* Manual point icon */}
                        {manualPoints.has(index) && (
                            <span
                                style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    background: "#facc15",
                                    display: "inline-block",
                                }}
                                title="Manually added"
                            ></span>
                        )}

                        <input
                            type="number"
                            step="0.000001"
                            value={lng}
                            onChange={(e) =>
                                updatePoint(index, "lng", e.target.value)
                            }
                            style={{ width: "90px" }}
                        />
                        <input
                            type="number"
                            step="0.000001"
                            value={lat}
                            onChange={(e) =>
                                updatePoint(index, "lat", e.target.value)
                            }
                            style={{ width: "90px" }}
                        />

                        <button
                            onClick={() => deletePoint(index)}
                            style={{
                                marginLeft: "auto",
                                background: "#7f1d1d",
                                fontSize: "0.7rem",
                            }}
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
