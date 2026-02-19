// supabase/functions/update-route-graph-nodes/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Candidate {
  nodeId: string
  cumDist: number
  distance: number
}

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get route ID from request body
    const { routeId } = await req.json()
    if (!routeId) {
      return new Response(JSON.stringify({ error: 'Missing routeId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create Supabase client with service role key (from environment)
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { persistSession: false } }
    )

    // Fetch route geometry
    const { data: route, error: routeError } = await supabase
        .from('routes')
        .select('geometry')
        .eq('id', routeId)
        .is('deleted_at', null)
        .single()

    if (routeError || !route) {
      return new Response(JSON.stringify({ error: 'Route not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const geometry = route.geometry
    if (!geometry || geometry.type !== 'LineString') {
      return new Response(JSON.stringify({ error: 'Invalid geometry' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const coords = geometry.coordinates // [[lng, lat], ...]

    // Fetch all graph nodes
    const { data: nodes, error: nodesError } = await supabase
        .from('graph_nodes')
        .select('id, lat, lng')

    if (nodesError) throw nodesError

    // Helper function: Haversine distance in meters
    const haversineDistance = (p1: number[], p2: number[]): number => {
      const R = 6371000 // Earth's radius in meters
      const [lng1, lat1] = p1.map(c => c * Math.PI / 180)
      const [lng2, lat2] = p2.map(c => c * Math.PI / 180)
      const dlat = lat2 - lat1
      const dlng = lng2 - lng1
      const a = Math.sin(dlat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlng/2)**2
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      return R * c
    }

    // Project a point onto a line segment
    const projectPointOnSegment = (point: number[], a: number[], b: number[]): number[] => {
      const [px, py] = point
      const [ax, ay] = a
      const [bx, by] = b
      const abx = bx - ax
      const aby = by - ay
      const t = ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)
      const clampedT = Math.max(0, Math.min(1, t))
      return [ax + clampedT * abx, ay + clampedT * aby]
    }

    // Project a point onto a polyline and get cumulative distance
    const projectOnPolyline = (coords: number[][], point: number[]) => {
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

    const THRESHOLD = 50 // meters - maximum distance a node can be from the route

    // Build candidates - find all nodes within threshold distance of the route
    const candidates: Candidate[] = []
    for (const node of nodes) {
      const nodeCoord = [node.lng, node.lat]
      const proj = projectOnPolyline(coords, nodeCoord)
      const distToRoute = haversineDistance(nodeCoord, proj.projectedPoint)
      if (distToRoute <= THRESHOLD) {
        candidates.push({
          nodeId: node.id,
          cumDist: proj.cumDist, // Distance from start of route in meters
          distance: distToRoute,  // Perpendicular distance from route
        })
      }
    }

    // Sort by cumulative distance along the route
    candidates.sort((a, b) => a.cumDist - b.cumDist)

    // Remove duplicates (if two nodes are very close, keep the closer one)
    // This prevents the same node from appearing twice
    const unique: Candidate[] = []
    const seen = new Set()
    for (const cand of candidates) {
      if (!seen.has(cand.nodeId)) {
        unique.push(cand)
        seen.add(cand.nodeId)
      }
    }

    // Clear old links for this route
    const { error: deleteError } = await supabase
        .from('route_graph_nodes')
        .delete()
        .eq('route_id', routeId)

    if (deleteError) throw deleteError

    // Insert new links with distance_from_start_m
    if (unique.length > 0) {
      const links = unique.map((cand, index) => ({
        route_id: routeId,
        graph_node_id: cand.nodeId,
        order_index: index + 1,
        distance_from_start_m: Math.round(cand.cumDist), // Round to nearest meter
      }))

      const { error: insertError } = await supabase
          .from('route_graph_nodes')
          .insert(links)

      if (insertError) throw insertError
    }

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      count: unique.length,
      message: `Linked ${unique.length} nodes to route`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in edge function:', error)

    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})