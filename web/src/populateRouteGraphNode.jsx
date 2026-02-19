// populateRouteGraphNodes.js
import { createClient } from '@supabase/supabase-js'
import { haversineDistance, projectOnPolyline } from './geoUtils.js' // we'll define these

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY // use service role to bypass RLS
)

// Distance threshold in meters – only nodes within this distance from the route will be considered
const THRESHOLD = 50

// Fetch all active routes (including geometry)
async function fetchRoutes() {
    const { data, error } = await supabase
        .from('routes')
        .select('id, geometry')
        .is('deleted_at', null)
        .neq('status', 'deprecated')
    if (error) throw error
    return data
}

// Fetch all graph nodes
async function fetchNodes() {
    const { data, error } = await supabase
        .from('graph_nodes')
        .select('id, lat, lng')
    if (error) throw error
    return data
}

// Clear existing links for a route (to avoid duplicates)
async function clearRouteLinks(routeId) {
    const { error } = await supabase
        .from('route_graph_nodes')
        .delete()
        .eq('route_id', routeId)
    if (error) console.error(`Error clearing links for route ${routeId}:`, error)
}

// Insert links for a route
async function insertRouteLinks(routeId, links) {
    if (links.length === 0) return
    const { error } = await supabase
        .from('route_graph_nodes')
        .insert(links.map(({ nodeId, orderIndex }) => ({
            route_id: routeId,
            graph_node_id: nodeId,
            order_index: orderIndex,
        })))
    if (error) console.error(`Error inserting links for route ${routeId}:`, error)
}

// Main processing function
async function processRoutes() {
    const routes = await fetchRoutes()
    const nodes = await fetchNodes()

    // Build a map of node coordinates
    const nodeMap = new Map(nodes.map(n => [n.id, [n.lng, n.lat]]))

    for (const route of routes) {
        const { id: routeId, geometry } = route
        if (!geometry || geometry.type !== 'LineString') {
            console.warn(`Route ${routeId} has invalid geometry, skipping`)
            continue
        }
        const coords = geometry.coordinates // [[lng, lat], ...]

        // For each node, compute its projection and distance along the route
        const candidates = []
        for (const node of nodes) {
            const nodeCoord = nodeMap.get(node.id)
            const proj = projectOnPolyline(coords, nodeCoord)
            const distToRoute = haversineDistance(nodeCoord, proj.projectedPoint)
            if (distToRoute <= THRESHOLD) {
                candidates.push({
                    nodeId: node.id,
                    cumDist: proj.cumDist,
                    distance: distToRoute,
                })
            }
        }

        // Sort by cumulative distance along the route
        candidates.sort((a, b) => a.cumDist - b.cumDist)

        // Remove duplicates (if two nodes are very close, keep the closer one)
        const unique = []
        const seen = new Set()
        for (const cand of candidates) {
            if (!seen.has(cand.nodeId)) {
                unique.push(cand)
                seen.add(cand.nodeId)
            }
        }

        // Clear old links and insert new ones
        await clearRouteLinks(routeId)
        const links = unique.map((cand, index) => ({
            nodeId: cand.nodeId,
            orderIndex: index + 1,
        }))
        await insertRouteLinks(routeId, links)

        console.log(`Route ${routeId}: ${links.length} nodes linked`)
    }
}

// Run
processRoutes().catch(console.error)