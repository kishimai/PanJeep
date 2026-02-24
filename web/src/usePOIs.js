// usePOIs.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import mapboxgl from 'mapbox-gl';

// Helper to get marker style based on type
const getPOIStyle = (type) => {
    switch (type) {
        case 'terminal':
            return { color: '#DC2626', text: 'T', size: 30, label: 'Terminal' };
        case 'stop':
            return { color: '#2563EB', text: 'S', size: 24, label: 'Stop' };
        case 'hub':
            return { color: '#7C3AED', text: 'H', size: 32, label: 'Hub' };
        case 'landmark':
            return { color: '#059669', text: 'L', size: 28, label: 'Landmark' };
        default:
            return { color: '#6B7280', text: '?', size: 24, label: 'POI' };
    }
};

export const usePOIs = (regionFilter = null) => {
    const [pois, setPois] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const markersRef = useRef([]);
    const tempMarkerRef = useRef(null);

    // Fetch POIs from Supabase
    const fetchPOIs = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            let query = supabase
                .from('points_of_interest')
                .select(`
          id,
          name,
          type,
          geometry,
          region_id,
          metadata,
          created_at,
          region:region_id ( name, code )
        `)
                .order('name');

            if (regionFilter) {
                query = query.eq('region_id', regionFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setPois(data || []);
        } catch (err) {
            console.error('Error fetching POIs:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [regionFilter]);

    // Create a new POI
    const createPOI = useCallback(async (poiData) => {
        try {
            const { data, error } = await supabase
                .from('points_of_interest')
                .insert([poiData])
                .select()
                .single();
            if (error) throw error;
            setPois(prev => [data, ...prev]);
            return data;
        } catch (err) {
            console.error('Error creating POI:', err);
            throw err;
        }
    }, []);

    // Update an existing POI
    const updatePOI = useCallback(async (id, updates) => {
        try {
            const { data, error } = await supabase
                .from('points_of_interest')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            setPois(prev => prev.map(p => p.id === id ? data : p));
            return data;
        } catch (err) {
            console.error('Error updating POI:', err);
            throw err;
        }
    }, []);

    // Delete a POI
    const deletePOI = useCallback(async (id) => {
        try {
            const { error } = await supabase
                .from('points_of_interest')
                .delete()
                .eq('id', id);
            if (error) throw error;
            setPois(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            console.error('Error deleting POI:', err);
            throw err;
        }
    }, []);

    // Draw POI markers on the map (clears previous)
    const drawMarkers = useCallback((map) => {
        if (!map) return;

        // Remove existing markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        pois.forEach(poi => {
            if (!poi.geometry || poi.geometry.type !== 'Point') return;
            const [lng, lat] = poi.geometry.coordinates;
            const style = getPOIStyle(poi.type);

            const el = document.createElement('div');
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

            const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; max-width: 200px;">
          <div style="font-weight: bold;">${poi.name}</div>
          <div style="font-size: 12px; color: #666;">Type: ${style.label}</div>
          ${poi.region?.name ? `<div style="font-size: 12px;">Region: ${poi.region.name}</div>` : ''}
        </div>
      `);

            const marker = new mapboxgl.Marker({ element: el })
                .setLngLat([lng, lat])
                .setPopup(popup)
                .addTo(map);

            markersRef.current.push(marker);
        });
    }, [pois]);

    // Add a temporary marker (used during location selection)
    const addTempMarker = useCallback((map, lngLat) => {
        if (tempMarkerRef.current) tempMarkerRef.current.remove();
        const el = document.createElement('div');
        el.style.cssText = `
      width: 20px; height: 20px;
      background: #3b82f6;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;
        tempMarkerRef.current = new mapboxgl.Marker({ element: el })
            .setLngLat(lngLat)
            .addTo(map);
    }, []);

    const removeTempMarker = useCallback(() => {
        if (tempMarkerRef.current) {
            tempMarkerRef.current.remove();
            tempMarkerRef.current = null;
        }
    }, []);

    // Cleanup markers on unmount
    useEffect(() => {
        return () => {
            markersRef.current.forEach(m => m.remove());
            if (tempMarkerRef.current) tempMarkerRef.current.remove();
        };
    }, []);

    return {
        pois,
        isLoading,
        error,
        fetchPOIs,
        createPOI,
        updatePOI,
        deletePOI,
        drawMarkers,
        addTempMarker,
        removeTempMarker,
    };
};