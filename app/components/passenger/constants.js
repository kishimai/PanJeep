import { Dimensions } from 'react-native';

const { height } = Dimensions.get('window');

export const SCREEN_HEIGHT = height;

// Minimalist Map Style - Hides all labels
export const minimalMapStyle = [
    { featureType: "all", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "all", stylers: [{ visibility: "off" }] },
    { featureType: "poi", elementType: "all", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ visibility: "on" }] },
    { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "transit", elementType: "all", stylers: [{ visibility: "off" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ visibility: "on" }] },
    { featureType: "water", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "landscape", elementType: "all", stylers: [{ visibility: "on" }] }
];

// Add to your existing constants file
export const MAP_CONSTANTS = {
    MIN_ZOOM: 10,
    MAX_ZOOM: 18,
    ROUTE_WIDTH: 4,
    ACTIVE_ROUTE_WIDTH: 6,
    ANIMATION_DURATION: 300,
};

export const ANIMATION = {
    BOTTOM_SHEET_SNAP_POINTS: ['20%', '50%', '90%'],
    FADE_DURATION: 200,
};

// Clean, modern color palette
export const COLORS = {
    background: "#FFFFFF",
    surface: "#FFFFFF",
    text: {
        primary: "#111827",
        secondary: "#4B5563",
        tertiary: "#9CA3AF",
        light: "#FFFFFF",
    },
    primary: {
        main: "#3B82F6",
        light: "#EFF6FF",
        medium: "#DBEAFE",
        dark: "#1D4ED8",
    },
    accent: "#EF4444",
    border: { light: "#F3F4F6", medium: "#E5E7EB" },
    status: {
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
    },
    map: {
        route: "#3B82F6",
        active: "#10B981",
        highlight: "#8B5CF6",
        userLocation: "#3B82F6",
    },
    routeType: {
        community: "#8B5CF6",
        field: "#10B981",
        system: "#3B82F6",
    },
};

// Default region (Philippines center)
export const DEFAULT_REGION = {
    latitude: 12.8797,
    longitude: 121.7740,
    latitudeDelta: 5,
    longitudeDelta: 5,
};