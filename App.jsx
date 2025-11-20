// @ts-nocheck

import React from 'react';
import { StyleSheet } from 'react-native';
import { MartianMono_400Regular, MartianMono_700Bold, useFonts } from '@expo-google-fonts/martian-mono';

import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Login } from './Screen/Login';
import { LiveView } from "./Screen/LiveView";
import {RouteView} from "./Screen/RouteView";

const Stack = createNativeStackNavigator();


export default function App() {
    useFonts({
        MartianMono_400Regular,
        MartianMono_700Bold,
    });

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Login" component={Login} />
                <Stack.Screen name="RouteView" component={RouteView} />
            </Stack.Navigator>
            <StatusBar style="auto" />
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
