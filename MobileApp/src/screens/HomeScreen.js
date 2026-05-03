import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { Text, Card, Title, useTheme } from 'react-native-paper';
import { Layers, LayoutDashboard, Bell, ClipboardList, BarChart3, ShoppingBag, ShieldAlert, Settings, User, CreditCard, Package, AlertTriangle } from 'lucide-react-native';
import Svg, { Polyline, Polygon } from 'react-native-svg';
import { jwtToken } from '../utils/auth';
import { getApiUrl, getMlApiUrl } from '../utils/config';

const MAX_LOW_STOCK_ALERTS = 10;

const HomeScreen = ({ navigation }) => {
    const theme = useTheme();
    const [lowStockCount, setLowStockCount] = useState(0);
    const [smartBundlesCount, setSmartBundlesCount] = useState(0);
    const [smartBundles, setSmartBundles] = useState([]);
    const [demandForecast, setDemandForecast] = useState([20, 25, 22, 30, 28, 35, 32]); 
    const [refreshing, setRefreshing] = useState(false);

    const fetchDashboardData = async () => {
        try {
            // Fetch Low Stock Alerts
            const lowStockRes = await fetch(`${getApiUrl()}/api/inventory/low-stock-alerts?limit=${MAX_LOW_STOCK_ALERTS}`, {
                headers: { 'Authorization': `Bearer ${jwtToken}` }
            });
            if (lowStockRes.ok) {
                const data = await lowStockRes.json();
                const alertCount = data.totalLowStock || data.alerts?.length || 0;
                setLowStockCount(Math.min(alertCount, MAX_LOW_STOCK_ALERTS));
            }

            // Fetch Smart Bundles
            const wastageRes = await fetch(`${getApiUrl()}/api/wastage/dashboard/STORE-001`, {
                headers: { 'Authorization': `Bearer ${jwtToken}` }
            });
            if (wastageRes.ok) {
                const responseJson = await wastageRes.json();
                console.log('Wastage API Response:', JSON.stringify(responseJson).substring(0, 500));
                const data = responseJson.data; 
                if (data && data.bundleSuggestions) {
                    console.log('Bundles found:', data.bundleSuggestions.length);
                    setSmartBundlesCount(data.bundleSuggestions.length);
                    setSmartBundles(data.bundleSuggestions);
                } else {
                    console.log('No bundle suggestions in data object');
                }
            } else {
                console.log('Wastage API failed with status:', wastageRes.status);
            }

            // Fetch Demand Forecast
            const forecastRes = await fetch(`${getMlApiUrl()}/api/v1/forecast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: 'default',
                    store_id: 'STORE-001',
                    horizon_days: 7,
                    include_weather: true
                })
            });
            if (forecastRes.ok) {
                const data = await forecastRes.json();
                if (data.forecasts && data.forecasts.length > 0) {
                    setDemandForecast(data.forecasts.map(f => f.forecast));
                }
            }
        } catch (error) {
            console.log("Error fetching dashboard data", error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardData().finally(() => setRefreshing(false));
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchDashboardData();
        });

        fetchDashboardData();
        return unsubscribe;
    }, [navigation]);

    const QuickActionBtn = ({ icon: Icon, label, route }) => (
        <TouchableOpacity style={styles.quickActionBox} onPress={() => route && navigation.navigate(route)}>
            <View style={[styles.quickActionIcon, { borderColor: theme.colors.outlineVariant, borderWidth: 1 }]}>
                <Icon size={28} color={theme.colors.primary} />
            </View>
            <Text variant="labelSmall" style={styles.quickActionLabel}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <ScrollView 
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            <View style={styles.header}>
                <View>
                    <Text variant="headlineSmall" style={styles.greeting}>Welcome back!</Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>Here's your store overview</Text>
                </View>
                <View style={styles.dateBadge}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                </View>
            </View>

            <View style={styles.content}>
                {/* Tasks and Alerts */}
                <View style={styles.rowCards}>
                    <Card style={[styles.halfCard, { elevation: 1 }]} onPress={() => navigation.navigate('Alerts')}>
                        <Card.Content>
                            <Text variant="labelMedium" style={styles.cardTitle}>Alerts</Text>
                            <View style={styles.cardInner}>
                                <View style={[styles.iconCircle, { backgroundColor: theme.colors.error + '15' }]}>
                                    <Bell size={24} color={theme.colors.error} />
                                </View>
                                <View style={styles.cardValueBox}>
                                    <Text variant="headlineMedium" style={[styles.cardValue, { color: theme.colors.error }]}>{lowStockCount}</Text>
                                    <Text variant="labelSmall" style={styles.cardSubText}>Low Stock</Text>
                                </View>
                            </View>
                        </Card.Content>
                    </Card>

                    <Card style={[styles.halfCard, { elevation: 1 }]}>
                        <Card.Content>
                            <Text variant="labelMedium" style={styles.cardTitle}>Bundles</Text>
                            <View style={styles.cardInner}>
                                <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '15' }]}>
                                    <Package size={24} color={theme.colors.primary} />
                                </View>
                                <View style={styles.cardValueBox}>
                                    <Text variant="headlineMedium" style={[styles.cardValue, { color: theme.colors.primary }]}>{smartBundlesCount}</Text>
                                    <Text variant="labelSmall" style={styles.cardSubText}>Suggested</Text>
                                </View>
                            </View>
                        </Card.Content>
                    </Card>
                </View>



                {/* Quick Actions */}
                <View style={styles.quickActionsSection}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActionsRow}>
                        <QuickActionBtn icon={LayoutDashboard} label="Planograms" route="Planograms" />
                        <QuickActionBtn icon={BarChart3} label="Reports" route="Reports" />
                        <QuickActionBtn icon={ShoppingBag} label="Products" route="Products" />
                        <QuickActionBtn icon={ShieldAlert} label="Constraints" route="Constraints" />
                    </View>
                    <View style={[styles.quickActionsRow, { marginTop: 16 }]}>
                        <QuickActionBtn icon={Layers} label="Shelves" route="Shelves" />
                        <QuickActionBtn icon={User} label="Profile" route="Profile" />
                        <QuickActionBtn icon={ClipboardList} label="Compliance" route="Compliance" />
                        <QuickActionBtn icon={AlertTriangle} label="Low Stock" route="Alerts" />
                    </View>
                </View>

                {/* Smart Bundle Suggestions Section */}
                <View style={styles.quickActionsSection}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Smart Bundle Suggestions</Text>
                    {console.log('Rendering smartBundles, count:', smartBundles.length)}
                    {smartBundles.length > 0 ? (
                        smartBundles.map((bundle, index) => (
                            <Card key={index} style={[styles.bundleCard, { elevation: 1 }]}>
                                <Card.Content>
                                    <View style={styles.bundleHeader}>
                                        <View style={styles.bundleIconWrapper}>
                                            <Package size={20} color={theme.colors.primary} />
                                        </View>
                                        <Text variant="labelLarge" style={styles.bundleName}>{bundle.items && bundle.items.length > 0 ? `Bundle: ${bundle.items.map(i => i.name).join(' + ')}` : `Bundle ${index + 1}`}</Text>
                                    </View>
                                    <View style={styles.bundleItems}>
                                        {bundle.items?.map((item, idx) => (
                                            <Text key={idx} variant="bodySmall" style={styles.bundleItemText}>
                                                • {item.name || item.sku}
                                            </Text>
                                        ))}
                                    </View>
                                    <View style={styles.bundleFooter}>
                                        <Text variant="labelMedium" style={{ color: theme.colors.success, fontWeight: 'bold' }}>
                                            Save {bundle.savingsPercent || 0}%
                                        </Text>
                                        <Text variant="bodySmall" style={{ color: theme.colors.outline, textDecorationLine: 'line-through' }}>
                                            LKR {bundle.originalTotal}
                                        </Text>
                                        <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                                            LKR {bundle.bundlePrice}
                                        </Text>
                                    </View>
                                </Card.Content>
                            </Card>
                        ))
                    ) : (
                        <Text variant="bodyMedium" style={{ color: theme.colors.outline, textAlign: 'center', marginVertical: 16 }}>
                            No bundle suggestions available right now.
                        </Text>
                    )}
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 24,
        paddingTop: 64,
        paddingBottom: 16,
    },
    greeting: { fontWeight: 'bold' },
    dateBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    content: { paddingHorizontal: 20 },
    complianceCard: {
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 4,
    },
    complianceContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 24,
    },
    complianceLeft: { flex: 1 },
    progressBarContainer: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 3,
        marginTop: 16,
        width: '90%',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#06D6A0',
        borderRadius: 3,
    },
    complianceRight: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    circleImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    rowCards: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    halfCard: {
        width: '48%',
        borderRadius: 16,
    },
    cardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    },
    cardTitle: { fontWeight: 'bold' },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardValueBox: { alignItems: 'center' },
    cardValue: { fontWeight: 'bold' },
    cardSubText: { opacity: 0.6 },
    salesCard: { borderRadius: 16, marginBottom: 24 },
    salesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dropdownBtn: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    fakeGraph: {
        height: 60,
        width: '100%',
        marginTop: 8,
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    graphLine: {
        width: '100%',
        height: '50%',
        borderBottomWidth: 3,
        borderTopRightRadius: 100,
        borderTopLeftRadius: 10,
    },
    quickActionsSection: { marginBottom: 40 },
    sectionTitle: { fontWeight: 'bold', marginBottom: 16 },
    quickActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    quickActionBox: { alignItems: 'center', width: '22%' },
    quickActionIcon: {
        width: 60,
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        backgroundColor: '#fff',
        elevation: 1,
    },
    quickActionLabel: {
        fontSize: 11,
        textAlign: 'center',
        fontWeight: '500',
    },
    bundleCard: {
        borderRadius: 12,
        marginBottom: 12,
    },
    bundleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    bundleIconWrapper: {
        marginRight: 8,
        backgroundColor: '#f0f4f8',
        padding: 6,
        borderRadius: 8,
    },
    bundleName: {
        fontWeight: 'bold',
        flex: 1,
    },
    bundleItems: {
        marginBottom: 12,
        paddingLeft: 4,
    },
    bundleItemText: {
        color: '#555',
        marginBottom: 2,
    },
    bundleFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 8,
    }
});

export default HomeScreen;
