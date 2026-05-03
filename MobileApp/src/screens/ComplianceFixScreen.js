import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme, Button, Divider, Checkbox } from 'react-native-paper';
import { ArrowLeft, CheckCircle2, ListChecks, Move, ShoppingCart, Trash2 } from 'lucide-react-native';

const ComplianceFixScreen = ({ navigation, route }) => {
    const theme = useTheme();
    const { report } = route.params;

    const [checkedItems, setCheckedItems] = React.useState({});

    const toggleItem = (id) => {
        setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const actions = report.comparison.filter(c => c.deviation !== 0).map((c, idx) => ({
        id: `fix-${idx}`,
        sku: c.sku,
        productName: c.productName,
        type: c.deviation < 0 ? 'restock' : 'remove',
        count: Math.abs(c.deviation),
        level: c.levelIndex + 1
    }));

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text variant="headlineSmall" style={styles.headerTitle}>Restoration Steps</Text>
                    <Text variant="bodySmall" style={styles.headerSubtitle}>Follow these steps to reach 100% compliance</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.summaryCard}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{actions.length}</Text>
                        <Text style={styles.summaryLabel}>Total Actions</Text>
                    </View>
                    <Divider vertical style={styles.divider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{actions.filter(a => a.type === 'restock').length}</Text>
                        <Text style={styles.summaryLabel}>Restocks</Text>
                    </View>
                    <Divider vertical style={styles.divider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{actions.filter(a => a.type === 'remove').length}</Text>
                        <Text style={styles.summaryLabel}>Removals</Text>
                    </View>
                </View>

                {actions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <CheckCircle2 size={64} color="#2E7D32" />
                        <Text variant="titleMedium" style={{ marginTop: 16 }}>Everything is Perfect!</Text>
                        <Text variant="bodyMedium" style={{ opacity: 0.6, textAlign: 'center', marginTop: 8 }}>
                            The shelf is 100% compliant with the optimized planogram.
                        </Text>
                    </View>
                ) : (
                    actions.map((action) => (
                        <Card 
                            key={action.id} 
                            style={[
                                styles.card, 
                                checkedItems[action.id] && { opacity: 0.5, backgroundColor: '#f9f9f9' }
                            ]}
                            onPress={() => toggleItem(action.id)}
                        >
                            <Card.Content style={styles.cardContent}>
                                <View style={[
                                    styles.iconBox, 
                                    { backgroundColor: action.type === 'restock' ? '#E8F5E9' : '#FFEBEE' }
                                ]}>
                                    {action.type === 'restock' ? 
                                        <ShoppingCart size={24} color="#2E7D32" /> : 
                                        <Trash2 size={24} color="#C62828" />
                                    }
                                </View>
                                
                                <View style={styles.infoBox}>
                                    <Text variant="labelSmall" style={{ 
                                        color: action.type === 'restock' ? '#2E7D32' : '#C62828',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase'
                                    }}>
                                        {action.type === 'restock' ? 'Restock' : 'Remove'} • Level {action.level}
                                    </Text>
                                    <Text variant="titleMedium" style={styles.productName}>{action.productName}</Text>
                                    <Text variant="bodySmall">Qty: {action.count} units</Text>
                                </View>

                                <Checkbox
                                    status={checkedItems[action.id] ? 'checked' : 'unchecked'}
                                    onPress={() => toggleItem(action.id)}
                                    color={theme.colors.primary}
                                />
                            </Card.Content>
                        </Card>
                    ))
                )}
            </ScrollView>

            <View style={styles.footer}>
                <Button 
                    mode="contained" 
                    style={styles.doneBtn}
                    onPress={() => navigation.goBack()}
                >
                    Finish Tasks
                </Button>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingTop: 60,
        paddingBottom: 24,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    backBtn: { marginRight: 16 },
    headerTitle: { color: '#fff', fontWeight: 'bold' },
    headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
    content: { padding: 20, paddingBottom: 100 },
    summaryCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        elevation: 2,
        alignItems: 'center'
    },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    summaryLabel: { fontSize: 12, opacity: 0.5 },
    divider: { height: 30, width: 1, backgroundColor: '#eee' },
    card: { marginBottom: 12, borderRadius: 12 },
    cardContent: { flexDirection: 'row', alignItems: 'center' },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    infoBox: { flex: 1 },
    productName: { fontWeight: 'bold' },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee'
    },
    doneBtn: { borderRadius: 12 }
});

export default ComplianceFixScreen;
