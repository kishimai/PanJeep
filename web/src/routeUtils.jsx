// routeUtils.jsx

/**
 * Calculate distance between two points in kilometers
 */
export const haversineDistance = (point1, point2) => {
    const [lon1, lat1] = point1;
    const [lon2, lat2] = point2;

    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

/**
 * Estimate total route length
 */
export const estimateLength = (points) => {
    if (points.length < 2) return 0;

    let total = 0;
    for (let i = 1; i < points.length; i++) {
        total += haversineDistance(points[i-1], points[i]);
    }
    return total;
};

/**
 * Deep clone points array
 */
export const clonePoints = (points) => {
    return points.map(point => [...point]);
};

/**
 * Validate coordinate values
 */
export const validateCoordinate = (value, type) => {
    const num = parseFloat(value);

    if (isNaN(num)) {
        alert(`Invalid ${type} coordinate: must be a number`);
        return false;
    }

    if (type === 'lng' && (num < -180 || num > 180)) {
        alert(`Longitude must be between -180 and 180`);
        return false;
    }

    if (type === 'lat' && (num < -90 || num > 90)) {
        alert(`Latitude must be between -90 and 90`);
        return false;
    }

    return true;
};

/**
 * Simplify route using Douglas-Peucker algorithm
 */
export const simplifyRoute = (points, tolerance = 0.0001) => {
    if (points.length <= 2) return points;

    // Convert to radians for better distance calculation
    const toRadians = (coord) => [coord[0] * Math.PI / 180, coord[1] * Math.PI / 180];
    const radPoints = points.map(toRadians);

    const douglasPeucker = (pointList, epsilon) => {
        if (pointList.length <= 2) return pointList;

        // Find the point with the maximum distance
        let dmax = 0;
        let index = 0;
        const [start, end] = [pointList[0], pointList[pointList.length - 1]];

        for (let i = 1; i < pointList.length - 1; i++) {
            const d = perpendicularDistance(pointList[i], start, end);
            if (d > dmax) {
                index = i;
                dmax = d;
            }
        }

        // If max distance is greater than epsilon, recursively simplify
        if (dmax > epsilon) {
            const recResults1 = douglasPeucker(pointList.slice(0, index + 1), epsilon);
            const recResults2 = douglasPeucker(pointList.slice(index), epsilon);

            // Combine results
            return [...recResults1.slice(0, -1), ...recResults2];
        } else {
            return [start, end];
        }
    };

    const perpendicularDistance = (point, lineStart, lineEnd) => {
        const [x, y] = point;
        const [x1, y1] = lineStart;
        const [x2, y2] = lineEnd;

        const area = Math.abs(0.5 * (x1 * (y2 - y) + x2 * (y - y1) + x * (y1 - y2)));
        const bottom = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

        if (bottom === 0) return 0;
        return (2 * area) / bottom;
    };

    const simplifiedRad = douglasPeucker(radPoints, tolerance);

    // Convert back to degrees
    return simplifiedRad.map(coord => [
        coord[0] * 180 / Math.PI,
        coord[1] * 180 / Math.PI
    ]);
};

/**
 * Generate GeoJSON from route points
 */
export const pointsToGeoJSON = (points, properties = {}) => {
    return {
        type: "Feature",
        properties,
        geometry: {
            type: "LineString",
            coordinates: points
        }
    };
};

/**
 * Generate GPX from route points
 */
export const pointsToGPX = (points, name = "Route") => {
    const waypoints = points.map(([lon, lat]) =>
        `    <wpt lat="${lat}" lon="${lon}"></wpt>`
    ).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Route Editor" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${name}</name>
    <trkseg>
      ${points.map(([lon, lat]) =>
        `<trkpt lat="${lat}" lon="${lon}"></trkpt>`
    ).join('\n      ')}
    </trkseg>
  </trk>
</gpx>`;
};

export function isValidUUID(uuid) {
    if (!uuid) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// Helper function for generating distinct route colors
// Helper function for generating distinct route colors
export const getRandomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 55%)`;
};