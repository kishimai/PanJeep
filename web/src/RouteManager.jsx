import { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import { RouteEditor } from "../src/RouteEditor.jsx";

/* ---------------- Route Manager ---------------- */

export function RouteManager({ operatorId }) {
    const mapContainer = useRef(null);
    const [map, setMap] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [activeRouteId, setActiveRouteId] = useState(null);
    const [selectedRouteId, setSelectedRouteId] = useState(null);
    const [viewEditRoute, setViewEditRoute] = useState(false);

    const [regions] = useState([
        { id: 1, name: "Region A" },
        { id: 2, name: "Region B" },
        { id: 3, name: "Region C" },
    ]);
    const [selectedRegionFilter, setSelectedRegionFilter] = useState("");

    const selectedRoute = useMemo(
        () => routes.find(r => r.id === selectedRouteId),
        [routes, selectedRouteId]
    );

    /* ---------------- Map Init ---------------- */

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

    /* ---------------- Draw Routes ---------------- */

    useEffect(() => {
        if (!map) return;

        routes.forEach(route => {
            const points = route.snappedPoints ?? route.rawPoints;
            if (!points || points.length < 2) return;

            const sourceId = `route-${route.id}`;
            const lineId = `route-line-${route.id}`;

            const geojson = {
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: points
                }
            };

            if (map.getSource(sourceId)) {
                map.getSource(sourceId).setData(geojson);
            } else {
                map.addSource(sourceId, { type: "geojson", data: geojson });
            }

            if (!map.getLayer(lineId)) {
                map.addLayer({
                    id: lineId,
                    type: "line",
                    source: sourceId,
                    paint: {
                        "line-color": route.color,
                        "line-width": activeRouteId === route.id ? 6 : 4
                    }
                });

                map.on("click", lineId, () => {
                    setSelectedRouteId(route.id);
                    setActiveRouteId(route.id);
                });
            }
        });
    }, [map, routes, activeRouteId]);

    /* ---------------- Region ---------------- */

    const assignRegion = (routeId, regionId) => {
        setRoutes(prev =>
            prev.map(r =>
                r.id === routeId ? { ...r, regionId: Number(regionId) } : r
            )
        );
    };

    const getRegionName = (id) =>
        regions.find(r => r.id === id)?.name ?? "Unassigned";

    /* ---------------- UI ---------------- */

    return (
        <div style={{ display: "flex", height: "100vh", width: "100%" }}>
            <div ref={mapContainer} style={{ flex: 1 }} />

            <div style={{ width: 320, padding: "1rem", background: "#1f2937", color: "#fff", overflowY: "auto" }}>
                {!viewEditRoute ? (
                    <>
                        <h2>Route Overview</h2>

                        <button
                            onClick={() => setViewEditRoute(true)}
                            style={{ width: "100%", marginBottom: "0.5rem" }}
                        >
                            Create / Edit Route
                        </button>

                        <label>Filter by Region</label>
                        <select
                            value={selectedRegionFilter}
                            onChange={e => setSelectedRegionFilter(e.target.value)}
                            style={{ width: "100%", marginBottom: "1rem" }}
                        >
                            <option value="">All Regions</option>
                            {regions.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>

                        <h3>Routes</h3>
                        {routes
                            .filter(r => !selectedRegionFilter || r.regionId === Number(selectedRegionFilter))
                            .map(route => (
                                <div
                                    key={route.id}
                                    onClick={() => setSelectedRouteId(route.id)}
                                    style={{
                                        padding: "0.35rem",
                                        background: selectedRouteId === route.id ? "#374151" : "#111827",
                                        marginBottom: "0.25rem",
                                        cursor: "pointer"
                                    }}
                                >
                                    {route.name}
                                </div>
                            ))}

                        {selectedRoute && (
                            <>
                                <hr />
                                <h3>{selectedRoute.name}</h3>

                                <p>Region: {getRegionName(selectedRoute.regionId)}</p>
                                <p>
                                    Points: {(selectedRoute.snappedPoints ?? selectedRoute.rawPoints).length}
                                </p>

                                <p>
                                    Length: {estimateLength(selectedRoute.snappedPoints ?? selectedRoute.rawPoints)} km
                                </p>

                                <p>
                                    ETA: ~{Math.round(
                                    (estimateLength(selectedRoute.snappedPoints ?? selectedRoute.rawPoints) / 30) * 60
                                )} min
                                </p>

                                <label>Assign Region</label>
                                <select
                                    value={selectedRoute.regionId || ""}
                                    onChange={e => assignRegion(selectedRoute.id, e.target.value)}
                                    style={{ width: "100%" }}
                                >
                                    <option value="">Unassigned</option>
                                    {regions.map(r => (
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
