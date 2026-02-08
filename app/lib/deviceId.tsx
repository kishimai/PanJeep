import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'app_device_id';

export async function getOrCreateDeviceId(): Promise<string> {
    try {
        // Try to get existing device ID
        const existingId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
        if (existingId) {
            return existingId;
        }

        // Generate a new device ID
        let deviceId = '';

        if (Platform.OS === 'ios') {
            // Use async/await properly
            const iosId = await Application.getIosIdForVendorAsync();
            deviceId = iosId || `ios_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        } else if (Platform.OS === 'android') {
            const androidId = Application.getAndroidId();
            deviceId = androidId || `android_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        } else {
            deviceId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        // Store it
        await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);

        return deviceId;
    } catch (error) {
        console.error('Error getting device ID:', error);
        // Return a fallback ID
        return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export async function clearDeviceId(): Promise<void> {
    try {
        await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
    } catch (error) {
        console.error('Error clearing device ID:', error);
    }
}