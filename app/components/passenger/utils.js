// ---------- COORDINATE PARSING ----------
export const extractCoordinates = (geometry) => {
    if (!geometry) return [];
    try {
        const parsed = typeof geometry === 'string' ? JSON.parse(geometry) : geometry;
        if (parsed.type === 'Feature' && parsed.geometry) return extractCoordinates(parsed.geometry);
        if (parsed.type === 'LineString' && Array.isArray(parsed.coordinates)) return parsed.coordinates;
        if (parsed.type === 'MultiLineString' && Array.isArray(parsed.coordinates)) return parsed.coordinates.flat();
        if (Array.isArray(parsed.coordinates)) return parsed.coordinates;
        if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) return parsed;
        console.warn('Unrecognized geometry format:', parsed);
        return [];
    } catch (e) {
        console.warn('Failed to parse geometry:', e.message);
        return [];
    }
};

export const normalizeCoordinates = (coords) => {
    if (!coords || !Array.isArray(coords)) return [];

    const normalized = [];
    for (const coord of coords) {
        if (!Array.isArray(coord) || coord.length < 2) continue;

        let [first, second] = coord;
        const isLatLngOrder_ph = first >= 4 && first <= 21 && second >= 116 && second <= 127;
        const isLngLatOrder_ph = first >= 116 && first <= 127 && second >= 4 && second <= 21;
        const isLngLat_heuristic = first > 100 && second < 100;
        const isLatLng_heuristic = first < 100 && second > 100;

        let longitude, latitude;
        if (isLatLngOrder_ph || isLatLng_heuristic) {
            latitude = first;
            longitude = second;
        } else if (isLngLatOrder_ph || isLngLat_heuristic) {
            longitude = first;
            latitude = second;
        } else {
            longitude = first;
            latitude = second;
        }

        normalized.push({ latitude, longitude });
    }
    return normalized;
};

// ---------- MAP REGION ----------
export const calculateRegion = (coordinates, includeUserLocation = null, padding = 0.05) => {
    if (!coordinates || coordinates.length === 0) {
        return { latitude: 14.5995, longitude: 120.9842, latitudeDelta: 0.1, longitudeDelta: 0.1 };
    }

    let allCoords = [...coordinates];
    if (includeUserLocation) allCoords.push(includeUserLocation);

    let minLat = allCoords[0].latitude, maxLat = allCoords[0].latitude;
    let minLng = allCoords[0].longitude, maxLng = allCoords[0].longitude;

    for (const coord of allCoords) {
        minLat = Math.min(minLat, coord.latitude);
        maxLat = Math.max(maxLat, coord.latitude);
        minLng = Math.min(minLng, coord.longitude);
        maxLng = Math.max(maxLng, coord.longitude);
    }

    return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max((maxLat - minLat) * (1 + padding), 0.01),
        longitudeDelta: Math.max((maxLng - minLng) * (1 + padding), 0.01),
    };
};

// ---------- ROUTE METADATA ----------
export const calculateFare = (lengthMeters) => {
    if (!lengthMeters) return '₱12-15';
    const lengthKm = lengthMeters / 1000;
    const baseFare = 12, ratePerKm = 2, freeKm = 5;
    let fare = baseFare;
    if (lengthKm > freeKm) fare += Math.ceil((lengthKm - freeKm) * ratePerKm);
    const minFare = Math.max(12, fare - 3);
    const maxFare = fare + 3;
    return `₱${minFare}-${maxFare}`;
};

export const calculateTravelTime = (lengthMeters) => {
    if (!lengthMeters) return '45-60 min';
    const lengthKm = lengthMeters / 1000;
    const estimatedMinutes = Math.round((lengthKm / 20) * 60);
    const minTime = Math.max(15, estimatedMinutes - 15);
    const maxTime = estimatedMinutes + 15;
    return `${minTime}-${maxTime} min`;
};

export const calculateRouteSegments = (coordinates) => {
    if (!coordinates || coordinates.length < 2) return [];
    const segments = [];
    for (let i = 0; i < coordinates.length - 1; i += 2) {
        segments.push({ start: coordinates[i], end: coordinates[i + 1], index: i });
    }
    return segments.slice(-3);
};