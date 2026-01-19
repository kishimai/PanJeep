import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

export function RouteCreator({ regionId, operatorId }) {
    const mapContainer = useRef(null);
    const [map, setMap] = useState(null);
    const [points, setPoints] = useState([]);
    const [routeName, setRouteName] = useState("");
    const [routeCode, setRouteCode] = useState("");

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

        setMap(mapInstance);

        return () => mapInstance.remove();
    }, []);

    // Add point on map click
    useEffect(() => {
        if (!map) return;

        const onClick = (e) => {
            setPoints((prev) => [...prev, [e.lngLat.lng, e.lngLat.lat]]);
        };

        map.on("click", onClick);
        return () => map.off("click", onClick);
    }, [map]);

    // Draw line
    useEffect(() => {
        if (!map || points.length < 2) return;

        const routeGeoJSON = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: points,
            },
        };

        if (map.getSource("route")) {
            map.getSource("route").setData(routeGeoJSON);
        } else {
            map.addSource("route", { type: "geojson", data: routeGeoJSON });
            map.addLayer({
                id: "route-line",
                type: "line",
                source: "route",
                paint: {
                    "line-color": "#0074D9",
                    "line-width": 4,
                },
            });
        }
    }, [map, points]);

    const saveRoute = async () => {
        if (!routeName || !routeCode || points.length < 2) {
            alert("Route name, code, and at least 2 points are required.");
            return;
        }

        const routeGeoJSON = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: points,
            },
        };

        // TODO: Save to Supabase here
        console.log("Save route:", {
            regionId,
            operatorId,
            routeName,
            routeCode,
            geometry: routeGeoJSON,
        });
    };

    return (
        <div style={{ display: "flex", height: "100vh" }}>
            <div style={{ width: "280px", padding: "1rem", background: "#1f2937", color: "#fff" }}>
                <h2>Route Setup</h2>

                <label>Route Name</label>
                <input
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    placeholder="e.g., Route 1"
                />

                <label>Route Code</label>
                <input
                    value={routeCode}
                    onChange={(e) => setRouteCode(e.target.value)}
                    placeholder="e.g., R-01"
                />

                <button onClick={saveRoute}>Save Route</button>

                <p>Click on map to draw the route.</p>
            </div>

            <div ref={mapContainer} style={{ flex: 1 }} />
        </div>
    );
}
