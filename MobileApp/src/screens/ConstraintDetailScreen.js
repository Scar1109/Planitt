import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, Switch, SegmentedButtons } from 'react-native-paper';
import { jwtToken } from '../utils/auth';
import { getApiUrl } from '../utils/config';

const ConstraintDetailScreen = ({ route, navigation }) => {
    const { constraint } = route.params;
    const isNew = !constraint;
    const theme = useTheme();

    const [name, setName] = useState(constraint?.name || '');
    const [ruleType, setRuleType] = useState(constraint?.ruleType || 'adjacency_required');
    const [scope, setScope] = useState(constraint?.scope || 'brand');
    const [hardConstraint, setHardConstraint] = useState(constraint?.hardConstraint !== false);
    const [penaltyWeight, setPenaltyWeight] = useState(constraint?.penaltyWeight?.toString() || '10');
    
    // Target parameters depending on scope
    const [targetSku, setTargetSku] = useState(constraint?.targetSku || '');
    const [targetBrand, setTargetBrand] = useState(constraint?.targetBrand || '');
    const [targetCategory, setTargetCategory] = useState(constraint?.targetCategory || '');
    const [isActive, setIsActive] = useState(constraint?.isActive !== false);
    
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Constraint name is required');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name,
                ruleType,
                scope,
                hardConstraint,
                penaltyWeight: hardConstraint ? null : (parseFloat(penaltyWeight) || 0),
                targetSku: scope === 'sku' ? targetSku : null,
                targetBrand: scope === 'brand' ? targetBrand : null,
                targetCategory: scope === 'category' ? targetCategory : null,
                isActive
            };

            const url = `${getApiUrl()}/api/constraints${isNew ? '' : `/${constraint._id}`}`;
            const method = isNew ? 'POST' : 'PATCH';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwtToken}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                Alert.alert('Success', `Constraint ${isNew ? 'created' : 'updated'} successfully`);
                navigation.goBack();
            } else {
                const errData = await response.json();
                Alert.alert('Error', errData.error || errData.message || 'Failed to save constraint');
            }
        } catch (error) {
            console.log("Error saving constraint", error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert(
            "Delete Constraint",
            "Are you sure you want to delete this rule?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const response = await fetch(`${getApiUrl()}/api/constraints/${constraint._id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${jwtToken}` }
                            });
                            if (response.ok) {
                                navigation.goBack();
                            }
                        } catch (e) {
                            Alert.alert('Error', 'Failed to delete');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="headlineMedium" style={styles.title}>{isNew ? 'New Constraint' : 'Edit Constraint'}</Text>
                
                <View style={styles.form}>
                    <Text variant="titleMedium" style={styles.sectionHeader}>Basic Setup</Text>
                    <TextInput label="Rule Name" value={name} onChangeText={setName} mode="outlined" style={styles.input} />
                    
                    <Text variant="titleMedium" style={styles.sectionHeader}>Rule Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                        <SegmentedButtons
                            value={ruleType}
                            onValueChange={setRuleType}
                            buttons={[
                                { value: 'adjacency_required', label: 'Adjacent' },
                                { value: 'adjacency_forbidden', label: 'No Adjacent' },
                                { value: 'min_facings_override', label: 'Min Facings' },
                                { value: 'max_facings_override', label: 'Max Facings' },
                                { value: 'category_shelf_affinity', label: 'Affinity' }
                            ]}
                            style={styles.segmented}
                        />
                    </ScrollView>

                    <Text variant="titleMedium" style={styles.sectionHeader}>Rule Scope</Text>
                    <SegmentedButtons
                        value={scope}
                        onValueChange={setScope}
                        buttons={[
                            { value: 'brand', label: 'Brand' },
                            { value: 'category', label: 'Category' },
                            { value: 'sku', label: 'Specific SKU' }
                        ]}
                        style={styles.segmented}
                    />

                    {scope === 'brand' && (
                        <TextInput label="Target Brand" value={targetBrand} onChangeText={setTargetBrand} mode="outlined" style={styles.input} />
                    )}
                    {scope === 'category' && (
                        <TextInput label="Target Category" value={targetCategory} onChangeText={setTargetCategory} mode="outlined" style={styles.input} />
                    )}
                    {scope === 'sku' && (
                        <TextInput label="Target SKU" value={targetSku} onChangeText={setTargetSku} mode="outlined" style={styles.input} />
                    )}
                    
                    <Text variant="titleMedium" style={styles.sectionHeader}>Enforcement</Text>
                    <View style={styles.switchContainer}>
                        <View>
                            <Text variant="bodyLarge">Hard Constraint</Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Must be strictly satisfied</Text>
                        </View>
                        <Switch value={hardConstraint} onValueChange={setHardConstraint} color={theme.colors.error} />
                    </View>

                    {!hardConstraint && (
                        <TextInput 
                            label="Penalty Weight (Soft Constraint)" 
                            value={penaltyWeight} 
                            onChangeText={setPenaltyWeight} 
                            keyboardType="numeric" 
                            mode="outlined" 
                            style={styles.input} 
                        />
                    )}

                    <View style={[styles.switchContainer, { marginTop: 16 }]}>
                        <Text variant="bodyLarge">Active Rule</Text>
                        <Switch value={isActive} onValueChange={setIsActive} color={theme.colors.primary} />
                    </View>
                </View>

                <View style={styles.actions}>
                    <Button mode="contained" onPress={handleSave} loading={loading} style={styles.button}>
                        Save Rule
                    </Button>
                    {!isNew && (
                        <Button mode="outlined" onPress={handleDelete} disabled={loading} textColor={theme.colors.error} style={[styles.button, { borderColor: theme.colors.error }]}>
                            Delete Rule
                        </Button>
                    )}
                    <Button mode="text" onPress={() => navigation.goBack()} disabled={loading}>
                        Cancel
                    </Button>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 24,
        paddingTop: 64,
        paddingBottom: 40,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 8,
    },
    sectionHeader: {
        marginTop: 16,
        marginBottom: 8,
        fontWeight: 'bold',
        opacity: 0.7,
    },
    form: {
        gap: 8,
    },
    input: {
        backgroundColor: 'transparent',
    },
    segmented: {
        marginBottom: 8,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    actions: {
        marginTop: 32,
        gap: 12,
    },
    button: {
        paddingVertical: 4,
    }
});

export default ConstraintDetailScreen;
