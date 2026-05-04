import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, Switch } from 'react-native-paper';
import { jwtToken } from '../utils/auth';
import { getApiUrl } from '../utils/config';

const ProductDetailScreen = ({ route, navigation }) => {
    const { product } = route.params;
    const theme = useTheme();

    const [productName, setProductName] = useState(product.productName || '');
    const [sku, setSku] = useState(product.sku || '');
    const [barcode, setBarcode] = useState(product.barcode || '');
    const [brand, setBrand] = useState(product.brand || '');
    const [category, setCategory] = useState(product.category || '');
    const [supplier, setSupplier] = useState(product.supplier || '');
    const [baseUnitPriceLKR, setBaseUnitPriceLKR] = useState(product.baseUnitPriceLKR?.toString() || '');
    const [unitCostLKR, setUnitCostLKR] = useState(product.unitCostLKR?.toString() || '');
    const [widthCm, setWidthCm] = useState(product.widthCm?.toString() || '');
    const [heightCm, setHeightCm] = useState(product.heightCm?.toString() || '');
    const [depthCm, setDepthCm] = useState(product.depthCm?.toString() || '');
    const [isActive, setIsActive] = useState(product.isActive !== false);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            const payload = {
                productName,
                sku,
                barcode,
                brand,
                category,
                supplier,
                baseUnitPriceLKR: parseFloat(baseUnitPriceLKR) || 0,
                unitCostLKR: parseFloat(unitCostLKR) || 0,
                widthCm: parseFloat(widthCm) || 0,
                heightCm: parseFloat(heightCm) || 0,
                depthCm: parseFloat(depthCm) || 0,
                isActive
            };

            const response = await fetch(`${getApiUrl()}/api/products/${product._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwtToken}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                Alert.alert('Success', 'Product updated successfully');
                navigation.goBack();
            } else {
                Alert.alert('Error', 'Failed to update product');
            }
        } catch (error) {
            console.log("Error updating product", error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="headlineMedium" style={styles.title}>Edit Product</Text>
                
                <View style={styles.form}>
                    <Text variant="titleMedium" style={styles.sectionHeader}>Basic Info</Text>
                    <TextInput label="Product Name" value={productName} onChangeText={setProductName} mode="outlined" style={styles.input} />
                    <TextInput label="SKU" value={sku} onChangeText={setSku} mode="outlined" style={styles.input} />
                    <TextInput label="Barcode" value={barcode} onChangeText={setBarcode} mode="outlined" style={styles.input} />
                    
                    <Text variant="titleMedium" style={styles.sectionHeader}>Classification</Text>
                    <TextInput label="Brand" value={brand} onChangeText={setBrand} mode="outlined" style={styles.input} />
                    <TextInput label="Category" value={category} onChangeText={setCategory} mode="outlined" style={styles.input} />
                    <TextInput label="Supplier" value={supplier} onChangeText={setSupplier} mode="outlined" style={styles.input} />
                    
                    <Text variant="titleMedium" style={styles.sectionHeader}>Pricing (LKR)</Text>
                    <TextInput label="Selling Price (LKR)" value={baseUnitPriceLKR} onChangeText={setBaseUnitPriceLKR} keyboardType="numeric" mode="outlined" style={styles.input} />
                    <TextInput label="Unit Cost (LKR)" value={unitCostLKR} onChangeText={setUnitCostLKR} keyboardType="numeric" mode="outlined" style={styles.input} />
                    
                    <Text variant="titleMedium" style={styles.sectionHeader}>Dimensions (cm)</Text>
                    <View style={styles.row}>
                        <TextInput label="Width" value={widthCm} onChangeText={setWidthCm} keyboardType="numeric" mode="outlined" style={[styles.input, { flex: 1, marginRight: 4 }]} />
                        <TextInput label="Height" value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" mode="outlined" style={[styles.input, { flex: 1, marginHorizontal: 4 }]} />
                        <TextInput label="Depth" value={depthCm} onChangeText={setDepthCm} keyboardType="numeric" mode="outlined" style={[styles.input, { flex: 1, marginLeft: 4 }]} />
                    </View>

                    <View style={styles.switchContainer}>
                        <Text variant="bodyLarge">Active Product</Text>
                        <Switch value={isActive} onValueChange={setIsActive} color={theme.colors.primary} />
                    </View>
                </View>

                <View style={styles.actions}>
                    <Button mode="contained" onPress={handleSave} loading={loading} style={styles.button}>
                        Save Changes
                    </Button>
                    <Button mode="outlined" onPress={() => navigation.goBack()} disabled={loading} style={styles.button}>
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
        marginBottom: 24,
    },
    sectionHeader: {
        marginTop: 16,
        marginBottom: 8,
        fontWeight: 'bold',
        opacity: 0.7,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    form: {
        gap: 8,
    },
    input: {
        backgroundColor: 'transparent',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingVertical: 8,
    },
    actions: {
        marginTop: 32,
        gap: 16,
    },
    button: {
        paddingVertical: 4,
    }
});

export default ProductDetailScreen;
