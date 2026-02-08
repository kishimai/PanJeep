import { v4 as uuidv4 } from 'uuid';

/**
 * Creates an empty route object with default values
 * @param {Object} options - Route configuration options
 * @returns {Object} Route object
 */
export function createEmptyRoute(options = {}) {
    const timestamp = new Date().toISOString();

    return {
        // Local UI properties
        id: options.id || `local-${uuidv4()}`,
        name: options.name || 'New Route',
        code: options.code || '',
        color: options.color || '#1d4ed8',
        rawPoints: options.rawPoints || [],
        snappedPoints: options.snappedPoints || null,
        history: options.history || [],
        future: options.future || [],

        // Database properties that match Supabase schema
        route_code: options.code || options.name || '',
        origin_type: options.originType || 'operator_proposed',
        proposed_by_user_id: options.proposed_by_user_id || null,
        proposal_reason: options.proposal_reason || '',
        status: options.status || 'draft',
        status_reason: options.status_reason || '',
        status_changed_at: options.status_changed_at || null,
        status_changed_by: options.status_changed_by || null,
        geometry: {
            type: 'LineString',
            coordinates: options.rawPoints || [],
            properties: {
                color: options.color || '#1d4ed8',
                name: options.name || 'New Route'
            }
        },
        stops_snapshot: options.snappedPoints ? {
            type: 'LineString',
            coordinates: options.snappedPoints
        } : null,
        length_meters: options.length_meters || 0,
        last_geometry_update_at: options.last_geometry_update_at || timestamp,
        credit_status: options.credit_status || 'uncredited',
        credited_by_operator_id: options.credited_by_operator_id || null,
        credited_at: options.credited_at || null,
        credit_confidence: options.credit_confidence || null,
        credit_reason: options.credit_reason || null,
        driver_adoption_score: options.driver_adoption_score || 0,
        passenger_usage_score: options.passenger_usage_score || 0,
        field_verification_score: options.field_verification_score || 0,
        data_confidence_score: options.data_confidence_score || 0,
        region_id: options.region_id || options.regionId || null,
        created_at: options.created_at || timestamp,
        updated_at: options.updated_at || timestamp,
        deleted_at: options.deleted_at || null
    };
}

/**
 * Validates a route object against the database schema
 * @param {Object} route - Route object to validate
 * @returns {Object} Validation result { isValid: boolean, errors: Array<string> }
 */
export function validateRoute(route) {
    const errors = [];

    // Required fields
    if (!route.route_code || route.route_code.trim() === '') {
        errors.push('route_code is required');
    }

    if (!route.geometry || !route.geometry.coordinates || !Array.isArray(route.geometry.coordinates)) {
        errors.push('geometry.coordinates must be an array');
    }

    if (route.geometry?.coordinates && route.geometry.coordinates.length < 2) {
        errors.push('Route must have at least 2 points');
    }

    // Status validation
    const validStatuses = ['draft', 'pending', 'active', 'inactive', 'deleted'];
    if (route.status && !validStatuses.includes(route.status)) {
        errors.push(`status must be one of: ${validStatuses.join(', ')}`);
    }

    // Credit status validation
    const validCreditStatuses = ['uncredited', 'pending', 'credited', 'rejected'];
    if (route.credit_status && !validCreditStatuses.includes(route.credit_status)) {
        errors.push(`credit_status must be one of: ${validCreditStatuses.join(', ')}`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Converts UI route format to Supabase database format
 * @param {Object} uiRoute - Route in UI format
 * @param {string} userId - Current user ID for proposed_by_user_id
 * @param {Object} updates - Additional updates to merge
 * @returns {Object} Route in Supabase format
 */
export function routeToSupabaseFormat(uiRoute, userId = null, updates = {}) {
    // Calculate length in meters if not provided
    const lengthMeters = uiRoute.length_meters ||
        (uiRoute.lengthMeters ||
            (uiRoute.rawPoints ? calculateLength(uiRoute.rawPoints) : 0));

    const supabaseRoute = {
        route_code: uiRoute.code || uiRoute.name || `ROUTE_${Date.now()}`,
        origin_type: uiRoute.origin_type || uiRoute.originType || 'operator_proposed',
        proposed_by_user_id: userId || uiRoute.proposed_by_user_id || null,
        proposal_reason: uiRoute.proposal_reason || uiRoute.proposalReason || '',
        status: uiRoute.status || 'draft',
        status_reason: uiRoute.status_reason || uiRoute.statusReason || '',
        status_changed_at: uiRoute.status_changed_at || new Date().toISOString(),
        geometry: {
            type: 'LineString',
            coordinates: uiRoute.rawPoints || [],
            properties: {
                color: uiRoute.color || '#1d4ed8',
                name: uiRoute.name || 'New Route',
                ...(uiRoute.geometry?.properties || {})
            }
        },
        stops_snapshot: uiRoute.snappedPoints ? {
            type: 'LineString',
            coordinates: uiRoute.snappedPoints
        } : null,
        length_meters: Math.round(lengthMeters),
        last_geometry_update_at: uiRoute.last_geometry_update_at || new Date().toISOString(),
        credit_status: uiRoute.credit_status || uiRoute.creditStatus || 'uncredited',
        credited_by_operator_id: uiRoute.credited_by_operator_id || null,
        credited_at: uiRoute.credited_at || null,
        credit_confidence: uiRoute.credit_confidence || null,
        credit_reason: uiRoute.credit_reason || null,
        driver_adoption_score: uiRoute.driver_adoption_score || uiRoute.driverAdoptionScore || 0,
        passenger_usage_score: uiRoute.passenger_usage_score || uiRoute.passengerUsageScore || 0,
        field_verification_score: uiRoute.field_verification_score || uiRoute.fieldVerificationScore || 0,
        data_confidence_score: uiRoute.data_confidence_score || uiRoute.dataConfidenceScore || 0,
        region_id: uiRoute.region_id || uiRoute.regionId || null,
        updated_at: new Date().toISOString(),
        ...updates // Allow overriding with specific updates
    };

    // Only include deleted_at if it's set
    if (uiRoute.deleted_at) {
        supabaseRoute.deleted_at = uiRoute.deleted_at;
    }

    // Remove null values that would violate not-null constraints
    Object.keys(supabaseRoute).forEach(key => {
        if (supabaseRoute[key] === null) {
            delete supabaseRoute[key];
        }
    });

    return supabaseRoute;
}

/**
 * Converts Supabase database route to UI format
 * @param {Object} supabaseRoute - Route from Supabase database
 * @returns {Object} Route in UI format
 */
export function supabaseToRouteFormat(supabaseRoute) {
    const geometryPoints = supabaseRoute.geometry?.coordinates || [];
    const snappedPoints = supabaseRoute.stops_snapshot?.coordinates || null;

    return {
        // Local UI properties
        id: supabaseRoute.id,
        name: supabaseRoute.geometry?.properties?.name || supabaseRoute.route_code,
        code: supabaseRoute.route_code,
        color: supabaseRoute.geometry?.properties?.color || '#1d4ed8',
        rawPoints: geometryPoints,
        snappedPoints: snappedPoints,
        history: [],
        future: [],

        // Database properties
        route_code: supabaseRoute.route_code,
        origin_type: supabaseRoute.origin_type,
        proposed_by_user_id: supabaseRoute.proposed_by_user_id,
        proposal_reason: supabaseRoute.proposal_reason,
        status: supabaseRoute.status || 'draft',
        status_reason: supabaseRoute.status_reason,
        status_changed_at: supabaseRoute.status_changed_at,
        geometry: supabaseRoute.geometry,
        stops_snapshot: supabaseRoute.stops_snapshot,
        length_meters: supabaseRoute.length_meters || 0,
        last_geometry_update_at: supabaseRoute.last_geometry_update_at,
        credit_status: supabaseRoute.credit_status,
        credited_by_operator_id: supabaseRoute.credited_by_operator_id,
        credited_at: supabaseRoute.credited_at,
        credit_confidence: supabaseRoute.credit_confidence,
        credit_reason: supabaseRoute.credit_reason,
        driver_adoption_score: supabaseRoute.driver_adoption_score || 0,
        passenger_usage_score: supabaseRoute.passenger_usage_score || 0,
        field_verification_score: supabaseRoute.field_verification_score || 0,
        data_confidence_score: supabaseRoute.data_confidence_score || 0,
        region_id: supabaseRoute.region_id,
        regionName: supabaseRoute.regions?.name,
        created_at: supabaseRoute.created_at,
        updated_at: supabaseRoute.updated_at,
        deleted_at: supabaseRoute.deleted_at,

        // Legacy fields for backward compatibility
        regionId: supabaseRoute.region_id,
        statusReason: supabaseRoute.status_reason,
        lengthMeters: supabaseRoute.length_meters,
        creditStatus: supabaseRoute.credit_status,
        driverAdoptionScore: supabaseRoute.driver_adoption_score,
        passengerUsageScore: supabaseRoute.passenger_usage_score,
        fieldVerificationScore: supabaseRoute.field_verification_score,
        dataConfidenceScore: supabaseRoute.data_confidence_score
    };
}

/**
 * Creates a new route for database insertion
 * @param {Object} routeData - Route data
 * @param {string} userId - Current user ID
 * @returns {Object} Route ready for database insertion
 */
export function createRouteForInsert(routeData, userId) {
    const route = createEmptyRoute({
        ...routeData,
        proposed_by_user_id: userId,
        status: 'draft',
        last_geometry_update_at: new Date().toISOString()
    });

    return routeToSupabaseFormat(route, userId);
}

/**
 * Updates an existing route for database update
 * @param {Object} currentRoute - Current route from database
 * @param {Object} updates - Updates to apply
 * @returns {Object} Updated route for database
 */
export function updateRouteForDatabase(currentRoute, updates) {
    // Merge current route with updates
    const updatedRoute = {
        ...currentRoute,
        ...updates,
        last_geometry_update_at: updates.rawPoints ? new Date().toISOString() : currentRoute.last_geometry_update_at,
        updated_at: new Date().toISOString()
    };

    // Recalculate length if points changed
    if (updates.rawPoints) {
        updatedRoute.length_meters = Math.round(calculateLength(updates.rawPoints));
    }

    return routeToSupabaseFormat(updatedRoute, null, {
        id: currentRoute.id // Keep the original ID
    });
}

/**
 * Calculates route length in meters from coordinates
 * @param {Array} coordinates - Array of [lng, lat] coordinates
 * @returns {number} Length in meters
 */
function calculateLength(coordinates) {
    if (!coordinates || coordinates.length < 2) return 0;

    let totalDistance = 0;

    for (let i = 1; i < coordinates.length; i++) {
        const [lng1, lat1] = coordinates[i - 1];
        const [lng2, lat2] = coordinates[i];
        totalDistance += haversineDistance(lat1, lng1, lat2, lng2);
    }

    return totalDistance;
}

/**
 * Haversine formula to calculate distance between two points
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Creates a duplicate of a route with new metadata
 * @param {Object} originalRoute - Route to duplicate
 * @param {string} userId - User ID for the new route
 * @param {string} suffix - Suffix to add to route name
 * @returns {Object} Duplicate route for database insertion
 */
export function duplicateRoute(originalRoute, userId, suffix = 'Copy') {
    const now = new Date().toISOString();

    const duplicate = {
        ...originalRoute,
        id: undefined, // Remove ID for new insert
        route_code: `${originalRoute.route_code}_${suffix}_${Date.now().toString().slice(-4)}`,
        name: `${originalRoute.name} (${suffix})`,
        geometry: {
            ...originalRoute.geometry,
            properties: {
                ...originalRoute.geometry?.properties,
                name: `${originalRoute.name} (${suffix})`
            }
        },
        status: 'draft',
        proposed_by_user_id: userId,
        created_at: now,
        updated_at: now,
        last_geometry_update_at: now,
        credit_status: 'uncredited',
        credited_by_operator_id: null,
        credited_at: null,
        credit_confidence: null,
        credit_reason: null
    };

    return routeToSupabaseFormat(duplicate, userId);
}

/**
 * Creates a route summary object for listing/display
 * @param {Object} route - Full route object
 * @returns {Object} Summary object
 */
export function createRouteSummary(route) {
    return {
        id: route.id,
        name: route.name || route.route_code,
        code: route.route_code,
        color: route.color || '#1d4ed8',
        status: route.status || 'draft',
        region_id: route.region_id,
        regionName: route.regionName,
        length_meters: route.length_meters || 0,
        point_count: route.rawPoints?.length || 0,
        created_at: route.created_at,
        updated_at: route.updated_at,
        status_changed_at: route.status_changed_at
    };
}

/**
 * Prepares a route for export
 * @param {Object} route - Route object
 * @returns {Object} Export-ready route
 */
export function prepareRouteForExport(route) {
    const exportRoute = {
        route_code: route.route_code,
        name: route.name,
        geometry: route.geometry,
        status: route.status,
        region_id: route.region_id,
        length_meters: route.length_meters,
        color: route.color,
        created_at: route.created_at,
        updated_at: route.updated_at,
        stops_snapshot: route.stops_snapshot,
        origin_type: route.origin_type,
        credit_status: route.credit_status,
        scores: {
            driver_adoption: route.driver_adoption_score,
            passenger_usage: route.passenger_usage_score,
            field_verification: route.field_verification_score,
            data_confidence: route.data_confidence_score
        }
    };

    // Remove null/undefined values
    Object.keys(exportRoute).forEach(key => {
        if (exportRoute[key] === null || exportRoute[key] === undefined) {
            delete exportRoute[key];
        }
    });

    return exportRoute;
}

// Add this function to generate route IDs
export function generateRouteId() {
    return `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}