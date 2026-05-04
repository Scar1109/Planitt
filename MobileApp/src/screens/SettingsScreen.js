import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { getApiUrl, setApiUrl } from '../utils/config';

const SettingsScreen = ({ navigation }) => {
    const theme = useTheme();
    const [apiUrl, setLocalApiUrl] = useState('');

    useEffect(() => {
        setLocalApiUrl(getApiUrl());
    }, []);

    const handleSave = async () => {
        if (!apiUrl) {
            Alert.alert("Error", "API URL cannot be empty");
            return;
        }
        await setApiUrl(apiUrl);
        Alert.alert("Success", "API URL updated successfully. Restart the app if you face connection issues.");
        navigation.goBack();
    };

    const handleReset = () => {
        const defaultUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.100:3000';
        setLocalApiUrl(defaultUrl);
    };

    return (
        <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.header}>
                <Text variant="headlineMedium" style={styles.headerTitle}>App Settings</Text>
            </View>

            <View style={styles.content}>
                <Text variant="titleMedium" style={styles.sectionHeader}>API Configuration</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline, marginBottom: 16 }}>
                    Change the backend IP address for development testing. Ensure your phone and computer are on the same Wi-Fi network.
                </Text>
                
                <TextInput
                    label="API Base URL (e.g. http://192.168.1.100:3000)"
                    value={apiUrl}
                    onChangeText={setLocalApiUrl}
                    mode="outlined"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    style={styles.input}
                />

                <View style={styles.actions}>
                    <Button mode="contained" onPress={handleSave} style={styles.button}>
                        Save API URL
                    </Button>
                    <Button mode="outlined" onPress={handleReset} style={styles.button}>
                        Reset to Default
                    </Button>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 24,
        paddingTop: 64,
        paddingBottom: 24,
    },
    headerTitle: {
        fontWeight: 'bold',
    },
    content: {
        padding: 24,
    },
    sectionHeader: {
        fontWeight: 'bold',
        marginBottom: 8,
    },
    input: {
        backgroundColor: 'transparent',
    },
    actions: {
        marginTop: 24,
        gap: 16,
    },
    button: {
        paddingVertical: 4,
    }
});

export default SettingsScreen;
