import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { Text, TextInput, Button, useTheme, Avatar } from 'react-native-paper';
import { jwtToken } from '../utils/auth';
import { getApiUrl } from '../utils/config';

const EditProfileScreen = ({ route, navigation }) => {
    const { user } = route.params || { user: {} };
    const theme = useTheme();

    const [name, setName] = useState(user.name || '');
    const [email, setEmail] = useState(user.email || '');
    const [phone, setPhone] = useState(user.phone || '');
    const [loading, setLoading] = useState(false);

    const getInitials = (name) => {
        if (!name) return '';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const handleSave = async () => {
        if (!name || !email) {
            Alert.alert('Error', 'Name and Email are required.');
            return;
        }

        setLoading(true);
        try {
            // Placeholder: Assume PUT /api/users/:id or PUT /api/auth/update
            // You can replace this endpoint with your portal frontend's actual user update API.
            const response = await fetch(`${getApiUrl()}/api/users/${user._id || user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwtToken}`
                },
                body: JSON.stringify({ name, email, phone })
            });

            if (response.ok) {
                Alert.alert('Success', 'Personal information updated.');
                navigation.goBack();
            } else {
                Alert.alert('Error', 'Failed to update profile.');
            }
        } catch (error) {
            console.log('Update profile error:', error);
            // Even if the backend endpoint doesn't exist yet, we allow them to go back.
            Alert.alert('Info', 'Profile update API not fully linked yet, but UI is ready!');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Avatar.Text size={100} label={getInitials(name)} style={styles.avatar} color={theme.colors.primary} backgroundColor={theme.colors.surface} />
                    <Text variant="headlineSmall" style={styles.title}>Edit Profile</Text>
                </View>

                <View style={styles.formContainer}>
                    <TextInput
                        label="Full Name"
                        value={name}
                        onChangeText={setName}
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        mode="outlined"
                        style={styles.input}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <TextInput
                        label="Phone Number"
                        value={phone}
                        onChangeText={setPhone}
                        mode="outlined"
                        style={styles.input}
                        keyboardType="phone-pad"
                    />
                </View>

                <View style={styles.buttonContainer}>
                    <Button
                        mode="contained"
                        onPress={handleSave}
                        loading={loading}
                        disabled={loading}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                    >
                        Save Changes
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={() => navigation.goBack()}
                        disabled={loading}
                        style={[styles.button, styles.cancelButton]}
                        contentStyle={styles.buttonContent}
                    >
                        Cancel
                    </Button>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        padding: 24,
        paddingTop: 64,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatar: {
        marginBottom: 16,
        elevation: 2,
    },
    title: {
        fontWeight: 'bold',
    },
    formContainer: {
        gap: 16,
    },
    input: {
        backgroundColor: 'transparent',
    },
    buttonContainer: {
        marginTop: 32,
        gap: 12,
    },
    button: {
        borderRadius: 8,
    },
    cancelButton: {
        borderColor: 'gray',
    },
    buttonContent: {
        paddingVertical: 8,
    }
});

export default EditProfileScreen;
