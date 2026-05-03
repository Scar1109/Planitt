import React, { useEffect, useState } from 'react';
import { View, StyleSheet, NativeModules, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';

const { ARShelfViewModule } = NativeModules;

const BRAND_COLORS = {
    'Coca-Cola': '#E61A27', 'Sprite': '#008B47', 'Fanta': '#FF8300',
    'Pepsi': '#004B93', '7 Up': '#2E8B57', 'Mirinda': '#FF6F00',
    'Mountain Dew': '#7CB342', 'Elephant House': '#1B5E20',
    'Kist': '#F57C00', 'Red Bull': '#CC0000', 'Milo': '#2E7D32',
    'Nestomalt': '#6D4C41', 'Horlicks': '#FF8F00', 'Aquafina': '#0288D1',
    'MD': '#B71C1C', 'Araliya': '#8D6E63', 'CIC': '#1565C0',
    'Catch': '#E65100', 'Akshata': '#558B2F', 'Prima': '#D32F2F',
    'Harischandra': '#BF360C', 'Anchor': '#0D47A1', 'Wijaya': '#E65100',
    "MA's": '#4A148C', 'Marina': '#01579B', 'Fortune': '#1B5E20',
    'Maggi': '#FDD835', 'Kotmale': '#1565C0', 'Ambewela': '#00838F',
    'Richlife': '#0097A7', 'Highland': '#1B5E20', 'Milkmaid': '#FBC02D',
    'Ritzbury': '#6A1B9A', 'Kandos': '#4E342E', 'Cadbury': '#3F0E7B',
    'Munchee': '#F9A825', 'Maliban': '#E65100', 'Raigam': '#1B5E20',
    'Knorr': '#2E7D32', 'Dilmah': '#B71C1C', 'Lipton': '#FDD835',
    'Zesta': '#1B5E20', 'Nescafe': '#5D4037', 'Sunlight': '#FDD835',
    'Surf Excel': '#1565C0', 'Vim': '#2E7D32', 'Harpic': '#0D47A1',
    'Signal': '#1565C0', 'Colgate': '#D32F2F', 'Dove': '#0097A7',
    'Huggies': '#1565C0', 'Pampers': '#2E7D32',
};

const hslToHex = (h, s, l) => {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
};

const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return hslToHex(h, 55, 45);
};

const getBrandColor = (brand) => BRAND_COLORS[brand] || stringToColor(brand || 'Unknown');

const ARShelfViewScreen = ({ navigation, route }) => {
    const theme = useTheme();
    const isFocused = useIsFocused();
    const { fixture, placements } = route.params;
    const [error, setError] = useState(null);
    const [isLaunching, setIsLaunching] = useState(false);

    useEffect(() => {
        const parent = navigation.getParent?.();
        if (isFocused) {
            parent?.setOptions({ tabBarStyle: { display: 'none' } });
        }
        return () => {
            parent?.setOptions({ tabBarStyle: undefined });
        };
    }, [isFocused, navigation]);

    const launchAR = async (scale) => {
        if (!ARShelfViewModule) {
            setError('AR Shelf Module not available. Please rebuild the app.');
            return;
        }

        setIsLaunching(true);
        try {
            const shelfData = prepareShelfData(scale);
            await ARShelfViewModule.showShelfInAR(JSON.stringify(shelfData));
            // When the promise resolves, it means the user closed the AR view
            navigation.goBack();
        } catch (err) {
            console.error('AR Launch Error', err);
            setError(err.message || 'Failed to launch AR');
            setIsLaunching(false);
        }
    };

    const prepareShelfData = (scale) => {
        const payload = {
            fixtureName: fixture.aisleBaySide || 'Shelf',
            displayScale: scale,
            widthCm: fixture.totalWidthCm || 100,
            heightCm: fixture.totalHeightCm || 200,
            depthCm: fixture.depthCm || 45,
            levels: (fixture.levels || []).map(l => ({
                id: l._id,
                heightFromFloorCm: l.heightFromFloorCm,
                widthCm: l.widthCm || fixture.totalWidthCm,
                depthCm: l.depthCm || fixture.depthCm || 40,
                heightCm: 4 // Thickness
            })),
            products: placements.map(p => {
                const hexColor = getBrandColor(p.brand);
                const level = fixture.levels.find(l => l._id === p.level_id);
                const levelY = level ? level.heightFromFloorCm : 0;

                return {
                    name: p.product_name,
                    sku: p.sku,
                    category: p.category,
                    brand: p.brand,
                    x: p.x_position || 0,
                    y: levelY,
                    widthCm: p.widthCm || 10,
                    heightCm: p.heightCm || 15,
                    depthCm: p.depthCm || 10,
                    facings: p.facings || 1,
                    unitsHigh: p.unitsHigh || 1,
                    unitsDeep: p.depth_quantity || Math.floor((fixture.depthCm || 40) / (p.depthCm || 10)) || 1,
                    colorHex: hexColor
                };
            })
        };
        return payload;
    };

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.error}>{error}</Text>
            </View>
        );
    }

    if (isLaunching) {
        return (
            <View style={[styles.center, { backgroundColor: '#111' }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.text}>Initializing AR...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: '#111' }]}>
            <View style={styles.content}>
                <Text style={styles.title}>Select AR Scale</Text>
                <Text style={styles.subtitle}>How would you like to view the shelf?</Text>
                
                <View style={styles.optionsContainer}>
                    <TouchableOpacity 
                        style={[styles.optionCard, { borderColor: theme.colors.primary }]} 
                        onPress={() => launchAR(1.0)}
                    >
                        <Text style={styles.optionTitle}>Original Size (1:1)</Text>
                        <Text style={styles.optionDesc}>Places a life-sized shelf. Best for empty store aisles or large open floors.</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.optionCard, { borderColor: theme.colors.primary }]} 
                        onPress={() => launchAR(0.2)}
                    >
                        <Text style={styles.optionTitle}>Tabletop Mini (1:5)</Text>
                        <Text style={styles.optionDesc}>Places a miniature shelf. Best for viewing the whole layout on a desk or table.</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 24,
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    subtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 32,
    },
    optionsContainer: {
        gap: 16,
    },
    optionCard: {
        backgroundColor: '#1E1E2D',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
    },
    optionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    optionDesc: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        marginTop: 8,
        lineHeight: 18,
    },
    text: {
        color: '#fff',
        marginTop: 16,
    },
    error: {
        color: '#ff6b6b',
        padding: 20,
        textAlign: 'center',
    },
    cancelBtn: {
        marginTop: 32,
        padding: 16,
        alignItems: 'center',
    },
    cancelText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 16,
        fontWeight: '600',
    }
});

export default ARShelfViewScreen;
