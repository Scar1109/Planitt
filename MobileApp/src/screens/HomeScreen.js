import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Title, Paragraph, Button, useTheme } from 'react-native-paper';
import { Layers, Ruler, Activity } from 'lucide-react-native';

const HomeScreen = ({ navigation }) => {
    const theme = useTheme();

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <Text variant="headlineMedium" style={styles.greeting}>Welcome Back</Text>
                <Text variant="bodyLarge" style={{ color: theme.colors.outline }}>Here is your store overview</Text>
            </View>

            <View style={styles.statsContainer}>
                <Card style={[styles.statCard, { borderLeftColor: theme.colors.primary, borderLeftWidth: 4 }]}>
                    <Card.Content style={styles.statContent}>
                        <View>
                            <Text variant="labelLarge" style={{ color: theme.colors.outline }}>Total Shelves</Text>
                            <Text variant="headlineLarge" style={{ fontWeight: 'bold' }}>124</Text>
                        </View>
                        <View style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                            <Layers size={24} color={theme.colors.primary} />
                        </View>
                    </Card.Content>
                </Card>

                <Card style={[styles.statCard, { borderLeftColor: theme.colors.success, borderLeftWidth: 4 }]}>
                    <Card.Content style={styles.statContent}>
                        <View>
                            <Text variant="labelLarge" style={{ color: theme.colors.outline }}>Compliance</Text>
                            <Text variant="headlineLarge" style={{ fontWeight: 'bold' }}>94%</Text>
                        </View>
                        <View style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                            <Activity size={24} color={theme.colors.success} />
                        </View>
                    </Card.Content>
                </Card>
            </View>

            <View style={styles.actionSection}>
                <Text variant="titleLarge" style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActions}>
                    <Card style={styles.actionCard} onPress={() => navigation.navigate('Shelves')}>
                        <Card.Content style={styles.actionContent}>
                            <View style={[styles.actionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                                <Layers size={32} color={theme.colors.primary} />
                            </View>
                            <Title style={styles.actionTitle}>Manage Shelves</Title>
                            <Paragraph style={styles.actionDesc}>Add or edit store shelves and layouts</Paragraph>
                        </Card.Content>
                    </Card>

                    <Card style={styles.actionCard} onPress={() => {/* Placeholder for AR quick launch if needed */ }}>
                        <Card.Content style={styles.actionContent}>
                            <View style={[styles.actionIcon, { backgroundColor: theme.colors.secondary + '20' }]}>
                                <Ruler size={32} color={theme.colors.secondary} />
                            </View>
                            <Title style={styles.actionTitle}>Measure Space</Title>
                            <Paragraph style={styles.actionDesc}>Use AR to accurately measure shelf dimensions</Paragraph>
                        </Card.Content>
                    </Card>
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
        padding: 24,
        paddingTop: 32,
        paddingBottom: 16,
    },
    greeting: {
        fontWeight: 'bold',
    },
    statsContainer: {
        paddingHorizontal: 16,
        gap: 16,
        marginBottom: 24,
    },
    statCard: {
        elevation: 2,
    },
    statContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionSection: {
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontWeight: 'bold',
        marginBottom: 16,
    },
    quickActions: {
        gap: 16,
        paddingBottom: 32,
    },
    actionCard: {
        elevation: 1,
    },
    actionContent: {
        alignItems: 'flex-start',
    },
    actionIcon: {
        width: 64,
        height: 64,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    actionTitle: {
        fontWeight: 'bold',
    },
    actionDesc: {
        opacity: 0.7,
    }
});

export default HomeScreen;
