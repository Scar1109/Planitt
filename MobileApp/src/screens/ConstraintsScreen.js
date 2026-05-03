import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme, Searchbar, Switch, FAB } from 'react-native-paper';
import { ShieldAlert, ChevronRight } from 'lucide-react-native';
import { jwtToken } from '../utils/auth';
import { getApiUrl } from '../utils/config';

const ConstraintsScreen = ({ navigation }) => {
    const theme = useTheme();
    const [constraints, setConstraints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchConstraints = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${getApiUrl()}/api/constraints`, {
                headers: { 'Authorization': `Bearer ${jwtToken}` }
            });
            if (response.ok) {
                const result = await response.json();
                console.log('Constraints API Result:', JSON.stringify(result));
                // Match the res.data.data pattern seen in the web frontend
                const list = result.data || (Array.isArray(result) ? result : []);
                console.log('Processed constraints list length:', list.length);
                setConstraints(list);
            } else {
                console.log('Constraints API failed status:', response.status);
            }
        } catch (error) {
            console.log("Error fetching constraints", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', fetchConstraints);
        fetchConstraints();
        return unsubscribe;
    }, [navigation]);

    const toggleConstraintStatus = async (id, currentStatus) => {
        try {
            const response = await fetch(`${getApiUrl()}/api/constraints/${id}/toggle`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${jwtToken}` }
            });
            if (response.ok) {
                setConstraints(prev => prev.map(c => c._id === id ? { ...c, isActive: !currentStatus } : c));
            }
        } catch (error) {
            console.log("Error toggling constraint", error);
        }
    };

    const filteredConstraints = (Array.isArray(constraints) ? constraints : []).filter(c => 
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (c.ruleType || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }) => (
        <Card style={[styles.card, !item.isActive && { opacity: 0.7 }]} onPress={() => navigation.navigate('ConstraintDetail', { constraint: item })}>
            <Card.Content style={styles.cardContent}>
                <View style={[styles.iconContainer, { backgroundColor: item.hardConstraint ? theme.colors.error + '20' : theme.colors.primary + '20' }]}>
                    <ShieldAlert size={24} color={item.hardConstraint ? theme.colors.error : theme.colors.primary} />
                </View>
                <View style={styles.infoContainer}>
                    <Text variant="titleMedium" style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                        {item.ruleType} • {item.scope.toUpperCase()}
                    </Text>
                    <Text variant="labelSmall" style={{ color: item.hardConstraint ? theme.colors.error : theme.colors.primary, marginTop: 4 }}>
                        {item.hardConstraint ? 'Hard Constraint' : `Soft Constraint (Weight: ${item.penaltyWeight || 0})`}
                    </Text>
                </View>
                <View style={styles.rightActions}>
                    <Switch 
                        value={item.isActive} 
                        onValueChange={() => toggleConstraintStatus(item._id, item.isActive)} 
                        color={theme.colors.primary} 
                        style={styles.switchBox}
                    />
                    <ChevronRight size={20} color={theme.colors.outline} />
                </View>
            </Card.Content>
        </Card>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <Text variant="headlineMedium" style={styles.headerTitle}>Constraints</Text>
                <Text variant="bodyLarge" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Manage planogram rules
                </Text>
            </View>

            <View style={styles.searchContainer}>
                <Searchbar
                    placeholder="Search constraints..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchBar}
                />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredConstraints}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={{ textAlign: 'center', marginTop: 32, opacity: 0.5 }}>
                            No constraints found.
                        </Text>
                    }
                />
            )}
            
            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color="#fff"
                onPress={() => navigation.navigate('ConstraintDetail', { constraint: null })}
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
    searchContainer: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    searchBar: {
        elevation: 2,
    },
    list: {
        padding: 16,
        paddingBottom: 100,
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
    name: {
        fontWeight: 'bold',
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    switchBox: {
        marginRight: 8,
        transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }]
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
        bottom: 0,
    },
});

export default ConstraintsScreen;
