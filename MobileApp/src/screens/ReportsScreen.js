import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Card, useTheme, Button, Menu } from 'react-native-paper';
import { ArrowLeft, TrendingUp, CalendarDays, AlertTriangle, Package, Layers, ShoppingBag, Leaf } from 'lucide-react-native';
import Svg, { Polyline, Circle, Rect, G, Text as SvgText } from 'react-native-svg';
import { jwtToken } from '../utils/auth';
import { getApiUrl, getMlApiUrl } from '../utils/config';

const ReportsScreen = ({ navigation }) => {
    const theme = useTheme();
    const [loading, setLoading] = useState(true);
    
    // Stats
    const [stats, setStats] = useState({
        salesCount: 0,
        activePlanograms: 0,
        alertCount: 0,
        lowStockCount: 0,
        allProductCount: 0,
        shelfsCount: 0
    });

    // Products & Dropdown
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [menuVisible, setMenuVisible] = useState(false);

    // Forecasting
    const [demandData, setDemandData] = useState({ history: [], forecast: [] });

    // Wastage
    const [expiryTimeline, setExpiryTimeline] = useState([]);
    const [categoryBreakdown, setCategoryBreakdown] = useState([]);
    const [wastageTrend, setWastageTrend] = useState([]);

    useEffect(() => {
        fetchAllData();
    }, []);

    useEffect(() => {
        if (selectedProduct) {
            fetchDemandForecast(selectedProduct);
        }
    }, [selectedProduct]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const storeId = 'STORE-001';
            let newStats = { ...stats };
            
            // 1. Fetch Products
            try {
                const productsRes = await fetch(`${getApiUrl()}/api/products`, { headers: { 'Authorization': `Bearer ${jwtToken}` } });
                if (productsRes.ok) {
                    const data = await productsRes.json();
                    const prodList = data.data || data;
                    if (Array.isArray(prodList) && prodList.length > 0) {
                        setProducts(prodList);
                        setSelectedProduct(prodList[0].sku);
                    }
                }
            } catch (e) { console.log('Products error', e); }

            // 2. Fetch Shelves
            try {
                const shelvesRes = await fetch(`${getApiUrl()}/api/planograms/shelves?storeId=6956357610ec0ab348888893`, { headers: { 'Authorization': `Bearer ${jwtToken}` } });
                if (shelvesRes.ok) {
                    const data = await shelvesRes.json();
                    if (data.data) newStats.shelfsCount = data.data.length;
                    else if (Array.isArray(data)) newStats.shelfsCount = data.length;
                }
            } catch (e) { console.log('Shelves error', e); }

            // 3. Fetch Inventory Summary (Sales Count & Products)
            try {
                const summaryRes = await fetch(`${getApiUrl()}/api/inventory/summary`, { headers: { 'Authorization': `Bearer ${jwtToken}` } });
                if (summaryRes.ok) {
                    const data = await summaryRes.json();
                    if (data.summary) {
                        newStats.salesCount = data.summary.totalSold || 0;
                        newStats.allProductCount = data.summary.totalProducts || 0;
                    }
                }
            } catch (e) { console.log('Summary error', e); }

            // 4. Fetch Dashboard KPIs (Planograms, Low Stock, Alerts)
            try {
                const kpiRes = await fetch(`${getApiUrl()}/api/inventory/dashboard-kpis`, { headers: { 'Authorization': `Bearer ${jwtToken}` } });
                if (kpiRes.ok) {
                    const data = await kpiRes.json();
                    if (data.data) {
                        newStats.activePlanograms = data.data.activePlanograms || 0;
                        newStats.lowStockCount = data.data.lowStockCount || 0;
                        newStats.alertCount = (data.data.lowStockCount || 0) + (data.data.modules?.compliance?.violations || 0);
                    }
                }
            } catch (e) { console.log('KPI error', e); }

            setStats(newStats);

            // 5. Fetch Wastage
            try {
                const wastageRes = await fetch(`${getApiUrl()}/api/wastage/dashboard/${storeId}`, { headers: { 'Authorization': `Bearer ${jwtToken}` } });
                if (wastageRes.ok) {
                    const resJson = await wastageRes.json();
                    const data = resJson.data || resJson;
                    if (data.expiryTimeline) setExpiryTimeline(data.expiryTimeline);
                    if (data.categoryBreakdown) setCategoryBreakdown(data.categoryBreakdown);
                    if (data.historicalWastageTrend) setWastageTrend(data.historicalWastageTrend);
                }
            } catch (e) { console.log('Wastage error', e); }

        } catch (error) {
            console.log("Error fetching report data", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDemandForecast = async (productId) => {
        try {
            const storeId = 'STORE-001';
            const forecastRes = await fetch(`${getMlApiUrl()}/api/v1/forecast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: productId, store_id: storeId, horizon_days: 28, include_weather: true })
            });
            if (forecastRes.ok) {
                const data = await forecastRes.json();
                
                let histData = [];
                if (data.history) {
                    histData = data.history.map(h => ({ date: h.date, value: Math.round(h.actual_demand || h.sales || 0) }));
                }
                
                let fcastData = [];
                if (data.forecasts) {
                    fcastData = data.forecasts.map(f => ({ date: f.date, value: Math.round(f.forecast) }));
                }
                
                setDemandData({ history: histData, forecast: fcastData });
            } else {
                setDemandData({ history: [], forecast: [] });
            }
        } catch (e) { 
            console.log('Forecast error', e); 
            setDemandData({ history: [], forecast: [] });
        }
    };

    const StatCard = ({ icon: Icon, title, value, color, bgColor }) => (
        <Card style={[styles.statCard, { backgroundColor: '#fff', elevation: 1 }]}>
            <Card.Content style={styles.statContent}>
                <View style={[styles.statIconWrapper, { backgroundColor: bgColor }]}>
                    <Icon size={20} color={color} />
                </View>
                <View style={styles.statTexts}>
                    <Text variant="labelSmall" style={styles.statTitle}>{title}</Text>
                    <Text variant="headlineSmall" style={[styles.statValue, { color }]}>{value}</Text>
                </View>
            </Card.Content>
        </Card>
    );

    const renderLineChart = () => {
        const { history = [], forecast = [] } = demandData;
        if (history.length === 0 && forecast.length === 0) return <Text style={styles.emptyText}>No forecast data available</Text>;
        
        const allVals = [...history.map(d=>d.value), ...forecast.map(d=>d.value)];
        const maxVal = Math.max(...allVals, 10);
        const height = 180;
        const width = 300;
        const padding = 20;
        
        const totalPoints = history.length + forecast.length;
        
        const getX = (i) => padding + (i * ((width - padding * 2) / (totalPoints - 1 || 1)));
        const getY = (val) => height - padding - ((val / maxVal) * (height - padding * 2));
        
        const histPoints = history.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');
        const fcastPoints = forecast.map((d, i) => `${getX(i + history.length)},${getY(d.value)}`).join(' ');

        // Connect the last history point to the first forecast point if both exist
        let connectionLine = null;
        if (history.length > 0 && forecast.length > 0) {
            const lastHistX = getX(history.length - 1);
            const lastHistY = getY(history[history.length - 1].value);
            const firstFcastX = getX(history.length);
            const firstFcastY = getY(forecast[0].value);
            connectionLine = <Polyline points={`${lastHistX},${lastHistY} ${firstFcastX},${firstFcastY}`} fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="5, 5" />;
        }

        return (
            <View style={{ alignItems: 'center', marginTop: 10 }}>
                <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 10}}>
                    <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 15}}>
                        <View style={{width: 10, height: 10, backgroundColor: '#8b5cf6', borderRadius: 5, marginRight: 5}}/>
                        <Text variant="labelSmall">Actual</Text>
                    </View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <View style={{width: 10, height: 10, backgroundColor: '#10b981', borderRadius: 5, marginRight: 5}}/>
                        <Text variant="labelSmall">Forecast</Text>
                    </View>
                </View>
                <Svg height={height} width={width}>
                    {histPoints.length > 0 && <Polyline points={histPoints} fill="none" stroke="#8b5cf6" strokeWidth="3" />}
                    {connectionLine}
                    {fcastPoints.length > 0 && <Polyline points={fcastPoints} fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="5, 5" />}
                    
                    {history.map((d, i) => <Circle key={`h-${i}`} cx={getX(i)} cy={getY(d.value)} r="3" fill="#8b5cf6" />)}
                    {forecast.map((d, i) => <Circle key={`f-${i}`} cx={getX(i + history.length)} cy={getY(d.value)} r="3" fill="#10b981" />)}
                </Svg>
            </View>
        );
    };

    const renderBarChart = (data, valueKey, labelKey, accentColor) => {
        if (!data || data.length === 0) return <Text style={styles.emptyText}>No data available</Text>;
        const maxVal = Math.max(...data.map(d => d[valueKey] || 0), 10);
        const height = 120;
        const width = 300;
        const padding = 20;
        const barWidth = 20;

        return (
            <View style={{ alignItems: 'center', marginTop: 10 }}>
                <Svg height={height} width={width}>
                    {data.map((d, i) => {
                        const x = padding + (i * ((width - padding * 2) / (data.length || 1)));
                        const val = d[valueKey] || 0;
                        const h = (val / maxVal) * (height - padding * 2);
                        const y = height - padding - h;
                        return (
                            <G key={i}>
                                <Rect x={x} y={y} width={barWidth} height={h} fill={accentColor} rx={4} />
                                <SvgText x={x + barWidth/2} y={height - 5} fontSize="10" fill="#64748b" textAnchor="middle">
                                    {d[labelKey]?.substring(0,3)}
                                </SvgText>
                            </G>
                        );
                    })}
                </Svg>
            </View>
        );
    };

    const renderDonutChart = (data) => {
        if (!data || data.length === 0) return <Text style={styles.emptyText}>No category data</Text>;
        return (
            <View style={styles.categoryList}>
                {data.map((cat, i) => (
                    <View key={i} style={styles.categoryRow}>
                        <View style={styles.categoryInfo}>
                            <View style={[styles.categoryDot, { backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e'][i % 4] }]} />
                            <Text variant="labelMedium" style={{ color: theme.colors.onSurface }}>{cat.name}</Text>
                        </View>
                        <Text variant="labelMedium" style={{ fontWeight: 'bold' }}>{cat.value} items</Text>
                    </View>
                ))}
            </View>
        );
    };

    const getSelectedProductName = () => {
        if (!selectedProduct) return "Select Product";
        const prod = products.find(p => p.sku === selectedProduct);
        return prod ? (prod.productName || prod.sku) : selectedProduct;
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={theme.colors.onSurface} />
                </TouchableOpacity>
                <Text variant="titleLarge" style={styles.headerTitle}>Store Reports</Text>
            </View>

            {loading ? (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={{ marginTop: 10, color: theme.colors.outline }}>Loading analytics...</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* KPI Cards */}
                    <View style={styles.kpiGrid}>
                        <StatCard icon={TrendingUp} title="Sales Count" value={stats.salesCount} color="#10b981" bgColor="#d1fae5" />
                        <StatCard icon={Layers} title="Active Planograms" value={stats.activePlanograms} color="#3b82f6" bgColor="#dbeafe" />
                        <StatCard icon={Layers} title="Shelves" value={stats.shelfsCount} color="#06b6d4" bgColor="#cffafe" />
                        <StatCard icon={AlertTriangle} title="Alerts" value={stats.alertCount} color="#f59e0b" bgColor="#fef3c7" />
                        <StatCard icon={Package} title="Low Stock" value={stats.lowStockCount} color="#ef4444" bgColor="#fee2e2" />
                        <StatCard icon={ShoppingBag} title="All Products" value={stats.allProductCount} color="#8b5cf6" bgColor="#ede9fe" />
                    </View>

                    {/* Demand Forecasting Section */}
                    <Text variant="titleMedium" style={styles.sectionTitle}>Demand Forecasting</Text>
                    
                    <Card style={styles.card}>
                        <Card.Content>
                            <View style={styles.cardHeaderWithAction}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <TrendingUp size={18} color="#1B4F72" />
                                    <Text variant="titleSmall" style={{ marginLeft: 8, fontWeight: 'bold' }}>Demand Forecast (28 Days)</Text>
                                </View>
                                
                                <Menu
                                    visible={menuVisible}
                                    onDismiss={() => setMenuVisible(false)}
                                    anchor={
                                        <Button mode="outlined" onPress={() => setMenuVisible(true)} compact style={{ borderRadius: 8 }}>
                                            <Text style={{ fontSize: 10 }} numberOfLines={1}>{getSelectedProductName()}</Text>
                                        </Button>
                                    }
                                >
                                    {products.slice(0, 10).map((p) => (
                                        <Menu.Item 
                                            key={p.sku} 
                                            onPress={() => { setSelectedProduct(p.sku); setMenuVisible(false); }} 
                                            title={p.productName || p.sku} 
                                        />
                                    ))}
                                </Menu>
                            </View>
                            {renderLineChart()}
                        </Card.Content>
                    </Card>

                    {/* Wastage Prevention Section */}
                    <Text variant="titleMedium" style={styles.sectionTitle}>Wastage Prevention</Text>
                    
                    <Card style={styles.card}>
                        <Card.Content>
                            <View style={styles.cardHeader}>
                                <CalendarDays size={18} color="#17A2B8" />
                                <Text variant="titleSmall" style={{ marginLeft: 8, fontWeight: 'bold' }}>Expiry Timeline</Text>
                            </View>
                            {renderBarChart(expiryTimeline, 'value', 'period', '#17A2B8')}
                        </Card.Content>
                    </Card>

                    <Card style={styles.card}>
                        <Card.Content>
                            <View style={styles.cardHeader}>
                                <Layers size={16} color="#17A2B8" />
                                <Text variant="labelMedium" style={{ marginLeft: 6, fontWeight: 'bold' }}>Risk by Category</Text>
                            </View>
                            {renderDonutChart(categoryBreakdown)}
                        </Card.Content>
                    </Card>

                    <Card style={styles.card}>
                        <Card.Content>
                            <View style={styles.cardHeader}>
                                <Leaf size={16} color="#10b981" />
                                <Text variant="labelMedium" style={{ marginLeft: 6, fontWeight: 'bold' }}>Wastage Trend</Text>
                            </View>
                            {renderBarChart(wastageTrend, 'value', 'month', '#ef4444')}
                        </Card.Content>
                    </Card>

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: '#fff',
        elevation: 2,
    },
    backButton: { marginRight: 16 },
    headerTitle: { fontWeight: 'bold' },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 16 },
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statCard: {
        width: '48%',
        marginBottom: 12,
        borderRadius: 12,
    },
    statContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    statIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    statTexts: { flex: 1 },
    statTitle: { color: '#64748b', fontSize: 11 },
    statValue: { fontWeight: 'bold', marginTop: 2, fontSize: 18 },
    sectionTitle: {
        fontWeight: 'bold',
        marginBottom: 12,
        marginTop: 8,
        color: '#334155'
    },
    card: {
        marginBottom: 16,
        backgroundColor: '#fff',
        elevation: 1,
        borderRadius: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    cardHeaderWithAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    emptyText: {
        textAlign: 'center',
        color: '#94a3b8',
        marginVertical: 20,
        fontSize: 12,
    },
    categoryList: { marginTop: 8 },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    categoryInfo: { flexDirection: 'row', alignItems: 'center' },
    categoryDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
});

export default ReportsScreen;
