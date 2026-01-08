import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

//@vite-ignore
mapboxgl.accessToken = 'pk.eyJ1Ijoia2lzaGltYWlpIiwiYSI6ImNtanM1cDhpZzBkOWgzanEyZm1razV2aGwifQ.vaSTYkZf8bsWFPTJJdoucw'; // temporary hardcoded token

export default function Map() {
    const mapContainer = useRef(null);

    useEffect(() => {
        if (!mapContainer.current) return;

        // Initialize map
        const map = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [120.9842, 14.5995], // Manila
            zoom: 12,
            minZoom: 10,
            maxZoom: 16
        });

        return () => map.remove();
    }, []);


    return <div id="map" ref={mapContainer} />;
}
