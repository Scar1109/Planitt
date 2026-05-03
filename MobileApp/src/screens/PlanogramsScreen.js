import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Card, Title, Paragraph } from 'react-native-paper';
import { LayoutDashboard } from 'lucide-react-native';

const PlanogramsScreen = () => {
    const theme = useTheme();

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <Text variant="headlineMedium" style={styles.headerTitle}>Planograms</Text>
                <Text variant="bodyLarge" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Visual merchandising & layout planning
                </Text>
            </View>

            <View style={styles.content}>
                <Card style={styles.emptyCard}>
                    <Card.Content style={styles.emptyContent}>
                        <View style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                            <LayoutDashboard size={48} color={theme.colors.primary} />
                        </View>
                        <Title style={{ marginTop: 16 }}>Coming Soon</Title>
                        <Paragraph style={{ textAlign: 'center', marginTop: 8, opacity: 0.7 }}>
                            Planogram management functionalities will be implemented here soon.
                        </Paragraph>
                    </Card.Content>
                </Card>
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
        paddingTop: 64,
        paddingBottom: 32,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTitle: {
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 8,
    },
    content: {
        padding: 24,
    },
    emptyCard: {
        elevation: 1,
        marginTop: 32,
    },
    emptyContent: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default PlanogramsScreen;
