import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme, Searchbar, FAB, Chip } from 'react-native-paper';
import { Package, ChevronRight } from 'lucide-react-native';
import { jwtToken } from '../utils/auth';
import { getApiUrl } from '../utils/config';

const ProductsScreen = ({ navigation }) => {
    const theme = useTheme();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${getApiUrl()}/api/products`, {
                headers: { 'Authorization': `Bearer ${jwtToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setProducts(data);
            }
        } catch (error) {
            console.log("Error fetching products", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', fetchProducts);
        fetchProducts();
        return unsubscribe;
    }, [navigation]);

    const filteredProducts = products.filter(p => 
        (p.productName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }) => (
        <Card style={styles.card} onPress={() => navigation.navigate('ProductDetail', { product: item })}>
            <Card.Content style={styles.cardContent}>
                <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Package size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.infoContainer}>
                    <Text variant="titleMedium" style={styles.productName} numberOfLines={1}>{item.productName}</Text>
                    <View style={styles.rowBetween}>
                        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>SKU: {item.sku || 'N/A'}</Text>
                        <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>Rs. {item.baseUnitPriceLKR || 0}</Text>
                    </View>
                    <View style={styles.chipRow}>
                        {item.brand ? <Chip style={styles.chip} textStyle={{fontSize: 10}} compact>{item.brand}</Chip> : null}
                        {item.category ? <Chip style={styles.chip} textStyle={{fontSize: 10}} compact>{item.category}</Chip> : null}
                    </View>
                </View>
                <ChevronRight size={20} color={theme.colors.outline} />
            </Card.Content>
        </Card>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <Text variant="headlineMedium" style={styles.headerTitle}>Products</Text>
                <Text variant="bodyLarge" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Manage store catalog
                </Text>
            </View>

            <View style={styles.searchContainer}>
                <Searchbar
                    placeholder="Search by name or SKU..."
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
                    data={filteredProducts}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={{ textAlign: 'center', marginTop: 32, opacity: 0.5 }}>
                            No products found.
                        </Text>
                    }
                />
            )}
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
    productName: {
        fontWeight: 'bold',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chipRow: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 6,
        flexWrap: 'wrap',
    },
    chip: {
        // removed strict height to prevent text clipping
        marginVertical: 2,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default ProductsScreen;
