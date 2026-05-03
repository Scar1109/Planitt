import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { Text, Avatar, List, useTheme, Button, Divider } from 'react-native-paper';
import { User, Settings, Bell, HelpCircle, LogOut } from 'lucide-react-native';
import { jwtToken, setJwtToken } from '../utils/auth';
import { getApiUrl } from '../utils/config';

const ProfileScreen = ({ navigation }) => {
    const theme = useTheme();
    const [user, setUser] = useState({ name: 'Loading...', role: '', email: '' });

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch(`${getApiUrl()}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    const userData = data.data?.user || data.data || data;
                    setUser({
                        name: userData.fullName || userData.name || 'Unknown User',
                        role: userData.role || '',
                        email: userData.email || '',
                        phone: userData.phone || ''
                    });
                }
            } catch (error) {
                console.log("Error fetching user data", error);
            }
        };
        fetchUser();
    }, []);

    const handleLogout = () => {
        setJwtToken(null);
        navigation.replace('Login');
    };

    const getInitials = (name) => {
        if (!name || name === 'Loading...') return '';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <View style={styles.profileInfo}>
                    <Avatar.Text size={80} label={getInitials(user.name)} style={styles.avatar} color={theme.colors.primary} backgroundColor={theme.colors.surface} />
                    <Text variant="headlineSmall" style={styles.name}>{user.name}</Text>
                    <Text variant="bodyMedium" style={styles.role}>{user.role || user.email}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <List.Section>
                    <List.Subheader style={{ marginTop: 16 }}> Account Settings</List.Subheader>
                    <List.Item
                        title="Personal Information"
                        left={props => <List.Icon {...props} icon={() => <User size={24} color={theme.colors.outline} />} />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => navigation.navigate('EditProfile', { user })}
                    />
                    <Divider />
                    <List.Item
                        title="Notifications"
                        left={props => <List.Icon {...props} icon={() => <Bell size={24} color={theme.colors.outline} />} />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                        description="News, updates, and compliance alerts"
                    />
                </List.Section>

                <List.Section>
                    <List.Subheader> Support</List.Subheader>
                    <List.Item
                        title="Help & FAQ"
                        left={props => <List.Icon {...props} icon={() => <HelpCircle size={24} color={theme.colors.outline} />} />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => Linking.openURL('https://planitt.online')}
                    />
                </List.Section>

                <View style={styles.logoutContainer}>
                    <Button
                        mode="outlined"
                        onPress={handleLogout}
                        textColor={theme.colors.error}
                        style={{ borderColor: theme.colors.error }}
                        icon={() => <LogOut size={20} color={theme.colors.error} />}
                    >
                        Log Out
                    </Button>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 64,
        paddingBottom: 48,
        alignItems: 'center',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    profileInfo: {
        alignItems: 'center',
    },
    avatar: {
        marginBottom: 16,
    },
    name: {
        color: '#fff',
        fontWeight: 'bold',
    },
    role: {
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    section: {
        marginTop: -24,
        paddingHorizontal: 16,
    },
    logoutContainer: {
        padding: 24,
        marginTop: 16,
    }
});

export default ProfileScreen;
