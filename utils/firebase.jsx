import * as Application from 'expo-application';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
    apiKey: "AIzaSyBEQXcKYjPIlZslbOS1Tv_d4xpOec9Fdic",
    authDomain: "panjeep-2a0ee.firebaseapp.com",
    projectId: "panjeep-2a0ee",
    storageBucket: "panjeep-2a0ee.firebasestorage.app",
    messagingSenderId: "501292948999",
    appId: "1:501292948999:web:583549ec6b000cb4f8d4a2",
    measurementId: "G-3X5D0MZBJH"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const getDeviceId = async () => {
    let deviceId = await Application.getAndroidId();
    if (!deviceId && Application.getIosIdForVendorAsync) {
        deviceId = await Application.getIosIdForVendorAsync();
    }
    return deviceId;
};

export const saveDeviceId = async ({ navigation }) => {
    try {
        const deviceId = await getDeviceId();
        if (!deviceId) {
            console.error('Could not get a device ID');
            return;
        }

        const storedId = await AsyncStorage.getItem('verifiedDeviceId');

        if (storedId === deviceId) {

            // update Firestore in background
            (async () => {
                try {
                    const userRef = doc(db, 'users', deviceId);
                    await updateDoc(userRef, { lastSeen: new Date() });
                } catch (error) {
                    console.warn('Background lastSeen update failed:', error);
                }
            })();

            return; // to avoid duplicate navigation
        }

        // Otherwise, check Firestore
        const userRef = doc(db, 'users', deviceId);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            await updateDoc(userRef, { lastSeen: new Date() });
            await AsyncStorage.setItem('verifiedDeviceId', deviceId);
            navigation.replace('LiveView');
        } else {
            const userData = {
                deviceId,
                createdAt: new Date(),
                lastSeen: new Date(),
                platform: Platform.OS,
                username: '',
            };
            await setDoc(userRef, userData);
            await AsyncStorage.setItem('verifiedDeviceId', deviceId);
            navigation.replace('LiveView');
        }

    } catch (error) {
        console.error('Error saving device ID:', error);
    }
};
