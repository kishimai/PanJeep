import { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StatusBar,
    Platform,
} from "react-native";

export default function PassengerRoutes() {
    const [activeRoute, setActiveRoute] = useState(0);
    const [expandedRoute, setExpandedRoute] = useState(null);
    const [selectedFilter, setSelectedFilter] = useState("all");

    // Mock data
    const routes = [
        {
            id: 1,
            busNumber: "Jeepney 01",
            routeName: "Route 12A: Downtown Loop",
            nextStop: "5th Ave & Oak St",
            arrivalTime: "8:15",
            estimatedTime: "15 min",
            passengers: "12/20 seats",
            fare: "₱15",
            rating: "4.5",
            status: "on_time",
        },
        {
            id: 2,
            busNumber: "Jeepney 07",
            routeName: "Route 8B: University Express",
            nextStop: "Science Building",
            arrivalTime: "8:22",
            estimatedTime: "7 min",
            passengers: "8/20 seats",
            fare: "₱12",
            rating: "4.8",
            status: "delayed",
        },
        {
            id: 3,
            busNumber: "Jeepney 14",
            routeName: "Route 5C: Coastal Line",
            nextStop: "Fisherman's Wharf",
            arrivalTime: "8:30",
            estimatedTime: "20 min",
            passengers: "15/20 seats",
            fare: "₱20",
            rating: "4.2",
            status: "early",
        },
    ];

    const filters = [
        { id: "all", label: "All" },
        { id: "nearby", label: "Nearby" },
        { id: "fastest", label: "Fastest" },
        { id: "cheapest", label: "Cheapest" },
    ];

    const getStatusColor = (status) => {
        switch (status) {
            case "on_time":
                return "#22C55E";
            case "delayed":
                return "#EF4444";
            case "early":
                return "#3B82F6";
            default:
                return "#6B7280";
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case "on_time":
                return "On Time";
            case "delayed":
                return "Delayed";
            case "early":
                return "Early";
            default:
                return "";
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Available Routes</Text>
                <Text style={styles.headerSubtitle}>Find your jeepney</Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search destination or route..."
                        placeholderTextColor="#94A3B8"
                    />
                </View>
            </View>

            {/* Filters */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filtersContainer}
            >
                {filters.map((filter) => (
                    <TouchableOpacity
                        key={filter.id}
                        style={[
                            styles.filterButton,
                            selectedFilter === filter.id && styles.filterButtonActive,
                        ]}
                        onPress={() => setSelectedFilter(filter.id)}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                selectedFilter === filter.id && styles.filterTextActive,
                            ]}
                        >
                            {filter.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Route Count */}
            <View style={styles.countContainer}>
                <Text style={styles.countText}>
                    {routes.length} routes available near you
                </Text>
            </View>

            {/* Routes List */}
            <ScrollView
                style={styles.routesList}
                showsVerticalScrollIndicator={false}
            >
                {routes.map((route, index) => {
                    const isExpanded = expandedRoute === route.id;
                    const isActive = activeRoute === index;

                    return (
                        <TouchableOpacity
                            key={route.id}
                            style={[
                                styles.routeCard,
                                isActive && styles.routeCardActive,
                                isExpanded && styles.routeCardExpanded,
                            ]}
                            onPress={() => {
                                setActiveRoute(index);
                                setExpandedRoute(isExpanded ? null : route.id);
                            }}
                            activeOpacity={0.9}
                        >
                            {/* Route Header */}
                            <View style={styles.routeHeader}>
                                <View style={styles.routeNumberContainer}>
                                    <Text style={styles.routeNumber}>{route.busNumber}</Text>
                                </View>

                                <View style={styles.routeInfo}>
                                    <Text style={styles.routeName} numberOfLines={1}>
                                        {route.routeName}
                                    </Text>
                                    <View style={styles.ratingContainer}>
                                        <Text style={styles.ratingText}>⭐ {route.rating}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Status and Arrival */}
                            <View style={styles.statusRow}>
                                <View style={styles.statusContainer}>
                                    <View
                                        style={[
                                            styles.statusDot,
                                            { backgroundColor: getStatusColor(route.status) },
                                        ]}
                                    />
                                    <Text style={styles.statusText}>
                                        {getStatusText(route.status)}
                                    </Text>
                                </View>
                                <View style={styles.arrivalContainer}>
                                    <Text style={styles.arrivalLabel}>Arrives at</Text>
                                    <Text style={styles.arrivalTime}>{route.arrivalTime}</Text>
                                </View>
                            </View>

                            {/* Quick Info */}
                            <View style={styles.quickInfo}>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Next Stop</Text>
                                    <Text style={styles.infoValue}>{route.nextStop}</Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Travel Time</Text>
                                    <Text style={styles.infoValue}>{route.estimatedTime}</Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Fare</Text>
                                    <Text style={styles.fareValue}>{route.fare}</Text>
                                </View>
                            </View>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <View style={styles.expandedDetails}>
                                    <View style={styles.divider} />

                                    <View style={styles.detailRow}>
                                        <View style={styles.detailItem}>
                                            <Text style={styles.detailLabel}>Passengers</Text>
                                            <Text style={styles.detailValue}>{route.passengers}</Text>
                                        </View>
                                        <View style={styles.detailItem}>
                                            <Text style={styles.detailLabel}>Status</Text>
                                            <Text style={[styles.detailValue, { color: getStatusColor(route.status) }]}>
                                                {getStatusText(route.status)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.actions}>
                                        <TouchableOpacity style={styles.secondaryAction}>
                                            <Text style={styles.secondaryActionText}>Notify Me</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.primaryAction}>
                                            <Text style={styles.primaryActionText}>Track Route</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.bottomContainer}>
                <View style={styles.safetyInfo}>
                    <Text style={styles.safetyText}>✅ All vehicles are safety-checked</Text>
                </View>
                <TouchableOpacity style={styles.trackAllButton}>
                    <Text style={styles.trackAllText}>Track All Routes</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    header: {
        paddingTop: Platform.OS === "ios" ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: "#FFFFFF",
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "700",
        color: "#0F172A",
    },
    headerSubtitle: {
        fontSize: 16,
        color: "#64748B",
        marginTop: 4,
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    searchBar: {
        backgroundColor: "#F1F5F9",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchInput: {
        fontSize: 16,
        color: "#0F172A",
    },
    filtersContainer: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "#F1F5F9",
        borderRadius: 20,
        marginRight: 8,
    },
    filterButtonActive: {
        backgroundColor: "#3B82F6",
    },
    filterText: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "500",
    },
    filterTextActive: {
        color: "#FFFFFF",
    },
    countContainer: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    countText: {
        fontSize: 14,
        color: "#64748B",
    },
    routesList: {
        flex: 1,
        paddingHorizontal: 20,
    },
    routeCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    routeCardActive: {
        borderColor: "#3B82F6",
        borderWidth: 2,
    },
    routeCardExpanded: {
        marginBottom: 16,
    },
    routeHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    routeNumberContainer: {
        backgroundColor: "#3B82F6",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginRight: 12,
    },
    routeNumber: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "600",
    },
    routeInfo: {
        flex: 1,
    },
    routeName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#0F172A",
        marginBottom: 4,
    },
    ratingContainer: {
        alignSelf: "flex-start",
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    ratingText: {
        fontSize: 12,
        color: "#92400E",
        fontWeight: "600",
    },
    statusRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    statusContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "500",
    },
    arrivalContainer: {
        alignItems: "flex-end",
    },
    arrivalLabel: {
        fontSize: 12,
        color: "#64748B",
        marginBottom: 2,
    },
    arrivalTime: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0F172A",
    },
    quickInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    infoItem: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: "#64748B",
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#0F172A",
    },
    fareValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#22C55E",
    },
    expandedDetails: {
        marginTop: 4,
    },
    divider: {
        height: 1,
        backgroundColor: "#E2E8F0",
        marginVertical: 12,
    },
    detailRow: {
        flexDirection: "row",
        marginBottom: 16,
    },
    detailItem: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        color: "#64748B",
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#0F172A",
    },
    actions: {
        flexDirection: "row",
        gap: 12,
    },
    secondaryAction: {
        flex: 1,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 8,
        alignItems: "center",
    },
    secondaryActionText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#64748B",
    },
    primaryAction: {
        flex: 2,
        paddingVertical: 12,
        backgroundColor: "#3B82F6",
        borderRadius: 8,
        alignItems: "center",
    },
    primaryActionText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    bottomContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
    },
    safetyInfo: {
        alignItems: "center",
        marginBottom: 12,
    },
    safetyText: {
        fontSize: 13,
        color: "#0F9732",
        fontWeight: "500",
    },
    trackAllButton: {
        paddingVertical: 16,
        backgroundColor: "#0F172A",
        borderRadius: 12,
        alignItems: "center",
    },
    trackAllText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
});