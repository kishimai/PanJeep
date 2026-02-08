import { Tabs } from 'expo-router';
import { useAuth } from '../../providers/AuthProvider';
import { useProfile } from "../../lib/useProfile";
import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, View, Text } from 'react-native';

export default function TabsLayout() {
    const { session, isLoading } = useAuth();

    // Only fetch profile if there's a logged-in session
    const { profile, loading: profileLoading } = session ? useProfile(session) : { profile: null, loading: false };

    // Show loading only when checking initial auth
    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4A90E2" />
                <Text>Loading...</Text>
            </View>
        );
    }

    // Determine if user is an operator (only for logged-in users)
    const isOperator = profile?.role === "operator";

    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#4A90E2',
            tabBarInactiveTintColor: '#666',
            tabBarStyle: {
                backgroundColor: '#FFF',
                borderTopColor: '#E2E8F0',
                height: 60,
                paddingBottom: 8,
                paddingTop: 8,
            }
        }}>
            {/* Operator tabs - only shown for authenticated operators */}
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

            {/* Passenger tabs - shown for guests AND logged-in passengers */}
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