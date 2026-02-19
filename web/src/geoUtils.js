// geoUtils.js
export function haversineDistance(p1, p2) {
    const R = 6371000 // metres
    const [lng1, lat1] = p1.map(c => c * Math.PI / 180)
    const [lng2, lat2] = p2.map(c => c * Math.PI / 180)
    const dlat = lat2 - lat1
    const dlng = lng2 - lng1
    const a = Math.sin(dlat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlng/2)**2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
}

function projectPointOnSegment(point, a, b) {
    const [px, py] = point
    const [ax, ay] = a
    const [bx, by] = b
    const abx = bx - ax
    const aby = by - ay
    const t = ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)
    const clampedT = Math.max(0, Math.min(1, t))
    return [ax + clampedT * abx, ay + clampedT * aby]
}

export function projectOnPolyline(coords, point) {
    let minDist = Infinity
    let best = { cumDist: 0, projectedPoint: point }

    let cumulative = 0
    for (let i = 0; i < coords.length - 1; i++) {
        const a = coords[i]
        const b = coords[i + 1]
        const segmentDist = haversineDistance(a, b)

        const proj = projectPointOnSegment(point, a, b)
        const dist = haversineDistance(point, proj)

        if (dist < minDist) {
            minDist = dist
            const alongSegment = haversineDistance(a, proj)
            best.cumDist = cumulative + alongSegment
            best.projectedPoint = proj
        }
        cumulative += segmentDist
    }
    return best
}