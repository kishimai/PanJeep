export const haversineDistance = ([lat1, lon1], [lat2, lon2]) => {
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

export const estimateLength = (points = []) => {
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

export const clonePoints = (pts) => pts.map(p => [...p]);