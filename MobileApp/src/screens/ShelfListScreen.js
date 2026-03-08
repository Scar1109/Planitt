import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, FAB, Card, List, useTheme, IconButton, Searchbar } from 'react-native-paper';
import { Layers, Plus, Search } from 'lucide-react-native';

// Placeholder data
const initialShelves = [
    { id: '1', name: 'Aisle 1 - Cereals', levels: 4, dimensions: '120x60x200 cm' },
    { id: '2', name: 'Aisle 2 - Snacks', levels: 5, dimensions: '120x60x220 cm' },
    { id: '3', name: 'Endcap - Promo', levels: 3, dimensions: '80x40x150 cm' },
];

const ShelfListScreen = ({ navigation }) => {
    const theme = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [shelves, setShelves] = useState(initialShelves);

    const filteredShelves = shelves.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const renderItem = ({ item }) => (
        <Card
            style={styles.card}
            onPress={() => navigation.navigate('ShelfDetail', { shelfId: item.id, shelfData: item })}
        >
            <Card.Content style={styles.cardContent}>
                <View style={styles.cardIcon}>
                    <Layers size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.cardText}>
                    <Text variant="titleMedium" style={styles.itemName}>{item.name}</Text>
                    <Text variant="bodySmall" style={styles.itemMeta}>{item.levels} Levels • {item.dimensions}</Text>
                </View>
                <IconButton icon="chevron-right" iconColor={theme.colors.outline} size={20} />
            </Card.Content>
        </Card>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <Text variant="headlineMedium" style={styles.headerTitle}>Shelves & Layout</Text>
                <Searchbar
                    placeholder="Search shelves..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchBar}
                    icon={() => <Search size={20} color={theme.colors.outline} />}
                />
            </View>

            <FlatList
                data={filteredShelves}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32, opacity: 0.5 }}>No shelves found.</Text>}
            />

            <FAB
                icon={() => <Plus size={24} color="#fff" />}
                style={[styles.fab, { backgroundColor: theme.colors.secondary }]}
                onPress={() => navigation.navigate('ShelfDetail', {})}
                label="Add Shelf"
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
        padding: 16,
        paddingTop: 64,
        paddingBottom: 32,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTitle: {
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 16,
    },
    searchBar: {
        elevation: 0,
        borderRadius: 12,
    },
    listContainer: {
        padding: 16,
        paddingBottom: 100, // padding for FAB
    },
    card: {
        marginBottom: 12,
        elevation: 1,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardIcon: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardText: {
        flex: 1,
    },
    itemName: {
        fontWeight: 'bold',
    },
    itemMeta: {
        opacity: 0.6,
        marginTop: 4,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        borderRadius: 16,
    },
});

export default ShelfListScreen;
