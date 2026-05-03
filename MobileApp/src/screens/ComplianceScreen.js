import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Text, Card, useTheme, FAB } from 'react-native-paper';
import { ClipboardList, Plus } from 'lucide-react-native';
import { jwtToken } from '../utils/auth';
import { getApiUrl } from '../utils/config';

const ComplianceScreen = ({ navigation }) => {
    const theme = useTheme();
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchComplianceRuns = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${getApiUrl()}/api/compliance/runs`, {
                headers: { 'Authorization': `Bearer ${jwtToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRuns(data);
            }
        } catch (error) {
            console.log("Error fetching compliance runs", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', fetchComplianceRuns);
        fetchComplianceRuns();
        return unsubscribe;
    }, [navigation]);

    const renderItem = ({ item }) => (
        <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
                <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                    <ClipboardList size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.infoContainer}>
                    <Text variant="titleMedium" style={styles.title}>Run ID: {item._id?.slice(-6) || 'Unknown'}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                        Date: {new Date(item.createdAt || item.date).toLocaleDateString()}
                    </Text>
                </View>
                <View style={styles.scoreContainer}>
                    <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                        {item.compliance_score ? `${Math.round(item.compliance_score)}%` : 'N/A'}
                    </Text>
                </View>
            </Card.Content>
        </Card>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <Text variant="headlineMedium" style={styles.headerTitle}>Compliance</Text>
                <Text variant="bodyLarge" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Planogram Compliance Runs
                </Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={runs}
                    keyExtractor={(item, index) => item._id || index.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={{ textAlign: 'center', marginTop: 32, opacity: 0.5 }}>
                            No compliance runs found.
                        </Text>
                    }
                />
            )}

            <FAB
                icon={() => <Plus size={24} color="#fff" />}
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('ShelfCompliance')}
                label="New Shelf Audit"
                color="#fff"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 24,
        paddingTop: 64,
        paddingBottom: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        marginBottom: 16,
    },
    headerTitle: {
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    list: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        marginBottom: 12,
        elevation: 1,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    infoContainer: {
        flex: 1,
    },
    title: {
        fontWeight: 'bold',
    },
    scoreContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 16,
        borderRadius: 16,
    },
});

export default ComplianceScreen;
