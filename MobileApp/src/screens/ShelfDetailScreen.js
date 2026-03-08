import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, Card, IconButton, Divider } from 'react-native-paper';
import { Ruler, Plus, Trash2, ArrowLeft, Camera } from 'lucide-react-native';

const ShelfDetailScreen = ({ route, navigation }) => {
    const theme = useTheme();
    // If shelfData is passed, we're editing. If undef, we're adding.
    const isEditing = !!route.params?.shelfData;
    const initialData = route.params?.shelfData || { name: '', length: '', width: '', height: '', levels: [] };

    const [name, setName] = useState(initialData.name);
    const [length, setLength] = useState(initialData.length || '120');
    const [width, setWidth] = useState(initialData.width || '60');
    const [height, setHeight] = useState(initialData.height || '200');
    const [levels, setLevels] = useState(
        initialData.levels.length > 0
            ? initialData.levels // if this was full object array
            : [{ id: '1', heightFromBase: '20' }, { id: '2', heightFromBase: '60' }, { id: '3', heightFromBase: '100' }]
    );

    const handleSave = () => {
        // Basic validation
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a shelf name.');
            return;
        }
        Alert.alert('Success', `Shelf ${isEditing ? 'updated' : 'created'} successfully!`);
        navigation.goBack();
    };

    const handleLaunchAR = () => {
        // Navigate to AR screen with callback
        navigation.navigate('ARMeasure', {
            onMeasureComplete: (measurements) => {
                if (measurements.length) setLength(measurements.length.toString());
                if (measurements.width) setWidth(measurements.width.toString());
                if (measurements.height) setHeight(measurements.height.toString());
            }
        });
    };

    const adbLevel = () => {
        setLevels([...levels, { id: Date.now().toString(), heightFromBase: '' }]);
    };

    const removeLevel = (id) => {
        setLevels(levels.filter(l => l.id !== id));
    };

    const updateLevel = (id, value) => {
        setLevels(levels.map(l => l.id === id ? { ...l, heightFromBase: value } : l));
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text variant="headlineSmall" style={styles.title}>
                    {isEditing ? 'Edit Shelf' : 'New Shelf'}
                </Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Card style={styles.card}>
                    <Card.Content style={styles.cardContent}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>General Info</Text>
                        <TextInput
                            label="Shelf Name/Identifier"
                            value={name}
                            onChangeText={setName}
                            mode="outlined"
                            style={styles.input}
                        />
                    </Card.Content>
                </Card>

                <Card style={styles.card}>
                    <Card.Content style={styles.cardContent}>
                        <View style={styles.sectionHeader}>
                            <Text variant="titleMedium" style={styles.sectionTitle}>Dimensions (cm)</Text>
                            <Button
                                mode="text"
                                icon={() => <Camera size={16} color={theme.colors.primary} />}
                                onPress={handleLaunchAR}
                                compact
                            >
                                AR Measure
                            </Button>
                        </View>

                        <View style={styles.dimensionsRow}>
                            <TextInput
                                label="Length"
                                value={length}
                                onChangeText={setLength}
                                mode="outlined"
                                keyboardType="numeric"
                                style={[styles.input, styles.dimInput]}
                            />
                            <TextInput
                                label="Width"
                                value={width}
                                onChangeText={setWidth}
                                mode="outlined"
                                keyboardType="numeric"
                                style={[styles.input, styles.dimInput]}
                            />
                            <TextInput
                                label="Height"
                                value={height}
                                onChangeText={setHeight}
                                mode="outlined"
                                keyboardType="numeric"
                                style={[styles.input, styles.dimInput]}
                            />
                        </View>
                    </Card.Content>
                </Card>

                <Card style={styles.card}>
                    <Card.Content style={styles.cardContent}>
                        <View style={styles.sectionHeader}>
                            <Text variant="titleMedium" style={styles.sectionTitle}>
                                Shelf Levels ({levels.length})
                            </Text>
                            <Button mode="text" onPress={adbLevel} icon={() => <Plus size={16} color={theme.colors.primary} />} compact>
                                Add Level
                            </Button>
                        </View>

                        {levels.map((level, index) => (
                            <View key={level.id} style={styles.levelRow}>
                                <View style={[styles.levelBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
                                    <Text variant="labelMedium" style={{ color: theme.colors.primary }}>{index + 1}</Text>
                                </View>
                                <TextInput
                                    label="Height from base (cm)"
                                    value={level.heightFromBase}
                                    onChangeText={(val) => updateLevel(level.id, val)}
                                    mode="outlined"
                                    keyboardType="numeric"
                                    style={styles.levelInput}
                                />
                                <IconButton
                                    icon={() => <Trash2 size={20} color={theme.colors.error} />}
                                    onPress={() => removeLevel(level.id)}
                                    style={styles.deleteButton}
                                />
                            </View>
                        ))}
                    </Card.Content>
                </Card>
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.surfaceVariant }]}>
                <Button mode="contained" onPress={handleSave} style={styles.saveButton} contentStyle={styles.saveContent}>
                    Save Shelf
                </Button>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 54, // Safe area approx
        paddingBottom: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    title: {
        color: '#fff',
        fontWeight: 'bold',
    },
    headerRight: {
        width: 40, // Match back button width for centering
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        marginBottom: 16,
        elevation: 1,
        backgroundColor: '#fff',
    },
    cardContent: {
        padding: 16,
    },
    sectionTitle: {
        fontWeight: 'bold',
        marginBottom: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    input: {
        backgroundColor: 'transparent',
        marginBottom: 12,
    },
    dimensionsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    dimInput: {
        flex: 1,
    },
    levelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    levelBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    levelInput: {
        flex: 1,
        backgroundColor: 'transparent',
        height: 48,
    },
    deleteButton: {
        marginLeft: 8,
    },
    footer: {
        padding: 16,
        paddingBottom: 32, // Safe area bottom approx
        borderTopWidth: 1,
    },
    saveButton: {
        borderRadius: 8,
    },
    saveContent: {
        paddingVertical: 8,
    }
});

export default ShelfDetailScreen;
