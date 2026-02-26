// app/_layout.jsx
import { Stack } from 'expo-router';
import AuthProvider from '../providers/AuthProvider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="login" />
                    <Stack.Screen name="register" />
                    <Stack.Screen name="(tabs)" />
                </Stack>
            </AuthProvider>
        </GestureHandlerRootView>
    );
}