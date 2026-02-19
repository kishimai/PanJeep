    // RegionManagement.jsx - Complete with POI CRUD, map click fix, no rotation, always show POIs, and zoom on list click
    import { useEffect, useRef, useState, useCallback } from "react";
    import mapboxgl from "mapbox-gl";
    import "mapbox-gl/dist/mapbox-gl.css";
    import { supabase } from "./supabase";
    
    // Helper to get icon/color based on POI type
    const getPOIStyle = (type) => {
        switch (type) {
            case 'terminal':
                return {
                    color: '#DC2626', // red
                    icon: '🚏',        // kept for popup or fallback
                    text: 'T',          // new short text
                    size: 30,
                    label: 'Terminal'
                };
            case 'stop':
                return {
                    color: '#2563EB', // blue
                    icon: '⬤',
                    text: 'S',
                    size: 24,
                    label: 'Stop'
                };
            case 'hub':
                return {
                    color: '#7C3AED', // purple
                    icon: '🏢',
                    text: 'H',
                    size: 32,
                    label: 'Hub'
                };
            case 'landmark':
                return {
                    color: '#059669', // green
                    icon: '📍',
                    text: 'L',
                    size: 28,
                    label: 'Landmark'
                };
            default:
                return {
                    color: '#6B7280', // gray
                    icon: '📍',
                    text: '?',
                    size: 24,
                    label: 'POI'
                };
        }
    };
    
    export function RegionManagement({ onRegionSelect }) {
        const mapContainer = useRef(null);
        const [map, setMap] = useState(null);
        const [regions, setRegions] = useState([]);
        const [selectedRegion, setSelectedRegion] = useState(null);
        const [isLoading, setIsLoading] = useState(true);
        const [viewMode, setViewMode] = useState("list"); // regions: list, create, details
        const [psgcData, setPsgcData] = useState({
            regions: [],
            provinces: [],
            cities: [],
            barangays: []
        });
        const [selectedHierarchy, setSelectedHierarchy] = useState({
            region: null,
            province: null,
            city: null,
            barangay: null
        });
        const [apiAvailable, setApiAvailable] = useState(true);
        const [loadingHierarchy, setLoadingHierarchy] = useState({
            regions: false,
            provinces: false,
            cities: false,
            barangays: false
        });
        const [searchQuery, setSearchQuery] = useState("");
        const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
        const [regionToDelete, setRegionToDelete] = useState(null);
    
        // POI-related state
        const [activeModule, setActiveModule] = useState("regions"); // "regions" or "pois"
        const [pois, setPois] = useState([]);
        const [selectedPoi, setSelectedPoi] = useState(null);
        const [poiViewMode, setPoiViewMode] = useState("list"); // list, create, edit, details
        const [poiForm, setPoiForm] = useState({
            name: "",
            type: "landmark",
            region_id: null,
            geometry: null,
            metadata: {}
        });
        const [isSelectingPoiLocation, setIsSelectingPoiLocation] = useState(false);
        const poiMarkersRef = useRef([]); // ref to store current POI markers
        const tempMarkerRef = useRef(null); // temporary marker for POI creation
    
        // Ref to track selection mode for map click handler
        const isSelectingRef = useRef(isSelectingPoiLocation);
        useEffect(() => {
            isSelectingRef.current = isSelectingPoiLocation;
        }, [isSelectingPoiLocation]);
    
        // API Configuration
        const API_CONFIG = {
            baseUrl: "https://psgc.rootscratch.com",
            timeout: 5000,
            maxRetries: 1
        };
    
        /* -------------------- PSGC Data Fetching -------------------- */
    
        const fetchPsgcData = useCallback(async (level, parentCode = null) => {
            const levelEndpoints = {
                region: '/region',
                province: '/province',
                city: '/city-municipality',
                barangay: '/barangay'
            };
    
            try {
                const endpoint = levelEndpoints[level];
                const url = parentCode
                    ? `${API_CONFIG.baseUrl}${endpoint}?id=${parentCode}`
                    : `${API_CONFIG.baseUrl}${endpoint}`;
    
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    
                const response = await fetch(proxyUrl, {
                    headers: {
                        'Accept': 'application/json'
                    }
                });
    
                if (!response.ok) {
                    // Try alternative endpoint format for barangays
                    if (level === 'barangay' && parentCode) {
                        const altUrl = `https://corsproxy.io/?${encodeURIComponent(`${API_CONFIG.baseUrl}${endpoint}?city_code=${parentCode}`)}`;
                        const altResponse = await fetch(altUrl, {
                            headers: { 'Accept': 'application/json' }
                        });
    
                        if (altResponse.ok) {
                            const data = await altResponse.json();
                            return Array.isArray(data) ? data : [];
                        }
                    }
                    throw new Error(`API returned ${response.status}`);
                }
    
                const data = await response.json();
                return Array.isArray(data) ? data : [];
            } catch (error) {
                console.warn(`Failed to fetch ${level} from API:`, error);
                if (level === 'region') {
                    setApiAvailable(false);
                }
                return [];
            }
        }, []);
    
        /* -------------------- Hierarchical Selection Handlers -------------------- */
    
        const handleRegionSelect = useCallback(async (region) => {
            setSelectedHierarchy({
                region,
                province: null,
                city: null,
                barangay: null
            });
    
            if (!region?.psgc_id) return;
    
            setLoadingHierarchy(prev => ({ ...prev, provinces: true }));
            const provinces = await fetchPsgcData('province', region.psgc_id);
            setPsgcData(prev => ({
                ...prev,
                provinces: provinces || [],
                cities: [],
                barangays: []
            }));
            setLoadingHierarchy(prev => ({ ...prev, provinces: false }));
        }, [fetchPsgcData]);
    
        const handleProvinceSelect = useCallback(async (province) => {
            setSelectedHierarchy(prev => ({
                ...prev,
                province,
                city: null,
                barangay: null
            }));
    
            if (!province?.psgc_id) return;
    
            setLoadingHierarchy(prev => ({ ...prev, cities: true }));
            const cities = await fetchPsgcData('city', province.psgc_id);
            setPsgcData(prev => ({
                ...prev,
                cities: cities || [],
                barangays: []
            }));
            setLoadingHierarchy(prev => ({ ...prev, cities: false }));
        }, [fetchPsgcData]);
    
        const handleCitySelect = useCallback(async (city) => {
            setSelectedHierarchy(prev => ({
                ...prev,
                city,
                barangay: null
            }));
    
            if (!city?.psgc_id) return;
    
            setLoadingHierarchy(prev => ({ ...prev, barangays: true }));
    
            // Try multiple approaches for barangay fetching
            let barangays = [];
    
            // Approach 1: Direct by city ID
            barangays = await fetchPsgcData('barangay', city.psgc_id);
    
            // Approach 2: If no results, try with alternative parameter
            if (!barangays || barangays.length === 0) {
                barangays = await fetchPsgcData('barangay', city.correspondence_code || city.psgc_id);
            }
    
            // Approach 3: Try with municipality code if available
            if ((!barangays || barangays.length === 0) && city.municipality_code) {
                barangays = await fetchPsgcData('barangay', city.municipality_code);
            }
    
            setPsgcData(prev => ({
                ...prev,
                barangays: barangays || []
            }));
            setLoadingHierarchy(prev => ({ ...prev, barangays: false }));
        }, [fetchPsgcData]);
    
        /* -------------------- Region Operations -------------------- */
    
        const createRegionFromPsgc = useCallback(async (psgcItem, level) => {
            if (!psgcItem) {
                alert('Please select a valid location from the PSGC hierarchy');
                return;
            }
    
            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
    
            if (authError || !user) {
                alert('Please log in to create regions.');
                return;
            }
    
            // Check user role
            const { data: userProfile } = await supabase
                .from('users')
                .select('id, role')
                .eq('id', user.id)
                .single();
    
            if (!userProfile || userProfile.role !== 'operator') {
                alert('Permission denied. Only operators can create regions.');
                return;
            }
    
            // Check for existing region
            const psgcCode = String(psgcItem.psgc_id || '').slice(0, 20);
            const { data: existingRegion } = await supabase
                .from('regions')
                .select('*')
                .eq('psgc_code', psgcCode)
                .maybeSingle();
    
            if (existingRegion) {
                alert(`Region "${psgcItem.name}" already exists.`);
                setSelectedRegion(existingRegion);
                setViewMode('details');
                return;
            }
    
            // Map PSGC level to database columns
            const getTypeFromLevel = (level) => {
                switch (level) {
                    case 'barangay':
                        return 'barangay';
                    case 'city':
                        return 'city';
                    case 'municipality':
                        return 'municipality';
                    case 'province':
                        return 'province';
                    case 'region':
                        return 'region';
                    default:
                        return 'custom';
                }
            };
    
            // Determine parent PSGC code based on hierarchy
            let parentPsgcCode = null;
            if (level === 'province' && selectedHierarchy.region) {
                parentPsgcCode = selectedHierarchy.region.psgc_id?.slice(0, 20) || null;
            } else if (level === 'city' && selectedHierarchy.province) {
                parentPsgcCode = selectedHierarchy.province.psgc_id?.slice(0, 20) || null;
            } else if (level === 'barangay' && selectedHierarchy.city) {
                parentPsgcCode = selectedHierarchy.city.psgc_id?.slice(0, 20) || null;
            }
    
            // Prepare complete region data
            const regionData = {
                name: psgcItem.name,
                code: `PSGC_${psgcCode}`,
                type: getTypeFromLevel(level),
                governing_body: null,
                is_active: true,
                created_by_user_id: user.id,
                psgc_code: psgcCode,
                parent_psgc_code: parentPsgcCode,
                geographic_level: level,
                psgc_metadata: psgcItem,
                last_api_sync: new Date().toISOString()
            };
    
            try {
                // Insert the region
                const { data: newRegion, error: insertError } = await supabase
                    .from('regions')
                    .insert([regionData])
                    .select()
                    .single();
    
                if (insertError) {
                    if (insertError.code === '23514') {
                        alert(`Check constraint violation. Please verify that:\n\n1. 'type' is one of: region, province, city, municipality, barangay, custom\n2. 'geographic_level' is one of: region, province, city, municipality, barangay`);
                    } else {
                        alert(`Error: ${insertError.message}`);
                    }
                    return;
                }
    
                // Update UI state
                setRegions(prev => [newRegion, ...prev]);
                setSelectedRegion(newRegion);
                setViewMode('details');
    
                // Reset hierarchy selections
                setSelectedHierarchy({
                    region: null,
                    province: null,
                    city: null,
                    barangay: null
                });
    
                // Clear lower-level PSGC data
                setPsgcData(prev => ({
                    ...prev,
                    provinces: [],
                    cities: [],
                    barangays: []
                }));
    
                alert(`✅ Successfully created: ${psgcItem.name}`);
    
            } catch (error) {
                console.error('Unexpected error:', error);
                alert('An unexpected error occurred. Please try again.');
            }
    
        }, [selectedHierarchy]);
    
        const deleteRegion = async (regionId) => {
            const { count, error: countError } = await supabase
                .from('routes')
                .select('*', { count: 'exact', head: true })
                .eq('region_id', regionId)
                .is('deleted_at', null);
    
            if (countError) throw countError;
    
            if (count > 0) {
                alert(`Cannot delete region – ${count} route(s) still assigned.`);
                return;
            }
    
            try {
                const { error } = await supabase
                    .from('regions')
                    .delete()
                    .eq('region_id', regionId);
    
                if (error) throw error;
    
                // Update state
                setRegions(prev => prev.filter(r => r.region_id !== regionId));
    
                if (selectedRegion?.region_id === regionId) {
                    setSelectedRegion(null);
                    setViewMode('list');
                }
    
                setShowDeleteConfirm(false);
                setRegionToDelete(null);
    
                alert('Region deleted successfully');
            } catch (error) {
                console.error('Error deleting region:', error);
                alert('Failed to delete region. You may not have permission.');
            }
        };
    
        const handleDeleteClick = (region, e) => {
            e.stopPropagation();
            setRegionToDelete(region);
            setShowDeleteConfirm(true);
        };
    
        const confirmDelete = () => {
            if (regionToDelete) {
                deleteRegion(regionToDelete.region_id);
            }
        };
    
        const cancelDelete = () => {
            setShowDeleteConfirm(false);
            setRegionToDelete(null);
        };
    
        /* -------------------- POI Operations -------------------- */
    
        const fetchPois = useCallback(async (regionId = null) => {
            try {
                let query = supabase.from('points_of_interest').select('*');
                if (regionId) {
                    query = query.eq('region_id', regionId);
                }
                const { data, error } = await query.order('created_at', { ascending: false });
                if (error) throw error;
                setPois(data || []);
            } catch (error) {
                console.error('Error fetching POIs:', error);
                alert('Failed to load points of interest');
            }
        }, []);
    
        const createPoi = async () => {
            if (!poiForm.name.trim()) {
                alert('Please enter a name for the POI');
                return;
            }
            if (!poiForm.geometry) {
                alert('Please click on the map to set the location');
                return;
            }
            if (!poiForm.region_id) {
                alert('Please select a region for this POI');
                return;
            }
    
            try {
                const { data, error } = await supabase
                    .from('points_of_interest')
                    .insert([{
                        name: poiForm.name,
                        type: poiForm.type,
                        geometry: poiForm.geometry,
                        region_id: poiForm.region_id,
                        metadata: poiForm.metadata || {}
                    }])
                    .select()
                    .single();
    
                if (error) throw error;
    
                setPois(prev => [data, ...prev]);
                setPoiViewMode('list');
                setPoiForm({ name: "", type: "landmark", region_id: null, geometry: null, metadata: {} });
                setIsSelectingPoiLocation(false);
                alert('POI created successfully');
            } catch (error) {
                console.error('Error creating POI:', error);
                alert('Failed to create POI');
            }
        };
    
        const updatePoi = async () => {
            if (!selectedPoi) return;
            try {
                const { data, error } = await supabase
                    .from('points_of_interest')
                    .update({
                        name: poiForm.name,
                        type: poiForm.type,
                        geometry: poiForm.geometry,
                        region_id: poiForm.region_id,
                        metadata: poiForm.metadata
                    })
                    .eq('id', selectedPoi.id)
                    .select()
                    .single();
    
                if (error) throw error;
    
                setPois(prev => prev.map(p => p.id === data.id ? data : p));
                setSelectedPoi(data);
                setPoiViewMode('details');
                setPoiForm({ name: "", type: "landmark", region_id: null, geometry: null, metadata: {} });
                alert('POI updated successfully');
            } catch (error) {
                console.error('Error updating POI:', error);
                alert('Failed to update POI');
            }
        };
    
        const deletePoi = async (poiId) => {
            if (!window.confirm('Are you sure you want to delete this POI?')) return;
            try {
                const { error } = await supabase
                    .from('points_of_interest')
                    .delete()
                    .eq('id', poiId);
    
                if (error) throw error;
    
                setPois(prev => prev.filter(p => p.id !== poiId));
                if (selectedPoi?.id === poiId) {
                    setSelectedPoi(null);
                    setPoiViewMode('list');
                }
                alert('POI deleted successfully');
            } catch (error) {
                console.error('Error deleting POI:', error);
                alert('Failed to delete POI');
            }
        };
    
        // Zoom to a POI on the map
        const zoomToPoi = useCallback((poi) => {
            if (!map || !poi.geometry || poi.geometry.type !== 'Point') return;
            const [lng, lat] = poi.geometry.coordinates;
            map.flyTo({
                center: [lng, lat],
                zoom: 14,
                essential: true,
                duration: 1500
            });
        }, [map]);
    
        // Stable map click handler using ref
        const handleMapClick = useCallback((e) => {
            if (!isSelectingRef.current) return;
    
            const { lng, lat } = e.lngLat;
            const geometry = {
                type: "Point",
                coordinates: [lng, lat]
            };
            setPoiForm(prev => ({ ...prev, geometry }));
            setIsSelectingPoiLocation(false);
    
            // Remove previous temporary marker if any
            if (tempMarkerRef.current) {
                tempMarkerRef.current.remove();
            }
    
            // Add a temporary marker
            if (map) {
                const el = document.createElement('div');
                el.className = 'temp-poi-marker';
                el.style.backgroundColor = '#3b82f6';
                el.style.width = '20px';
                el.style.height = '20px';
                el.style.borderRadius = '50%';
                el.style.border = '3px solid white';
                el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
                tempMarkerRef.current = new mapboxgl.Marker(el)
                    .setLngLat([lng, lat])
                    .addTo(map);
            }
        }, [map, setPoiForm, setIsSelectingPoiLocation]);
    
        // Draw POI markers on map (always drawn)
        const drawPoiMarkers = useCallback(() => {
            // Clear existing markers
            poiMarkersRef.current.forEach(marker => marker.remove());
            poiMarkersRef.current = [];
    
            if (!map) return;
    
            pois.forEach(poi => {
                const geometry = poi.geometry;
                if (geometry?.type === 'Point') {
                    const [lng, lat] = geometry.coordinates;
                    const style = getPOIStyle(poi.type);
    
                    // Create custom marker element
                    const el = document.createElement('div');
                    el.className = 'poi-marker';
                    el.style.cssText = `
                        width: ${style.size}px;
                        height: ${style.size}px;
                        background: ${style.color};
                        border: 2px solid #FFFFFF;
                        border-radius: 50%;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: ${style.size * 0.6}px;
                        font-weight: bold;
                    `;
                    el.textContent = style.text;
    
                    // Create popup with POI info
                    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
                        <div style="padding: 8px; max-width: 200px;">
                            <div style="font-weight: bold; margin-bottom: 4px;">${poi.name}</div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                                Type: ${style.label}
                            </div>
                            ${poi.region_id ? `
                                <div style="font-size: 12px; color: #666;">
                                    Region: ${regions.find(r => r.region_id === poi.region_id)?.name || 'Unknown'}
                                </div>
                            ` : ''}
                            <div style="font-size: 10px; color: #999; margin-top: 4px;">
                                Click to view details
                            </div>
                        </div>
                    `);
    
                    // Marker click handler: open popup and select POI
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        setSelectedPoi(poi);
                        setPoiViewMode('details');
                        setActiveModule('pois'); // Switch to POI module if not already
                        zoomToPoi(poi); // Also zoom when marker clicked
                        popup.addTo(map); // Show popup on click
                    });
    
                    const marker = new mapboxgl.Marker({ element: el })
                        .setLngLat([lng, lat])
                        .setPopup(popup)
                        .addTo(map);
    
                    poiMarkersRef.current.push(marker);
                }
            });
        }, [map, pois, regions, zoomToPoi]);
    
        // Effect to draw POI markers when dependencies change
        useEffect(() => {
            drawPoiMarkers();
            // Cleanup markers on unmount or before redraw
            return () => {
                poiMarkersRef.current.forEach(marker => marker.remove());
                poiMarkersRef.current = [];
            };
        }, [drawPoiMarkers]);
    
        /* -------------------- Initialization -------------------- */
    
        useEffect(() => {
            if (mapContainer.current) {
                const mapInstance = new mapboxgl.Map({
                    container: mapContainer.current,
                    style: "mapbox://styles/mapbox/light-v11",
                    center: [120.9842, 14.5995],
                    zoom: 6,
                    attributionControl: false,
                    // Disable rotation
                    dragRotate: false,
                    touchPitch: false,
                    pitchWithRotate: false,
                    interactive: true // keep interactions except rotation
                });
    
                setMap(mapInstance);
            }
    
            fetchRegions();
            fetchPsgcData('region').then(data => {
                setPsgcData(prev => ({ ...prev, regions: data || [] }));
            });
    
            return () => {
                if (map) {
                    map.remove();
                }
                if (tempMarkerRef.current) {
                    tempMarkerRef.current.remove();
                }
                // Cleanup POI markers
                poiMarkersRef.current.forEach(marker => marker.remove());
                poiMarkersRef.current = [];
            };
        }, []); // Empty dependency – runs once
    
        // Attach stable click handler after map is ready
        useEffect(() => {
            if (!map) return;
    
            const clickHandler = handleMapClick; // stable reference
    
            map.on('click', clickHandler);
    
            return () => {
                map.off('click', clickHandler);
            };
        }, [map, handleMapClick]);
    
        const fetchRegions = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('regions')
                    .select(`
                        region_id,
                        name,
                        code,
                        type,
                        governing_body,
                        is_active,
                        created_by_user_id,
                        created_at,
                        updated_at,
                        psgc_code,
                        parent_psgc_code,
                        geographic_level,
                        psgc_metadata,
                        last_api_sync
                    `)
                    .order('created_at', { ascending: false });
    
                if (error) throw error;
                setRegions(data || []);
            } catch (error) {
                console.error('Error fetching regions:', error);
                alert('Failed to load regions from database');
            } finally {
                setIsLoading(false);
            }
        };
    
        /* -------------------- Filter Regions -------------------- */
    
        const filteredRegions = regions.filter(region => {
            if (!searchQuery) return true;
    
            const query = searchQuery.toLowerCase();
            return (
                region.name.toLowerCase().includes(query) ||
                region.code.toLowerCase().includes(query) ||
                (region.psgc_code && region.psgc_code.toLowerCase().includes(query)) ||
                (region.geographic_level && region.geographic_level.toLowerCase().includes(query))
            );
        });
    
        /* -------------------- Render Methods -------------------- */
    
        const renderApiStatus = () => (
            <div style={styles.apiStatus}>
                <div style={{
                    ...styles.apiStatusDot,
                    background: apiAvailable ? '#10b981' : '#ef4444'
                }}></div>
                {apiAvailable ? 'PSGC API online' : 'PSGC API unavailable'}
            </div>
        );
    
        const renderDeleteConfirmation = () => {
            if (!showDeleteConfirm || !regionToDelete) return null;
    
            return (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3 style={styles.modalTitle}>Delete Region</h3>
                        <p style={styles.modalText}>
                            Are you sure you want to delete "<strong>{regionToDelete.name}</strong>"?
                            This action cannot be undone.
                        </p>
                        <div style={styles.modalActions}>
                            <button onClick={cancelDelete} style={styles.modalCancel}>
                                Cancel
                            </button>
                            <button onClick={confirmDelete} style={styles.modalDelete}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            );
        };
    
        const renderPsgcHierarchySelector = () => (
            <div style={styles.psgcSelector}>
                <div style={styles.selectorHeader}>
                    <div style={styles.selectorTitleRow}>
                        <h3 style={styles.selectorTitle}>Select from PSGC</h3>
                        <button
                            onClick={() => {
                                setViewMode('list');
                                setSelectedHierarchy({
                                    region: null,
                                    province: null,
                                    city: null,
                                    barangay: null
                                });
                            }}
                            style={styles.backButton}
                        >
                            ← Back
                        </button>
                    </div>
                    <div style={styles.selectorSubtitle}>
                        Choose location to create as region
                    </div>
                </div>
    
                {/* Region Selector */}
                <div style={styles.hierarchyLevel}>
                    <label style={styles.hierarchyLabel}>Region *</label>
                    <select
                        value={selectedHierarchy.region?.psgc_id || ''}
                        onChange={(e) => {
                            const region = psgcData.regions.find(r => r.psgc_id === e.target.value);
                            handleRegionSelect(region);
                        }}
                        style={styles.hierarchySelect}
                        disabled={!apiAvailable || loadingHierarchy.regions}
                    >
                        <option value="">{!apiAvailable ? 'API unavailable' : 'Select region...'}</option>
                        {psgcData.regions.map(region => (
                            <option key={region.psgc_id} value={region.psgc_id}>
                                {region.name} ({region.psgc_id})
                            </option>
                        ))}
                    </select>
                    {loadingHierarchy.regions && <div style={styles.loadingIndicator}>Loading...</div>}
                </div>
    
                {/* Province Selector */}
                {selectedHierarchy.region && (
                    <div style={styles.hierarchyLevel}>
                        <label style={styles.hierarchyLabel}>Province (Optional)</label>
                        <select
                            value={selectedHierarchy.province?.psgc_id || ''}
                            onChange={(e) => {
                                const province = psgcData.provinces.find(p => p.psgc_id === e.target.value);
                                handleProvinceSelect(province);
                            }}
                            style={styles.hierarchySelect}
                            disabled={loadingHierarchy.provinces}
                        >
                            <option value="">Select province...</option>
                            {psgcData.provinces.map(province => (
                                <option key={province.psgc_id} value={province.psgc_id}>
                                    {province.name}
                                </option>
                            ))}
                        </select>
                        {loadingHierarchy.provinces && <div style={styles.loadingIndicator}>Loading...</div>}
                    </div>
                )}
    
                {/* City/Municipality Selector */}
                {selectedHierarchy.province && (
                    <div style={styles.hierarchyLevel}>
                        <label style={styles.hierarchyLabel}>City/Municipality (Optional)</label>
                        <select
                            value={selectedHierarchy.city?.psgc_id || ''}
                            onChange={(e) => {
                                const city = psgcData.cities.find(c => c.psgc_id === e.target.value);
                                handleCitySelect(city);
                            }}
                            style={styles.hierarchySelect}
                            disabled={loadingHierarchy.cities}
                        >
                            <option value="">Select city/municipality...</option>
                            {psgcData.cities.map(city => (
                                <option key={city.psgc_id} value={city.psgc_id}>
                                    {city.name} ({city.geographic_level})
                                </option>
                            ))}
                        </select>
                        {loadingHierarchy.cities && <div style={styles.loadingIndicator}>Loading...</div>}
                    </div>
                )}
    
                {/* Barangay Selector - Enhanced with try/catch for errors */}
                {selectedHierarchy.city && (
                    <div style={styles.hierarchyLevel}>
                        <label style={styles.hierarchyLabel}>Barangay (Optional)</label>
                        <select
                            value={selectedHierarchy.barangay?.psgc_id || ''}
                            onChange={(e) => {
                                const barangay = psgcData.barangays.find(b => b.psgc_id === e.target.value);
                                setSelectedHierarchy(prev => ({ ...prev, barangay }));
                            }}
                            style={styles.hierarchySelect}
                            disabled={loadingHierarchy.barangays}
                        >
                            <option value="">Select barangay...</option>
                            {psgcData.barangays.length > 0 ? (
                                psgcData.barangays.map(barangay => (
                                    <option key={barangay.psgc_id} value={barangay.psgc_id}>
                                        {barangay.name}
                                    </option>
                                ))
                            ) : (
                                <option value="" disabled>
                                    {loadingHierarchy.barangays ? 'Loading...' : 'No barangays found'}
                                </option>
                            )}
                        </select>
                        {loadingHierarchy.barangays && <div style={styles.loadingIndicator}>Loading...</div>}
                    </div>
                )}
    
                {/* Selection Preview */}
                {(selectedHierarchy.region || selectedHierarchy.province || selectedHierarchy.city || selectedHierarchy.barangay) && (
                    <div style={styles.selectionPreview}>
                        <div style={styles.previewTitle}>Selected Location:</div>
                        <div style={styles.previewPath}>
                            {[
                                selectedHierarchy.region?.name,
                                selectedHierarchy.province?.name,
                                selectedHierarchy.city?.name,
                                selectedHierarchy.barangay?.name
                            ].filter(Boolean).join(' › ')}
                        </div>
    
                        <div style={styles.createButtons}>
                            {selectedHierarchy.region && (
                                <button
                                    onClick={() => createRegionFromPsgc(selectedHierarchy.region, 'region')}
                                    style={styles.createButton}
                                >
                                    Create Region
                                </button>
                            )}
                            {selectedHierarchy.province && (
                                <button
                                    onClick={() => createRegionFromPsgc(selectedHierarchy.province, 'province')}
                                    style={styles.createButton}
                                >
                                    Create Province
                                </button>
                            )}
                            {selectedHierarchy.city && (
                                <button
                                    onClick={() => createRegionFromPsgc(selectedHierarchy.city,
                                        selectedHierarchy.city.geographic_level?.toLowerCase() === 'municipality'
                                            ? 'municipality'
                                            : 'city')}
                                    style={styles.createButton}
                                >
                                    Create {selectedHierarchy.city.geographic_level === 'Mun' ? 'Municipality' : 'City'}
                                </button>
                            )}
                            {selectedHierarchy.barangay && (
                                <button
                                    onClick={() => createRegionFromPsgc(selectedHierarchy.barangay, 'barangay')}
                                    style={styles.createButton}
                                >
                                    Create Barangay
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    
        // POI List View
        const renderPoiList = () => (
            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>Points of Interest</div>
                    <button
                        onClick={() => {
                            setPoiForm({ name: "", type: "landmark", region_id: null, geometry: null, metadata: {} });
                            setPoiViewMode('create');
                            setIsSelectingPoiLocation(true);
                        }}
                        style={styles.primaryButton}
                    >
                        + New POI
                    </button>
                </div>
                <div style={styles.regionsList}>
                    {pois.map(poi => (
                        <div
                            key={poi.id}
                            onClick={() => {
                                setSelectedPoi(poi);
                                setPoiViewMode('details');
                                zoomToPoi(poi); // Zoom to POI when clicked in list
                            }}
                            style={styles.regionItem}
                        >
                            <div style={styles.regionHeader}>
                                <div style={styles.regionNameRow}>
                                    <div style={styles.regionName}>{poi.name}</div>
                                    <div style={styles.regionActions}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deletePoi(poi.id);
                                            }}
                                            style={styles.deleteButton}
                                            title="Delete POI"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                                <div style={styles.regionMeta}>
                                    <span style={styles.regionBadge}>{poi.type}</span>
                                    {poi.region_id && (
                                        <span style={styles.regionCode}>
                                            {regions.find(r => r.region_id === poi.region_id)?.name || 'Unknown region'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {pois.length === 0 && (
                        <div style={styles.emptyState}>
                            <div style={styles.emptyIcon}>📍</div>
                            <div style={styles.emptyTitle}>No POIs yet</div>
                            <div style={styles.emptyText}>Create your first point of interest</div>
                        </div>
                    )}
                </div>
            </div>
        );
    
        // POI Form (Create/Edit)
        const renderPoiForm = (isEdit = false) => (
            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>{isEdit ? 'Edit POI' : 'Create New POI'}</div>
                    <button
                        onClick={() => {
                            setPoiViewMode('list');
                            setIsSelectingPoiLocation(false);
                            if (tempMarkerRef.current) {
                                tempMarkerRef.current.remove();
                                tempMarkerRef.current = null;
                            }
                        }}
                        style={styles.backButton}
                    >
                        Cancel
                    </button>
                </div>
                <div style={styles.detailsCard}>
                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Name *</label>
                        <input
                            type="text"
                            value={poiForm.name}
                            onChange={(e) => setPoiForm({ ...poiForm, name: e.target.value })}
                            style={styles.formInput}
                            placeholder="e.g. Manila City Hall"
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Type</label>
                        <select
                            value={poiForm.type}
                            onChange={(e) => setPoiForm({ ...poiForm, type: e.target.value })}
                            style={styles.formSelect}
                        >
                            <option value="terminal">Terminal</option>
                            <option value="stop">Stop</option>
                            <option value="landmark">Landmark</option>
                            <option value="hub">Hub</option>
                        </select>
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Region</label>
                        <select
                            value={poiForm.region_id || ''}
                            onChange={(e) => setPoiForm({ ...poiForm, region_id: e.target.value || null })}
                            style={styles.formSelect}
                        >
                            <option value="">Select region (optional)</option>
                            {regions.map(region => (
                                <option key={region.region_id} value={region.region_id}>
                                    {region.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Location</label>
                        <div style={styles.locationInput}>
                            {poiForm.geometry ? (
                                <span style={{ color: '#1f2937' }}>
                                    {poiForm.geometry.coordinates[1].toFixed(6)}, {poiForm.geometry.coordinates[0].toFixed(6)}
                                </span>
                            ) : (
                                <span style={{ color: '#9ca3af' }}>Not set</span>
                            )}
                            <button
                                onClick={() => {
                                    setIsSelectingPoiLocation(true);
                                    if (tempMarkerRef.current) {
                                        tempMarkerRef.current.remove();
                                        tempMarkerRef.current = null;
                                    }
                                }}
                                style={styles.smallButton}
                            >
                                {poiForm.geometry ? 'Change' : 'Set on Map'}
                            </button>
                        </div>
                        {isSelectingPoiLocation && (
                            <div style={styles.instruction}>
                                Click on the map to place the POI
                            </div>
                        )}
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Metadata (JSON)</label>
                        <textarea
                            value={JSON.stringify(poiForm.metadata, null, 2)}
                            onChange={(e) => {
                                try {
                                    const metadata = JSON.parse(e.target.value);
                                    setPoiForm({ ...poiForm, metadata });
                                } catch {
                                    // ignore invalid JSON
                                }
                            }}
                            style={styles.formTextarea}
                            rows={4}
                            placeholder='{"key": "value"}'
                        />
                    </div>
                    <div style={styles.detailActions}>
                        <button
                            onClick={isEdit ? updatePoi : createPoi}
                            style={styles.primaryButton}
                        >
                            {isEdit ? 'Update' : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        );
    
        // POI Details View
        const renderPoiDetails = () => (
            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>POI Details</div>
                    <button
                        onClick={() => setPoiViewMode('list')}
                        style={styles.backButton}
                    >
                        ← Back
                    </button>
                </div>
                {selectedPoi && (
                    <div style={styles.detailsCard}>
                        <div style={styles.detailsHeader}>
                            <div style={styles.detailsName}>{selectedPoi.name}</div>
                        </div>
                        <div style={styles.detailsGrid}>
                            <div style={styles.detailItem}>
                                <div style={styles.detailLabel}>Type</div>
                                <div style={styles.detailValue}>{selectedPoi.type}</div>
                            </div>
                            <div style={styles.detailItem}>
                                <div style={styles.detailLabel}>Region</div>
                                <div style={styles.detailValue}>
                                    {regions.find(r => r.region_id === selectedPoi.region_id)?.name || 'None'}
                                </div>
                            </div>
                            <div style={styles.detailItem}>
                                <div style={styles.detailLabel}>Location</div>
                                <div style={styles.detailValue}>
                                    {selectedPoi.geometry?.coordinates[1].toFixed(6)}, {selectedPoi.geometry?.coordinates[0].toFixed(6)}
                                </div>
                            </div>
                            <div style={styles.detailItem}>
                                <div style={styles.detailLabel}>Created</div>
                                <div style={styles.detailValue}>
                                    {new Date(selectedPoi.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                        {selectedPoi.metadata && Object.keys(selectedPoi.metadata).length > 0 && (
                            <div style={styles.detailItem}>
                                <div style={styles.detailLabel}>Metadata</div>
                                <pre style={styles.jsonPreview}>
                                    {JSON.stringify(selectedPoi.metadata, null, 2)}
                                </pre>
                            </div>
                        )}
                        <div style={styles.detailActions}>
                            <button
                                onClick={() => {
                                    setPoiForm({
                                        name: selectedPoi.name,
                                        type: selectedPoi.type,
                                        region_id: selectedPoi.region_id,
                                        geometry: selectedPoi.geometry,
                                        metadata: selectedPoi.metadata || {}
                                    });
                                    setPoiViewMode('edit');
                                }}
                                style={styles.warningButton}
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => deletePoi(selectedPoi.id)}
                                style={styles.dangerButton}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    
        // Module switcher (POI toggle removed)
        const renderModuleSwitcher = () => (
            <div style={styles.moduleSwitcher}>
                <button
                    onClick={() => setActiveModule('regions')}
                    style={{
                        ...styles.moduleButton,
                        background: activeModule === 'regions' ? '#1d4ed8' : '#f3f4f6',
                        color: activeModule === 'regions' ? '#ffffff' : '#374151'
                    }}
                >
                    Regions
                </button>
                <button
                    onClick={() => {
                        setActiveModule('pois');
                        fetchPois();
                    }}
                    style={{
                        ...styles.moduleButton,
                        background: activeModule === 'pois' ? '#1d4ed8' : '#f3f4f6',
                        color: activeModule === 'pois' ? '#ffffff' : '#374151'
                    }}
                >
                    Points of Interest ({pois.length})
                </button>
            </div>
        );
    
        return (
            <div style={styles.container}>
                {/* Map */}
                <div ref={mapContainer} style={styles.map} />
    
                {/* Sidebar */}
                <div style={styles.sidebar}>
                    {/* Header */}
                    <div style={styles.header}>
                        <div>
                            <h2 style={styles.title}>Management</h2>
                            <div style={styles.subtitle}>
                                {activeModule === 'regions'
                                    ? `${regions.length} total regions • ${filteredRegions.length} filtered`
                                    : `${pois.length} points of interest`}
                            </div>
                        </div>
                        {renderModuleSwitcher()}
                    </div>
    
                    {/* API Status (only show in regions module) */}
                    {activeModule === 'regions' && renderApiStatus()}
    
                    {/* Search Bar - only in regions list mode */}
                    {activeModule === 'regions' && viewMode === 'list' && (
                        <div style={styles.searchContainer}>
                            <input
                                type="text"
                                placeholder="Search regions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={styles.searchInput}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={styles.clearSearch}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    )}
    
                    {/* Content based on active module */}
                    {isLoading && activeModule === 'regions' ? (
                        <div style={styles.loading}>
                            <div style={styles.spinner}></div>
                            <div>Loading regions...</div>
                        </div>
                    ) : activeModule === 'regions' ? (
                        /* --- Regions Module --- */
                        viewMode === 'create' ? (
                            <div style={styles.section}>
                                {renderPsgcHierarchySelector()}
                            </div>
                        ) : viewMode === 'list' ? (
                            <div style={styles.section}>
                                <div style={styles.sectionHeader}>
                                    <div style={styles.sectionTitle}>
                                        Regions ({filteredRegions.length})
                                        {searchQuery && <span style={styles.filterNote}> matching "{searchQuery}"</span>}
                                    </div>
                                </div>
                                <div style={styles.regionsList}>
                                    {filteredRegions.map(region => (
                                        <div
                                            key={region.region_id}
                                            onClick={() => {
                                                setSelectedRegion(region);
                                                setViewMode('details');
                                            }}
                                            style={{
                                                ...styles.regionItem,
                                                borderLeft: `3px solid ${region.is_active ?
                                                    (region.geographic_level === 'region' ? '#3b82f6' :
                                                        region.geographic_level === 'province' ? '#10b981' :
                                                            region.geographic_level === 'city' ? '#f59e0b' : '#8b5cf6') : '#9ca3af'}`
                                            }}
                                        >
                                            <div style={styles.regionHeader}>
                                                <div style={styles.regionNameRow}>
                                                    <div style={styles.regionName}>{region.name}</div>
                                                    <div style={styles.regionActions}>
                                                        <button
                                                            onClick={(e) => handleDeleteClick(region, e)}
                                                            style={styles.deleteButton}
                                                            title="Delete region"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                                <div style={styles.regionMeta}>
                                                    <span style={{
                                                        ...styles.regionBadge,
                                                        background: region.geographic_level === 'region' ? '#dbeafe' :
                                                            region.geographic_level === 'province' ? '#d1fae5' :
                                                                region.geographic_level === 'city' ? '#fef3c7' :
                                                                    region.geographic_level === 'municipality' ? '#fce7f3' : '#f3e8ff',
                                                        color: region.geographic_level === 'region' ? '#1e40af' :
                                                            region.geographic_level === 'province' ? '#065f46' :
                                                                region.geographic_level === 'city' ? '#92400e' :
                                                                    region.geographic_level === 'municipality' ? '#9d174d' : '#5b21b6'
                                                    }}>
                                                        {region.geographic_level}
                                                    </span>
                                                    {region.psgc_code && (
                                                        <span style={styles.regionCode}>
                                                            {region.psgc_code}
                                                        </span>
                                                    )}
                                                    {!region.is_active && (
                                                        <span style={styles.inactiveBadge}>
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
    
                                    {filteredRegions.length === 0 && (
                                        <div style={styles.emptyState}>
                                            <div style={styles.emptyIcon}>🗺️</div>
                                            <div style={styles.emptyTitle}>
                                                {searchQuery ? 'No matching regions found' : 'No regions yet'}
                                            </div>
                                            <div style={styles.emptyText}>
                                                {searchQuery ? 'Try a different search term' : 'Create your first region using PSGC data'}
                                            </div>
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery('')}
                                                    style={styles.clearFilterButton}
                                                >
                                                    Clear Search
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : viewMode === 'details' && selectedRegion ? (
                            <div style={styles.section}>
                                <div style={styles.sectionHeader}>
                                    <div style={styles.sectionTitle}>Region Details</div>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        style={styles.backButton}
                                    >
                                        ← Back
                                    </button>
                                </div>
    
                                <div style={styles.detailsCard}>
                                    <div style={styles.detailsHeader}>
                                        <div style={styles.detailsName}>{selectedRegion.name}</div>
                                        <div style={{
                                            ...styles.detailsStatus,
                                            background: selectedRegion.is_active ? '#d1fae5' : '#f3f4f6',
                                            color: selectedRegion.is_active ? '#065f46' : '#6b7280'
                                        }}>
                                            {selectedRegion.is_active ? 'Active' : 'Inactive'}
                                        </div>
                                    </div>
    
                                    <div style={styles.detailsGrid}>
                                        <div style={styles.detailItem}>
                                            <div style={styles.detailLabel}>PSGC Code</div>
                                            <div style={styles.detailValue}>{selectedRegion.psgc_code || 'N/A'}</div>
                                        </div>
                                        <div style={styles.detailItem}>
                                            <div style={styles.detailLabel}>Level</div>
                                            <div style={styles.detailValue}>{selectedRegion.geographic_level || 'N/A'}</div>
                                        </div>
                                        <div style={styles.detailItem}>
                                            <div style={styles.detailLabel}>Type</div>
                                            <div style={styles.detailValue}>{selectedRegion.type || 'N/A'}</div>
                                        </div>
                                        <div style={styles.detailItem}>
                                            <div style={styles.detailLabel}>Status</div>
                                            <div style={styles.detailValue}>
                                                <span style={{
                                                    color: selectedRegion.is_active ? '#065f46' : '#dc2626',
                                                    fontWeight: 500
                                                }}>
                                                    {selectedRegion.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={styles.detailItem}>
                                            <div style={styles.detailLabel}>Created</div>
                                            <div style={styles.detailValue}>
                                                {new Date(selectedRegion.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div style={styles.detailItem}>
                                            <div style={styles.detailLabel}>Last Sync</div>
                                            <div style={styles.detailValue}>
                                                {selectedRegion.last_api_sync ?
                                                    new Date(selectedRegion.last_api_sync).toLocaleDateString() :
                                                    'Never'
                                                }
                                            </div>
                                        </div>
                                    </div>
    
                                    {selectedRegion.parent_psgc_code && (
                                        <div style={styles.detailItem}>
                                            <div style={styles.detailLabel}>Parent PSGC Code</div>
                                            <div style={styles.detailValue}>{selectedRegion.parent_psgc_code}</div>
                                        </div>
                                    )}
    
                                    {selectedRegion.governing_body && (
                                        <div style={styles.detailItem}>
                                            <div style={styles.detailLabel}>Governing Body</div>
                                            <div style={styles.detailValue}>{selectedRegion.governing_body}</div>
                                        </div>
                                    )}
    
                                    <div style={styles.detailActions}>
                                        {onRegionSelect && (
                                            <button
                                                onClick={() => onRegionSelect(selectedRegion.region_id)}
                                                style={styles.primaryButton}
                                            >
                                                Assign Routes
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`Are you sure you want to ${selectedRegion.is_active ? 'deactivate' : 'activate'} this region?`)) {
                                                    supabase
                                                        .from('regions')
                                                        .update({ is_active: !selectedRegion.is_active })
                                                        .eq('region_id', selectedRegion.region_id)
                                                        .then(() => {
                                                            fetchRegions();
                                                            setSelectedRegion({
                                                                ...selectedRegion,
                                                                is_active: !selectedRegion.is_active
                                                            });
                                                        });
                                                }
                                            }}
                                            style={selectedRegion.is_active ? styles.warningButton : styles.successButton}
                                        >
                                            {selectedRegion.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(selectedRegion, { stopPropagation: () => {} })}
                                            style={styles.dangerButton}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : null
                    ) : (
                        /* --- POIs Module --- */
                        poiViewMode === 'list' ? renderPoiList() :
                            poiViewMode === 'create' ? renderPoiForm(false) :
                                poiViewMode === 'edit' ? renderPoiForm(true) :
                                    poiViewMode === 'details' ? renderPoiDetails() : null
                    )}
                </div>
    
                {/* Delete Confirmation Modal */}
                {renderDeleteConfirmation()}
            </div>
        );
    }
    
    const styles = {
        container: {
            display: 'flex',
            height: '100vh',
            width: '100%',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            background: '#ffffff',
            overflow: 'hidden'
        },
        map: {
            flex: 1,
            height: '100%',
            minWidth: 0
        },
        sidebar: {
            width: '400px',
            background: '#ffffff',
            borderLeft: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
            zIndex: 10,
            overflowY: 'auto'
        },
        header: {
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            background: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            position: 'sticky',
            top: 0,
            zIndex: 20
        },
        title: {
            color: '#1f2937',
            fontSize: '18px',
            fontWeight: 700,
            marginBottom: '2px',
            marginTop: 0,
            letterSpacing: '-0.025em'
        },
        subtitle: {
            color: '#6b7280',
            fontSize: '12px',
            fontWeight: 500
        },
        moduleSwitcher: {
            display: 'flex',
            gap: '4px'
        },
        moduleButton: {
            border: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
        },
        primaryButton: {
            background: '#1d4ed8',
            color: '#ffffff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background-color 0.2s',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            '&:hover': {
                background: '#1e40af'
            },
            '&:disabled': {
                background: '#9ca3af',
                cursor: 'not-allowed'
            }
        },
        apiStatus: {
            padding: '6px 12px',
            margin: '0 20px 12px',
            borderRadius: '4px',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            color: '#6b7280',
            fontSize: '12px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
        },
        apiStatusDot: {
            width: '6px',
            height: '6px',
            borderRadius: '50%'
        },
        searchContainer: {
            padding: '0 20px 12px',
            position: 'relative'
        },
        searchInput: {
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
            background: '#ffffff',
            color: '#1f2937',
            '&:focus': {
                outline: 'none',
                borderColor: '#3b82f6',
                boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
            }
        },
        clearSearch: {
            position: 'absolute',
            right: '24px',
            top: '8px',
            background: 'transparent',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            fontSize: '14px',
            '&:hover': {
                color: '#374151'
            }
        },
        loading: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            color: '#6b7280',
            fontSize: '14px'
        },
        spinner: {
            width: '32px',
            height: '32px',
            border: '3px solid #e5e7eb',
            borderTopColor: '#1d4ed8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '12px'
        },
        section: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
        },
        sectionHeader: {
            padding: '12px 20px',
            borderBottom: '1px solid #e5e7eb',
            background: '#f9fafb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        sectionTitle: {
            color: '#374151',
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '-0.01em'
        },
        filterNote: {
            color: '#6b7280',
            fontWeight: 400,
            fontSize: '12px',
            marginLeft: '8px'
        },
        backButton: {
            background: 'transparent',
            border: '1px solid #d1d5db',
            color: '#4b5563',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s'
        },
        psgcSelector: {
            padding: '16px',
            background: '#f9fafb',
            borderRadius: '8px',
            margin: '12px',
            border: '1px solid #e5e7eb'
        },
        selectorHeader: {
            marginBottom: '16px'
        },
        selectorTitleRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px'
        },
        selectorTitle: {
            fontSize: '16px',
            fontWeight: 600,
            color: '#1f2937',
            margin: 0
        },
        selectorSubtitle: {
            fontSize: '13px',
            color: '#6b7280'
        },
        hierarchyLevel: {
            marginBottom: '12px'
        },
        hierarchyLabel: {
            display: 'block',
            marginBottom: '4px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#374151'
        },
        hierarchySelect: {
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
            background: '#ffffff',
            color: '#1f2937',
            cursor: 'pointer'
        },
        loadingIndicator: {
            fontSize: '11px',
            color: '#6b7280',
            marginTop: '4px',
            fontStyle: 'italic'
        },
        selectionPreview: {
            marginTop: '16px',
            padding: '12px',
            background: '#ffffff',
            borderRadius: '6px',
            border: '1px solid #e5e7eb'
        },
        previewTitle: {
            fontSize: '13px',
            fontWeight: 500,
            color: '#6b7280',
            marginBottom: '4px'
        },
        previewPath: {
            fontSize: '14px',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '12px'
        },
        createButtons: {
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap'
        },
        createButton: {
            padding: '8px 12px',
            background: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s'
        },
        regionsList: {
            flex: 1,
            overflowY: 'auto'
        },
        regionItem: {
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            '&:hover': {
                background: '#f9fafb'
            }
        },
        regionHeader: {
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
        },
        regionNameRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
        },
        regionName: {
            fontWeight: 600,
            color: '#1f2937',
            fontSize: '14px',
            flex: 1
        },
        regionActions: {
            display: 'flex',
            gap: '4px'
        },
        deleteButton: {
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '2px 6px',
            borderRadius: '4px',
            '&:hover': {
                background: '#fee2e2',
                color: '#dc2626'
            }
        },
        regionMeta: {
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap'
        },
        regionBadge: {
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '10px',
            fontWeight: 500,
            textTransform: 'uppercase',
            background: '#e5e7eb',
            color: '#374151'
        },
        regionCode: {
            fontSize: '11px',
            color: '#6b7280',
            fontFamily: 'monospace',
            background: '#f3f4f6',
            padding: '2px 6px',
            borderRadius: '4px'
        },
        inactiveBadge: {
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '10px',
            fontWeight: 500,
            background: '#f3f4f6',
            color: '#6b7280'
        },
        emptyState: {
            padding: '40px 20px',
            textAlign: 'center',
            color: '#9ca3af'
        },
        emptyIcon: {
            fontSize: '36px',
            marginBottom: '12px'
        },
        emptyTitle: {
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '8px',
            color: '#6b7280'
        },
        emptyText: {
            fontSize: '13px',
            marginBottom: '16px'
        },
        clearFilterButton: {
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid #d1d5db',
            color: '#4b5563',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer'
        },
        detailsCard: {
            padding: '16px'
        },
        detailsHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px'
        },
        detailsName: {
            color: '#1f2937',
            fontSize: '18px',
            fontWeight: 700,
            flex: 1
        },
        detailsStatus: {
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: '10px',
            fontWeight: 500,
            textTransform: 'uppercase'
        },
        detailsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '16px'
        },
        detailItem: {
            marginBottom: '12px'
        },
        detailLabel: {
            color: '#6b7280',
            fontSize: '11px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '2px'
        },
        detailValue: {
            color: '#1f2937',
            fontSize: '13px',
            fontWeight: 500
        },
        detailActions: {
            display: 'flex',
            gap: '8px',
            marginTop: '16px',
            flexWrap: 'wrap'
        },
        warningButton: {
            background: '#fef3c7',
            color: '#92400e',
            border: '1px solid #fbbf24',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
        },
        successButton: {
            background: '#d1fae5',
            color: '#065f46',
            border: '1px solid #10b981',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
        },
        dangerButton: {
            background: '#fee2e2',
            color: '#dc2626',
            border: '1px solid #fca5a5',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
        },
        modalOverlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        },
        modalContent: {
            background: '#ffffff',
            borderRadius: '8px',
            padding: '20px',
            width: '90%',
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        },
        modalTitle: {
            fontSize: '18px',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '12px'
        },
        modalText: {
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '20px',
            lineHeight: 1.5
        },
        modalActions: {
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
        },
        modalCancel: {
            padding: '8px 16px',
            background: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer'
        },
        modalDelete: {
            padding: '8px 16px',
            background: '#dc2626',
            color: '#ffffff',
            border: '1px solid #b91c1c',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer'
        },
        // POI form styles with explicit colors
        formGroup: {
            marginBottom: '16px'
        },
        formLabel: {
            display: 'block',
            marginBottom: '4px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#374151'
        },
        formInput: {
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#1f2937',
            backgroundColor: '#ffffff'
        },
        formSelect: {
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#1f2937',
            backgroundColor: '#ffffff'
        },
        formTextarea: {
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
            fontFamily: 'monospace',
            color: '#1f2937',
            backgroundColor: '#ffffff',
            resize: 'vertical'
        },
        locationInput: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: '#f9fafb',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#1f2937'
        },
        smallButton: {
            padding: '4px 8px',
            background: '#e5e7eb',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            color: '#1f2937'
        },
        instruction: {
            marginTop: '4px',
            fontSize: '12px',
            color: '#3b82f6',
            fontStyle: 'italic'
        },
        jsonPreview: {
            background: '#f3f4f6',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'monospace',
            overflow: 'auto',
            maxHeight: '150px',
            color: '#1f2937'
        }
    };
    
    // Add CSS animation for spinner
    const styleSheet = document.styleSheets[0];
    styleSheet.insertRule(`
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `, styleSheet.cssRules.length);