import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { AlertTriangle, ArrowLeft } from 'lucide-react-native';
import { jwtToken } from '../utils/auth';
import { getApiUrl } from '../utils/config';

const MAX_LOW_STOCK_ALERTS = 10;

const AlertsScreen = ({ navigation }) => {
    const theme = useTheme();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const response = await fetch(`${getApiUrl()}/api/inventory/low-stock-alerts?limit=${MAX_LOW_STOCK_ALERTS}`, {
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setAlerts((data.alerts || []).slice(0, MAX_LOW_STOCK_ALERTS));
                }
            } catch (error) {
                console.log("Error fetching alerts", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAlerts();
    }, []);

    if (loading) {
        return (
            <View style={styles.center}>
                <Text>Loading Alerts...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={theme.colors.onSurface} />
                </TouchableOpacity>
                <Text variant="headlineMedium" style={styles.title}>Low Stock Alerts</Text>
            </View>
            {alerts.length > 0 ? (
                alerts.map((alert, index) => (
                    <Card key={index} style={styles.alertCard}>
                        <Card.Content style={styles.alertContent}>
                            <View style={styles.iconContainer}>
                                <AlertTriangle color={alert.alertLevel === 'critical' ? theme.colors.error : theme.colors.warning} size={28} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{alert.name}</Text>
                                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>SKU: {alert.sku}</Text>
                                <Text variant="bodyMedium" style={{ color: alert.alertLevel === 'critical' ? theme.colors.error : theme.colors.warning, marginTop: 4 }}>
                                    {alert.alertMessage}
                                </Text>
                                <View style={styles.statsRow}>
                                    <Text variant="labelSmall">Stock: {alert.currentStock}</Text>
                                    <Text variant="labelSmall">Days Left: {alert.daysOfStock}</Text>
                                </View>
                            </View>
                        </Card.Content>
                    </Card>
                ))
            ) : (
                <View style={styles.center}>
                    <Text variant="bodyLarge">No low stock alerts right now.</Text>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        paddingTop: 64
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    backButton: {
        marginRight: 12,
        padding: 4,
    },
    title: {
        fontWeight: 'bold',
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    alertCard: {
        marginBottom: 12,
        borderRadius: 12,
        elevation: 2
    },
    alertContent: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    iconContainer: {
        marginRight: 16,
        padding: 8,
        backgroundColor: '#f5f5f5',
        borderRadius: 8
    },
    textContainer: {
        flex: 1
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0'
    }
});

export default AlertsScreen;
