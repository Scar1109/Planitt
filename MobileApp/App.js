import React from 'react';
import { SafeAreaView, StatusBar, Text, View, StyleSheet, Image } from 'react-native';
import { registerRootComponent } from 'expo';

const App = () => {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <Image source={require('./assets/icon.png')} style={styles.logo} />
            <Text style={styles.text}>Planitt Mobile App Running</Text>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: 20,
        resizeMode: 'contain'
    },
    text: {
        fontSize: 20,
        fontWeight: 'bold',
    }
});

export default registerRootComponent(App);
