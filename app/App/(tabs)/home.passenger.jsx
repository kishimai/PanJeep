import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    StatusBar,
    Platform,
    TextInput,
} from "react-native";
import { useAuth } from '../../providers/AuthProvider';
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";

export default function PassengerHome() {
    const { session } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const isGuest = session?.type === 'guest';

    const handleGuestUpgrade = () => {
        Alert.alert(
            "Unlock Full Features",
            "Create an account to save your favorite routes and get personalized recommendations.",
            [
                {
                    text: "Maybe Later",
                    style: "cancel"
                },
                {
                    text: "Sign Up",
                    onPress: () => router.push("/register")
                }
            ]
        );
    };

    const popularRoutes = [
        { id: 1, name: "Route 12A: Downtown Loop", fare: "₱15", time: "15 min", rating: "4.5" },
        { id: 2, name: "Route 8B: University Express", fare: "₱12", time: "7 min", rating: "4.8" },
        { id: 3, name: "Route 5C: Coastal Line", fare: "₱20", time: "20 min", rating: "4.2" },
        { id: 4, name: "Route 3D: Market Route", fare: "₱10", time: "10 min", rating: "4.0" },
    ];

    const recentSearches = [
        "University Campus",
        "Downtown Market",
        "Bus Station",
        "Shopping Mall",
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.greeting}>Hello{isGuest ? " Guest" : ""}!</Text>
                            <Text style={styles.subGreeting}>Where would you like to go?</Text>
                        </View>
                        {isGuest ? (
                            <TouchableOpacity
                                style={styles.upgradeBadge}
                                onPress={handleGuestUpgrade}
                            >
                                <Feather name="star" size={16} color="#FFF" />
                                <Text style={styles.upgradeBadgeText}>Upgrade</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.profileIcon}>
                                <Feather name="user" size={20} color="#4A90E2" />
                            </View>
                        )}
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Feather name="search" size={20} color="#666" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search destination or route..."
                            placeholderTextColor="#999"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Feather name="x-circle" size={18} color="#999" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity style={styles.quickAction}>
                        <View style={[styles.actionIcon, { backgroundColor: '#E8F2FF' }]}>
                            <Feather name="map-pin" size={24} color="#4A90E2" />
                        </View>
                        <Text style={styles.actionText}>Nearby</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.quickAction}>
                        <View style={[styles.actionIcon, { backgroundColor: '#E8F2FF' }]}>
                            <Feather name="clock" size={24} color="#4A90E2" />
                        </View>
                        <Text style={styles.actionText}>Recent</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.quickAction}>
                        <View style={[styles.actionIcon, { backgroundColor: '#E8F2FF' }]}>
                            <Feather name="star" size={24} color="#4A90E2" />
                        </View>
                        <Text style={styles.actionText}>Saved</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.quickAction}>
                        <View style={[styles.actionIcon, { backgroundColor: '#E8F2FF' }]}>
                            <Feather name="trending-up" size={24} color="#4A90E2" />
                        </View>
                        <Text style={styles.actionText}>Popular</Text>
                    </TouchableOpacity>
                </View>

                {/* Guest Upgrade Banner */}
                {isGuest && (
                    <TouchableOpacity
                        style={styles.guestBanner}
                        onPress={handleGuestUpgrade}
                    >
                        <View style={styles.bannerContent}>
                            <View style={styles.bannerIcon}>
                                <Feather name="unlock" size={24} color="#4A90E2" />
                            </View>
                            <View style={styles.bannerTextContainer}>
                                <Text style={styles.bannerTitle}>Unlock Full Access</Text>
                                <Text style={styles.bannerSubtitle}>
                                    Create an account to save routes and get personalized recommendations
                                </Text>
                            </View>
                            <Feather name="chevron-right" size={20} color="#4A90E2" />
                        </View>
                    </TouchableOpacity>
                )}

                {/* Popular Routes */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Popular Routes</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.routesList}>
                        {popularRoutes.map((route) => (
                            <TouchableOpacity key={route.id} style={styles.routeCard}>
                                <View style={styles.routeHeader}>
                                    <View style={styles.routeIcon}>
                                        <Feather name="map" size={18} color="#4A90E2" />
                                    </View>
                                    <Text style={styles.routeName} numberOfLines={1}>{route.name}</Text>
                                </View>

                                <View style={styles.routeDetails}>
                                    <View style={styles.detailItem}>
                                        <Feather name="dollar-sign" size={14} color="#666" />
                                        <Text style={styles.detailText}>{route.fare}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Feather name="clock" size={14} color="#666" />
                                        <Text style={styles.detailText}>{route.time}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Feather name="star" size={14} color="#666" />
                                        <Text style={styles.detailText}>{route.rating}</Text>
                                    </View>
                                </View>

                                <TouchableOpacity style={styles.viewRouteButton}>
                                    <Text style={styles.viewRouteText}>View Route</Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Recent Searches */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Searches</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>Clear All</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchesList}>
                        {recentSearches.map((search, index) => (
                            <TouchableOpacity key={index} style={styles.searchItem}>
                                <Feather name="clock" size={16} color="#666" />
                                <Text style={styles.searchItemText}>{search}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Safety Info */}
                <View style={styles.safetyCard}>
                    <View style={styles.safetyHeader}>
                        <Feather name="shield" size={24} color="#4CAF50" />
                        <Text style={styles.safetyTitle}>Safety First</Text>
                    </View>
                    <Text style={styles.safetyText}>
                        All vehicles are regularly inspected and drivers are verified for your safety.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        paddingTop: Platform.OS === "ios" ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: "#FFFFFF",
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    greeting: {
        fontSize: 28,
        fontWeight: "700",
        color: "#1A1A1A",
    },
    subGreeting: {
        fontSize: 16,
        color: "#666",
        marginTop: 4,
    },
    upgradeBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#4A90E2",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    upgradeBadgeText: {
        color: "#FFF",
        fontSize: 12,
        fontWeight: "600",
        marginLeft: 4,
    },
    profileIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#E8F2FF",
        justifyContent: "center",
        alignItems: "center",
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: "#1A1A1A",
    },
    quickActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    quickAction: {
        alignItems: "center",
    },
    actionIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
    },
    actionText: {
        fontSize: 12,
        color: "#666",
        fontWeight: "500",
    },
    guestBanner: {
        backgroundColor: "#E8F2FF",
        borderRadius: 16,
        marginHorizontal: 20,
        marginBottom: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: "#4A90E2",
    },
    bannerContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    bannerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#FFF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    bannerTextContainer: {
        flex: 1,
    },
    bannerTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1A1A1A",
        marginBottom: 2,
    },
    bannerSubtitle: {
        fontSize: 12,
        color: "#666",
        lineHeight: 16,
    },
    section: {
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#1A1A1A",
    },
    seeAllText: {
        fontSize: 14,
        color: "#4A90E2",
        fontWeight: "500",
    },
    routesList: {
        gap: 12,
    },
    routeCard: {
        backgroundColor: "#FFF",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    routeHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    routeIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#E8F2FF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    routeName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1A1A1A",
        flex: 1,
    },
    routeDetails: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
    },
    detailText: {
        fontSize: 14,
        color: "#666",
        marginLeft: 6,
    },
    viewRouteButton: {
        backgroundColor: "#F1F5F9",
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: "center",
    },
    viewRouteText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4A90E2",
    },
    searchesList: {
        gap: 8,
    },
    searchItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        borderRadius: 12,
        padding: 12,
        paddingHorizontal: 16,
    },
    searchItemText: {
        fontSize: 14,
        color: "#1A1A1A",
        marginLeft: 12,
        flex: 1,
    },
    safetyCard: {
        backgroundColor: "#F0FDF4",
        borderRadius: 16,
        marginHorizontal: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: "#BBF7D0",
    },
    safetyHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    safetyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#166534",
        marginLeft: 12,
    },
    safetyText: {
        fontSize: 14,
        color: "#166534",
        lineHeight: 20,
    },
});