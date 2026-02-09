import { Tabs } from 'expo-router';
import { useAuth } from '../../providers/AuthProvider';
import { useProfile } from "../../lib/useProfile";
import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, View, Text } from 'react-native';

export default function TabsLayout() {
    const { session, isLoading } = useAuth();

    // Fetch profile only when session exists
    const { profile, loading: profileLoading } = useProfile(session);

    // Show loading only while auth state is resolving
    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4A90E2" />
                <Text>Loading...</Text>
            </View>
        );
    }

    // Determine role safely
    const isOperator = !!session && profile?.role === "operator";

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#4A90E2',
                tabBarInactiveTintColor: '#666',
                tabBarStyle: {
                    backgroundColor: '#FFF',
                    borderTopColor: '#E2E8F0',
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
            }}
        >
            {/* Operator tabs */}
            <Tabs.Screen
                name="home.operator"
                options={{
                    title: "Home",
                    href: isOperator ? undefined : null,
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="routes.operator"
                options={{
                    title: "Routes",
                    href: isOperator ? undefined : null,
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="map" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="account.operator"
                options={{
                    title: "Account",
                    href: isOperator ? undefined : null,
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="user" size={size} color={color} />
                    ),
                }}
            />

            {/* Passenger tabs (guests + passengers) */}
            <Tabs.Screen
                name="home.passenger"
                options={{
                    title: "Home",
                    href: !isOperator ? undefined : null,
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="routes.passenger"
                options={{
                    title: "Routes",
                    href: !isOperator ? undefined : null,
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="map" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="account.passenger"
                options={{
                    title: "Account",
                    href: !isOperator ? undefined : null,
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="user" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
