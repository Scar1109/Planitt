import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Avatar, List, useTheme, Button, Divider } from 'react-native-paper';
import { User, Settings, Bell, HelpCircle, LogOut } from 'lucide-react-native';

const ProfileScreen = ({ navigation }) => {
    const theme = useTheme();

    const handleLogout = () => {
        // Navigate back to Login stack
        navigation.replace('Login');
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <View style={styles.profileInfo}>
                    <Avatar.Text size={80} label="JS" style={styles.avatar} color={theme.colors.primary} backgroundColor={theme.colors.surface} />
                    <Text variant="headlineSmall" style={styles.name}>John Smith</Text>
                    <Text variant="bodyMedium" style={styles.role}>Store Manager</Text>
                </View>
            </View>

            <View style={styles.section}>
                <List.Section>
                    <List.Subheader>Account Settings</List.Subheader>
                    <List.Item
                        title="Personal Information"
                        left={props => <List.Icon {...props} icon={() => <User size={24} color={theme.colors.outline} />} />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                    />
                    <Divider />
                    <List.Item
                        title="Notifications"
                        left={props => <List.Icon {...props} icon={() => <Bell size={24} color={theme.colors.outline} />} />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                        description="News, updates, and compliance alerts"
                    />
                    <Divider />
                    <List.Item
                        title="App Settings"
                        left={props => <List.Icon {...props} icon={() => <Settings size={24} color={theme.colors.outline} />} />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                    />
                </List.Section>

                <List.Section>
                    <List.Subheader>Support</List.Subheader>
                    <List.Item
                        title="Help & FAQ"
                        left={props => <List.Icon {...props} icon={() => <HelpCircle size={24} color={theme.colors.outline} />} />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
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
