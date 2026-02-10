// app/(tabs)/_layout.js
import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useAuth } from '../../providers/AuthProvider';
import { useProfile } from "../../lib/useProfile";

export default function TabsLayout() {
    const { session, isLoading } = useAuth();
    const { profile, loading: profileLoading } = useProfile(session);

    const isOperator = !!session && profile?.role === "operator";

    // For operators, use traditional tabs
    if (isOperator) {
        return (
            <>
                <Tabs
                    screenOptions={{
                        headerShown: false,
                        tabBarActiveTintColor: '#39A0ED',
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
                    <Tabs.Screen
                        name="home.operator"
                        options={{
                            title: "Home",
                            href: isOperator ? undefined : null,
                        }}
                    />
                    <Tabs.Screen
                        name="routes.operator"
                        options={{
                            title: "Routes",
                            href: isOperator ? undefined : null,
                        }}
                    />
                    <Tabs.Screen
                        name="account.operator"
                        options={{
                            title: "Account",
                            href: isOperator ? undefined : null,
                        }}
                    />
                </Tabs>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            </>
        );
    }

    // For passengers/guests, NO bottom tabs - screens will handle their own navigation
    return (
        <>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: { display: 'none' },
                }}
            >
                <Tabs.Screen
                    name="home.passenger"
                    options={{
                        title: "Home",
                        href: !isOperator ? undefined : null,
                    }}
                />
                <Tabs.Screen
                    name="routes.passenger"
                    options={{
                        title: "Routes",
                        href: !isOperator ? undefined : null,
                    }}
                />
                <Tabs.Screen
                    name="account.passenger"
                    options={{
                        title: "Account",
                        href: !isOperator ? undefined : null,
                    }}
                />
            </Tabs>
        </>
    );
}