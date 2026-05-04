import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';

import { Alert } from 'react-native';
import { setJwtToken } from '../utils/auth';
import { getApiUrl } from '../utils/config';

const LoginScreen = ({ navigation }) => {
    // Auto-fill credentials for testing
    const [email, setEmail] = useState('admin@planitt.com');
    const [password, setPassword] = useState('admin123');
    const [loading, setLoading] = useState(false);
    const theme = useTheme();

    // Auto-login on mount for testing
    useEffect(() => {
        handleLogin();
    }, []);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${getApiUrl()}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.token) {
                setJwtToken(data.token);
                navigation.replace('Main');
            } else {
                Alert.alert('Login Failed', data.message || 'Invalid credentials');
            }
        } catch (error) {
            console.log('Login error:', error);
            Alert.alert('Error', 'Could not connect to the server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>
                <View style={styles.headerContainer}>
                    <Image source={require('../../assets/icon.png')} style={styles.logo} />
                    <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.primary }]}>Planitt</Text>
                    <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.secondary }]}>Shelf Management & AR</Text>
                </View>

                <View style={styles.formContainer}>
                    <TextInput
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        mode="outlined"
                        style={styles.input}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <TextInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        mode="outlined"
                        style={styles.input}
                        secureTextEntry
                    />
                    <Button
                        mode="contained"
                        onPress={handleLogin}
                        loading={loading}
                        disabled={loading}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                    >
                        Sign In
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
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logo: {
        width: 100,
        height: 100,
        resizeMode: 'contain',
        marginBottom: 16,
    },
    title: {
        fontWeight: 'bold',
    },
    subtitle: {
        marginTop: 4,
    },
    formContainer: {
        gap: 16,
    },
    input: {
        backgroundColor: 'transparent',
    },
    button: {
        marginTop: 8,
        borderRadius: 8,
    },
    buttonContent: {
        paddingVertical: 8,
    }
});

export default LoginScreen;
