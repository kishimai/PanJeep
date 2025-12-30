import React, { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

import { StatusBar } from 'expo-status-bar';

export function Login({ navigation }) {
    const [text, setText] = useState('');

    useEffect(() => {
        // ToDo: log user in the firebase database.
    }, []);

    return (
        <TouchableWithoutFeedback  onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.container}>

                <Text style={{marginBottom: 80}}>
                    <Text style={[styles.TitleLogo, {color:'orange'}]}>Pan</Text>
                    <Text style={styles.TitleLogo}>Jeep</Text>
                </Text>


                <TextInput style={styles.input} placeholder='Enter Preferred Name' value={text} onChangeText={setText}/>

                <TouchableOpacity style={styles.ContinueButton} onPress={() => navigation.replace('LiveView')}>
                    <Text style={{ color: 'white', fontSize: 16, textAlign: 'center', fontFamily: 'MartianMono_400Regular' }}>Register</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{marginTop: 10}} onPress={() => alert("Continue without login!")}>
                    <Text style={{ color: '#6DA7DC', fontSize: 12, textAlign: 'center', fontFamily: 'MartianMono_400Regular' }}>Create Account</Text>
                </TouchableOpacity>

                <StatusBar style="auto" />

                {/* Design */}
                <View style={[styles.circle, {position: 'absolute', bottom: 100, right: -80}]} />
                <View style={[styles.circle, {position: 'absolute', bottom: 150, left: 80}]} />
                <View style={[styles.circle, {position: 'absolute', bottom: -70, left: -20}]} />
                <View style={[styles.circle, {position: 'absolute', bottom: 300, left: -80}]} />
                <View style={[styles.circle, {position: 'absolute', top: -50, right: -80}]} />
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 200,
    },
    TitleLogo:{
        fontSize:60,
        fontFamily: 'MartianMono_700Bold',
        /* textDecorationLine: 'underline', */
    },
    circle: {
        width: 160,
        height: 160,
        borderRadius: 100,
        backgroundColor: '#720E1D',
    },
    input: {
        height: 50,
        width: 250,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: 10,
        backgroundColor: 'white',
        marginBottom: 10,
        fontFamily: 'MartianMono_400Regular'
    },
    ContinueButton:{
        backgroundColor: '#720E1D',
        padding: 12,
        borderRadius: 4,
        width: 250,
    }
})