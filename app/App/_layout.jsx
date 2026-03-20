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

                    {/* Contributor screens */}
                    <Stack.Screen name="contributor-application" options={{ headerShown: false }} />
                    <Stack.Screen name="contributor/dashboard" options={{ headerShown: false }} />
                    <Stack.Screen name="contributor/suggest-poi" options={{ headerShown: false }} />
                    <Stack.Screen name="contributor/suggest-route" options={{ headerShown: false }} />
                    <Stack.Screen name="contributor/all-submissions" options={{ headerShown: false }} />
                    <Stack.Screen name="contributor/submission-detail" options={{ headerShown: false }} />
                    {/* my-pois and my-routes not yet implemented */}
                </Stack>
            </AuthProvider>
        </GestureHandlerRootView>
    );
}