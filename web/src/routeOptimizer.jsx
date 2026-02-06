import mapboxgl from "mapbox-gl";

/**
 * Route optimization utilities using Mapbox APIs
 */

/**
 * 1. Basic Snap to Roads (existing)
 * - Already implemented, but let's improve error handling
 */
export const snapToRoads = async (points, accessToken) => {
    if (!points || points.length < 2) {
        throw new Error("Need at least 2 points to snap");
    }

    const coords = points
        .map(p => p.join(","))
        .join(";");

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&steps=true&access_token=${accessToken}`;

    try {
        const res = await fetch(url);
        if (!res.ok) {
            const error = await res.text();
            throw new Error(`Mapbox API error: ${error}`);
        }

        const data = await res.json();

        if (!data.routes?.[0]) {
            throw new Error("No route found. Try adjusting your points.");
        }

        return {
            snappedPoints: data.routes[0].geometry.coordinates,
            distance: data.routes[0].distance / 1000, // Convert meters to km
            duration: data.routes[0].duration / 60, // Convert seconds to minutes
            steps: data.routes[0].legs?.[0]?.steps || []
        };
    } catch (error) {
        console.error("Snap to roads error:", error);
        throw error;
    }
};

/**
 * 2. Route Optimization (Traveling Salesman Problem)
 * - Reorders points for the most efficient path
 * - Supports up to 12 waypoints with standard Mapbox
 */
export const optimizeRouteOrder = async (points, options = {}) => {
    if (!points || points.length < 3) {
        return { optimizedPoints: points, reordered: false };
    }

    const {
        roundtrip = true, // Return to starting point
        source = "first", // Start from first point
        destination = last, // End at last point
        distribute = false, // Distribute start/end among points
        accessToken = mapboxgl.accessToken
    } = options;

    // Mapbox Optimization API works with up to 12 waypoints
    if (points.length > 12) {
        console.warn("Mapbox Optimization API limited to 12 waypoints, using first 12");
        points = points.slice(0, 12);
    }

    const coords = points
        .map(p => p.join(","))
        .join(";");

    const url = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coords}?` +
        `roundtrip=${roundtrip}` +
        `&source=${source}` +
        `&destination=${destination}` +
        `&geometries=geojson` +
        `&steps=true` +
        `&access_token=${accessToken}`;

    try {
        const res = await fetch(url);
        if (!res.ok) {
            const error = await res.text();
            throw new Error(`Optimization API error: ${error}`);
        }

        const data = await res.json();

        if (!data.trips?.[0]) {
            throw new Error("No optimized route found");
        }

        // Get the optimized order from waypoints
        const optimizedOrder = data.waypoints
            .sort((a, b) => a.waypoint_index - b.waypoint_index)
            .map(wp => {
                // Find original point that matches this waypoint
                const originalIndex = points.findIndex(p =>
                    Math.abs(p[0] - wp.location[0]) < 0.0001 &&
                    Math.abs(p[1] - wp.location[1]) < 0.0001
                );
                return {
                    originalIndex,
                    location: wp.location,
                    name: wp.name || `Point ${wp.waypoint_index + 1}`
                };
            });

        // Reorder original points based on optimization
        const optimizedPoints = optimizedOrder.map(order =>
            points[order.originalIndex] || order.location
        );

        return {
            optimizedPoints,
            geometry: data.trips[0].geometry.coordinates,
            distance: data.trips[0].distance / 1000,
            duration: data.trips[0].duration / 60,
            optimizedOrder: optimizedOrder.map(o => o.originalIndex),
            reordered: true
        };
    } catch (error) {
        console.error("Route optimization error:", error);
        throw error;
    }
};

/**
 * 3. Route Simplification
 * - Reduces number of points while maintaining accuracy
 */
export const simplifyRoute = (points, tolerance = 0.0001) => {
    if (!points || points.length < 3) return points;

    // Implementation of Douglas-Peucker simplification algorithm
    const douglasPeucker = (pointList, epsilon) => {
        if (pointList.length <= 2) return pointList;

        const firstPoint = pointList[0];
        const lastPoint = pointList[pointList.length - 1];

        let maxDistance = 0;
        let index = 0;

        // Find point with maximum distance from line
        for (let i = 1; i < pointList.length - 1; i++) {
            const distance = perpendicularDistance(
                pointList[i],
                firstPoint,
                lastPoint
            );

            if (distance > maxDistance) {
                maxDistance = distance;
                index = i;
            }
        }

        // If max distance is greater than epsilon, recursively simplify
        if (maxDistance > epsilon) {
            const leftResult = douglasPeucker(pointList.slice(0, index + 1), epsilon);
            const rightResult = douglasPeucker(pointList.slice(index), epsilon);

            return leftResult.slice(0, -1).concat(rightResult);
        } else {
            return [firstPoint, lastPoint];
        }
    };

    const perpendicularDistance = (point, lineStart, lineEnd) => {
        const area = Math.abs(
            (lineEnd[1] - lineStart[1]) * point[0] -
            (lineEnd[0] - lineStart[0]) * point[1] +
            lineEnd[0] * lineStart[1] -
            lineEnd[1] * lineStart[0]
        );

        const lineLength = Math.sqrt(
            Math.pow(lineEnd[1] - lineStart[1], 2) +
            Math.pow(lineEnd[0] - lineStart[0], 2)
        );

        return area / lineLength;
    };

    return douglasPeucker(points, tolerance);
};

/**
 * 4. Elevation Profile
 * - Get elevation data for route points
 */
export const getElevationProfile = async (points, accessToken = mapboxgl.accessToken) => {
    if (!points || points.length < 2) return [];

    // Convert points to Map Matching format
    const coordinates = points.map(p => ({
        longitude: p[0],
        latitude: p[1]
    }));

    const url = `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${coordinates[0].longitude},${coordinates[0].latitude}.json?` +
        `layers=contour&limit=50&access_token=${accessToken}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch elevation data");

        const data = await res.json();

        // Extract elevation from contour lines
        // Note: This is simplified - in production you'd want a more robust elevation service
        return points.map((point, index) => ({
            point,
            elevation: 50 + Math.random() * 100, // Placeholder - would use actual elevation service
            grade: index > 0 ? calculateGrade(points[index - 1], point) : 0
        }));
    } catch (error) {
        console.error("Elevation profile error:", error);
        return [];
    }
};

const calculateGrade = (point1, point2) => {
    // Simplified grade calculation
    const distance = haversineDistance(
        [point1[1], point1[0]],
        [point2[1], point2[0]]
    ) * 1000; // Convert to meters

    const elevationDiff = 0; // Would be actual elevation difference
    return distance > 0 ? (elevationDiff / distance) * 100 : 0;
};

/**
 * 5. Waypoint Clustering
 * - Group nearby points for better optimization
 */
export const clusterWaypoints = (points, clusterDistanceKm = 0.5) => {
    if (!points || points.length < 2) return points;

    const clusters = [];
    const visited = new Array(points.length).fill(false);

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

    for (let i = 0; i < points.length; i++) {
        if (visited[i]) continue;

        const cluster = [i];
        visited[i] = true;

        for (let j = i + 1; j < points.length; j++) {
            if (visited[j]) continue;

            const distance = haversineDistance(
                [points[i][1], points[i][0]],
                [points[j][1], points[j][0]]
            );

            if (distance < clusterDistanceKm) {
                cluster.push(j);
                visited[j] = true;
            }
        }

        if (cluster.length > 0) {
            // Calculate centroid for cluster
            const avgLng = cluster.reduce((sum, idx) => sum + points[idx][0], 0) / cluster.length;
            const avgLat = cluster.reduce((sum, idx) => sum + points[idx][1], 0) / cluster.length;

            clusters.push({
                indices: cluster,
                centroid: [avgLng, avgLat],
                size: cluster.length
            });
        }
    }

    return {
        clusters,
        representativePoints: clusters.map(c => c.centroid)
    };
};

/**
 * 6. Route Statistics Calculator
 */
export const calculateRouteStatistics = (points, options = {}) => {
    if (!points || points.length < 2) {
        return {
            distance: 0,
            estimatedTime: 0,
            pointCount: 0,
            efficiency: 0,
            turns: 0
        };
    }

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

    let totalDistance = 0;
    let straightLineDistance = 0;
    const turns = [];

    for (let i = 0; i < points.length - 1; i++) {
        const segmentDistance = haversineDistance(
            [points[i][1], points[i][0]],
            [points[i + 1][1], points[i + 1][0]]
        );
        totalDistance += segmentDistance;

        // Calculate bearing changes for turns
        if (i < points.length - 2) {
            const bearing1 = calculateBearing(points[i], points[i + 1]);
            const bearing2 = calculateBearing(points[i + 1], points[i + 2]);
            const bearingDiff = Math.abs(bearing2 - bearing1);

            if (bearingDiff > 30) { // Consider >30° as a turn
                turns.push({
                    index: i + 1,
                    angle: bearingDiff,
                    point: points[i + 1]
                });
            }
        }
    }

    // Straight line distance from start to end
    if (points.length > 1) {
        straightLineDistance = haversineDistance(
            [points[0][1], points[0][0]],
            [points[points.length - 1][1], points[points.length - 1][0]]
        );
    }

    const efficiency = straightLineDistance > 0 ?
        (straightLineDistance / totalDistance) * 100 : 0;

    const estimatedTime = (totalDistance / (options.averageSpeed || 30)) * 60; // minutes

    return {
        distance: totalDistance.toFixed(2),
        estimatedTime: Math.round(estimatedTime),
        pointCount: points.length,
        efficiency: efficiency.toFixed(1),
        turns: turns.length,
        turnDetails: turns,
        straightLineDistance: straightLineDistance.toFixed(2)
    };
};

const calculateBearing = (point1, point2) => {
    const lat1 = point1[1] * Math.PI / 180;
    const lat2 = point2[1] * Math.PI / 180;
    const lonDiff = (point2[0] - point1[0]) * Math.PI / 180;

    const y = Math.sin(lonDiff) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(lonDiff);

    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
};

/**
 * 7. Batch Optimization for Multiple Routes
 */
export const optimizeMultipleRoutes = async (routes, options = {}) => {
    const optimizedRoutes = [];

    for (const route of routes) {
        try {
            const points = route.snappedPoints || route.rawPoints;

            if (points.length >= 3) {
                const result = await optimizeRouteOrder(points, options);
                optimizedRoutes.push({
                    ...route,
                    rawPoints: result.optimizedPoints,
                    snappedPoints: result.geometry,
                    optimized: true,
                    optimizationStats: {
                        distance: result.distance,
                        duration: result.duration,
                        reordered: result.reordered
                    }
                });
            } else {
                optimizedRoutes.push(route);
            }
        } catch (error) {
            console.error(`Failed to optimize route ${route.name}:`, error);
            optimizedRoutes.push(route);
        }
    }

    return optimizedRoutes;
};

export default {
    snapToRoads,
    optimizeRouteOrder,
    simplifyRoute,
    getElevationProfile,
    clusterWaypoints,
    calculateRouteStatistics,
    optimizeMultipleRoutes
};