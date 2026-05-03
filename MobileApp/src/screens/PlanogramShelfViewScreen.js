import React, { useState, useMemo } from 'react';
import {
    View, StyleSheet, ScrollView, Dimensions, TouchableOpacity,
    Modal, Pressable
} from 'react-native';
import { Text, useTheme, IconButton, Portal } from 'react-native-paper';
import {
    ArrowLeft, ZoomIn, ZoomOut, X, Package, Layers,
    Move, Grid3x3, Box, Tag, Ruler
} from 'lucide-react-native';
import Svg, { Rect, Polygon, Circle, Line, Ellipse, Path, G } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Product Shape SVGs for React Native ───────────────────────
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

const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    // return HSL as a hex approximation
    return hslToHex(h, 55, 45);
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

const getBrandColor = (brand) => BRAND_COLORS[brand] || stringToColor(brand || 'Unknown');

const getProductBgColor = (productName, sku) => {
    const key = (productName || '') + (sku || '');
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return hslToHex(h, 40, 92);
};

// Category shape renderers
const CATEGORY_SHAPE_PATHS = {
    'Beverages': 'bottle',
    'Rice & Grains': 'bag',
    'Dry Rations': 'box',
    'Snacks & Confectionery': 'bar',
    'Dairy (Shelf-Stable)': 'carton',
    'Packaged Bakery': 'packet',
    'Instant Foods': 'noodle',
    'Tea & Coffee': 'canister',
    'Household & Cleaning': 'cleaning',
    'Personal Care': 'tube',
    'Baby Products': 'diaper',
    'Frozen (Non-Meat)': 'frozen',
};

const CategoryIcon = ({ category, color, size = 16 }) => {
    const shape = CATEGORY_SHAPE_PATHS[category] || 'box';
    const iconColor = color || '#666';
    const s = size;

    switch (shape) {
        case 'bottle':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 40">
                    <Rect x="8" y="0" width="8" height="5" rx="1" fill={iconColor} opacity={0.6} />
                    <Rect x="9" y="5" width="6" height="3" fill={iconColor} opacity={0.6} />
                    <Path d="M9 8 L6 14 L6 36 Q6 39 9 39 L15 39 Q18 39 18 36 L18 14 L15 8 Z" fill={iconColor} opacity={0.6} />
                </Svg>
            );
        case 'bag':
            return (
                <Svg width={s} height={s} viewBox="0 0 30 36">
                    <Path d="M3 6 Q3 3 6 3 L24 3 Q27 3 27 6 L27 33 Q27 36 24 36 L6 36 Q3 36 3 33 Z" fill={iconColor} opacity={0.6} />
                </Svg>
            );
        case 'bar':
            return (
                <Svg width={s} height={s} viewBox="0 0 36 18">
                    <Rect x="1" y="1" width="34" height="16" rx="3" fill={iconColor} opacity={0.6} />
                </Svg>
            );
        case 'carton':
            return (
                <Svg width={s} height={s} viewBox="0 0 22 36">
                    <Rect x="2" y="4" width="18" height="32" rx="2" fill={iconColor} opacity={0.6} />
                    <Polygon points="2,4 11,0 20,4" fill={iconColor} opacity={0.5} />
                </Svg>
            );
        default: // box
            return (
                <Svg width={s} height={s} viewBox="0 0 30 30">
                    <Rect x="2" y="2" width="26" height="26" rx="3" fill={iconColor} opacity={0.6} />
                    <Line x1="2" y1="10" x2="28" y2="10" stroke="white" strokeWidth="1" opacity={0.4} />
                </Svg>
            );
    }
};

const PlanogramShelfViewScreen = ({ navigation, route }) => {
    const theme = useTheme();
    const { fixture, placements, products = [], runScore } = route.params;
    const [zoom, setZoom] = useState(1);
    const [selectedPlacement, setSelectedPlacement] = useState(null);

    const levels = useMemo(() =>
        (fixture.levels || []).sort((a, b) => b.levelIndex - a.levelIndex),
        [fixture]
    );

    // Calculate SCALE to fit ENTIRE fixture on screen (both width and height)
    const fixtureWidth = fixture.totalWidthCm || 100;
    const fixtureHeight = fixture.totalHeightCm || 200;
    const hPadding = 32;
    // Header ~110px, zoom bar, label ~50px, bottom tab ~80px, padding
    const HEADER_HEIGHT = 130;
    const BOTTOM_TAB_HEIGHT = 80;
    const LABEL_HEIGHT = 50;
    const VERTICAL_PADDING = 24;
    const availableWidth = SCREEN_WIDTH - hPadding * 2;
    const availableHeight = SCREEN_HEIGHT - HEADER_HEIGHT - BOTTOM_TAB_HEIGHT - LABEL_HEIGHT - VERTICAL_PADDING;
    const scaleByWidth = availableWidth / fixtureWidth;
    const scaleByHeight = availableHeight / fixtureHeight;
    const baseScale = Math.min(scaleByWidth, scaleByHeight);
    const SCALE = baseScale * zoom;

    const canvasWidth = fixtureWidth * SCALE;
    const canvasHeight = fixtureHeight * SCALE;

    const handleZoomIn = () => setZoom(z => Math.min(3, z + 0.25));
    const handleZoomOut = () => setZoom(z => Math.max(0.5, z - 0.25));
    const handleZoomReset = () => setZoom(1);

    const openARView = () => {
        navigation.navigate('ARShelfView', {
            fixture,
            placements
        });
    };

    return (
        <View style={[styles.container, { backgroundColor: '#F1F5F9' }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <View style={styles.headerRow}>
                    <IconButton
                        icon={() => <ArrowLeft size={22} color="#fff" />}
                        onPress={() => navigation.goBack()}
                        style={styles.backBtn}
                    />
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            {fixture.aisleBaySide || 'Shelf Layout'}
                        </Text>
                        <Text style={styles.headerSubtitle}>
                            Score: {runScore?.toFixed(1) || 'N/A'} • {placements.length} Products
                        </Text>
                    </View>
                </View>

                {/* Actions Bar */}
                <View style={styles.actionsBar}>
                    {/* Zoom Controls */}
                    <View style={styles.zoomControls}>
                        <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
                            <ZoomOut size={16} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleZoomReset}>
                            <Text style={styles.zoomText}>{(zoom * 100).toFixed(0)}%</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
                            <ZoomIn size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* View in AR Button */}
                    <TouchableOpacity style={styles.arButton} onPress={openARView}>
                        <Box size={16} color="#fff" />
                        <Text style={styles.arButtonText}>View in AR</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Shelf Canvas - single bidirectional scroll */}
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
                horizontal={false}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
            >
                <ScrollView
                    horizontal={true}
                    showsHorizontalScrollIndicator={true}
                    contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                    }}
                    nestedScrollEnabled={true}
                >
                    <View style={{ alignItems: 'center' }}>
                        {/* Fixture Label */}
                        <View style={styles.fixtureLabelContainer}>
                            <Text style={styles.fixtureLabel}>{fixture.aisleBaySide}</Text>
                            <Text style={styles.fixtureDims}>
                                {fixture.totalWidthCm}W × {fixture.totalHeightCm}H cm
                            </Text>
                        </View>

                        {/* Fixture Body */}
                        <View style={[styles.fixtureBody, { width: canvasWidth, height: canvasHeight }]}>
                            {/* Render Shelf Lines - direct children of fixtureBody for correct absolute positioning */}
                            {levels.map(level => (
                                <View
                                    key={`shelf-${level._id}`}
                                    style={[styles.shelfLine, {
                                        bottom: level.heightFromFloorCm * SCALE,
                                        width: canvasWidth,
                                    }]}
                                >
                                    <View style={styles.levelLabelOnShelf}>
                                        <Text style={styles.levelLabelText}>L{level.levelIndex + 1}</Text>
                                    </View>
                                </View>
                            ))}

                            {/* Render Products - direct children of fixtureBody for correct absolute positioning */}
                            {levels.map(level => {
                                const itemsOnShelf = placements.filter(p => p.level_id === level._id);
                                const shelfBottom = level.heightFromFloorCm * SCALE;

                                return itemsOnShelf.map((item, idx) => {
                                    const singleW = (item.widthCm || 10) * SCALE;
                                    const h = (item.heightCm || 10) * SCALE;
                                    const baseX = (item.x_position || 0) * SCALE;
                                    const bgColor = getProductBgColor(item.product_name, item.sku);
                                    const brandColor = getBrandColor(item.brand);
                                    const isSelected = selectedPlacement && (
                                        (selectedPlacement._id && selectedPlacement._id === item._id) ||
                                        (selectedPlacement.sku === item.sku && selectedPlacement.level_id === item.level_id)
                                    );

                                    const elements = [];
                                    for (let facingIdx = 0; facingIdx < (item.facings || 1); facingIdx++) {
                                        for (let stackIdx = 0; stackIdx < (item.unitsHigh || 1); stackIdx++) {
                                            elements.push(
                                                <TouchableOpacity
                                                    key={`prod-${level._id}-${idx}-f${facingIdx}-s${stackIdx}`}
                                                    activeOpacity={0.7}
                                                    onPress={() => setSelectedPlacement(item)}
                                                    style={[
                                                        styles.productBlock,
                                                        {
                                                            position: 'absolute',
                                                            left: baseX + (facingIdx * singleW),
                                                            width: singleW,
                                                            height: h,
                                                            bottom: shelfBottom + 4 + (stackIdx * h),
                                                            backgroundColor: bgColor,
                                                            borderColor: isSelected ? theme.colors.primary : 'rgba(0,0,0,0.08)',
                                                            borderWidth: isSelected ? 2 : 1,
                                                            zIndex: isSelected ? 50 : 10,
                                                        }
                                                    ]}
                                                >
                                                    <View style={styles.productInner}>
                                                        <CategoryIcon
                                                            category={item.category}
                                                            color={brandColor}
                                                            size={Math.min(singleW * 0.6, h * 0.6, 18)}
                                                        />
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        }
                                    }
                                    return elements;
                                });
                            })}
                        </View>
                    </View>
                </ScrollView>
            </ScrollView>

            {/* Product Detail Modal */}
            <Modal
                visible={!!selectedPlacement}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectedPlacement(null)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setSelectedPlacement(null)}
                >
                    <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
                        {selectedPlacement && (
                            <>
                                {/* Modal Header */}
                                <View style={styles.modalHeader}>
                                    <View style={[styles.modalHeaderBg, { backgroundColor: theme.colors.primary + '12' }]}>
                                        <Text style={[styles.modalHeaderTitle, { color: theme.colors.primary }]}>
                                            Product Details
                                        </Text>
                                    </View>
                                    <IconButton
                                        icon={() => <X size={20} color="#6B7280" />}
                                        onPress={() => setSelectedPlacement(null)}
                                        style={styles.modalClose}
                                    />
                                </View>

                                {/* Product Info */}
                                <View style={styles.modalProductRow}>
                                    <View style={[styles.modalProductIcon, {
                                        backgroundColor: getProductBgColor(selectedPlacement.product_name, selectedPlacement.sku)
                                    }]}>
                                        <CategoryIcon
                                            category={selectedPlacement.category}
                                            color={getBrandColor(selectedPlacement.brand)}
                                            size={28}
                                        />
                                    </View>
                                    <View style={styles.modalProductInfo}>
                                        <Text style={styles.modalProductName}>{selectedPlacement.product_name}</Text>
                                        <Text style={styles.modalProductSku}>SKU: {selectedPlacement.sku}</Text>
                                        <View style={styles.modalTagRow}>
                                            <View style={[styles.modalTag, { backgroundColor: theme.colors.primary + '15' }]}>
                                                <Text style={[styles.modalTagText, { color: theme.colors.primary }]}>
                                                    {selectedPlacement.category}
                                                </Text>
                                            </View>
                                            {selectedPlacement.brand && (
                                                <View style={styles.modalTagBrand}>
                                                    <Text style={styles.modalTagBrandText}>{selectedPlacement.brand}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>

                                {/* Metrics Grid */}
                                <View style={styles.modalGrid}>
                                    <View style={styles.modalGridItem}>
                                        <Move size={14} color="#9CA3AF" />
                                        <Text style={styles.modalGridLabel}>Position (X)</Text>
                                        <Text style={styles.modalGridValue}>
                                            {selectedPlacement.x_position?.toFixed(1)} cm
                                        </Text>
                                    </View>
                                    <View style={styles.modalGridItem}>
                                        <Grid3x3 size={14} color="#9CA3AF" />
                                        <Text style={styles.modalGridLabel}>Facings</Text>
                                        <Text style={styles.modalGridValue}>{selectedPlacement.facings}</Text>
                                    </View>
                                    <View style={styles.modalGridItem}>
                                        <Ruler size={14} color="#9CA3AF" />
                                        <Text style={styles.modalGridLabel}>Width Used</Text>
                                        <Text style={styles.modalGridValue}>
                                            {((selectedPlacement.widthCm || 0) * (selectedPlacement.facings || 1)).toFixed(1)} cm
                                        </Text>
                                    </View>
                                    <View style={styles.modalGridItem}>
                                        <Box size={14} color="#9CA3AF" />
                                        <Text style={styles.modalGridLabel}>Units Deep</Text>
                                        <Text style={styles.modalGridValue}>{selectedPlacement.unitsDeep}</Text>
                                    </View>
                                    <View style={styles.modalGridItem}>
                                        <Layers size={14} color="#9CA3AF" />
                                        <Text style={styles.modalGridLabel}>Units High</Text>
                                        <Text style={styles.modalGridValue}>{selectedPlacement.unitsHigh}</Text>
                                    </View>
                                    <View style={[styles.modalGridItem, styles.modalGridItemHighlight, { backgroundColor: theme.colors.primary + '10' }]}>
                                        <Package size={14} color={theme.colors.primary} />
                                        <Text style={[styles.modalGridLabel, { color: theme.colors.primary }]}>Total Stock</Text>
                                        <Text style={[styles.modalGridValue, { color: theme.colors.primary, fontSize: 18 }]}>
                                            {(selectedPlacement.facings || 1) * (selectedPlacement.unitsDeep || 1) * (selectedPlacement.unitsHigh || 1)} units
                                        </Text>
                                    </View>
                                </View>

                                {/* Dimensions */}
                                <View style={styles.modalDimensions}>
                                    <Text style={styles.modalDimTitle}>Product Dimensions</Text>
                                    <Text style={styles.modalDimValue}>
                                        {selectedPlacement.widthCm}W × {selectedPlacement.heightCm}H × {selectedPlacement.depthCm}D cm
                                    </Text>
                                </View>
                            </>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 12,
        paddingTop: 44,
        paddingBottom: 12,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: {
        margin: 0,
    },
    headerInfo: {
        flex: 1,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        marginTop: 2,
    },
    actionsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingHorizontal: 12,
    },
    zoomControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 10,
        paddingVertical: 4,
        paddingHorizontal: 8,
        gap: 8,
    },
    arButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#06D6A0', // Accent color
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 6,
    },
    arButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
    },
    zoomButton: {
        padding: 6,
    },
    zoomText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'monospace',
        minWidth: 40,
        textAlign: 'center',
    },
    scrollContainer: {
        flex: 1,
    },
    fixtureLabelContainer: {
        alignItems: 'center',
        marginBottom: 8,
    },
    fixtureLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    fixtureDims: {
        fontSize: 10,
        color: '#9CA3AF',
        marginTop: 4,
    },
    fixtureBody: {
        backgroundColor: '#fff',
        borderWidth: 3,
        borderColor: '#CBD5E1',
        borderRadius: 4,
        position: 'relative',
    },
    shelfLine: {
        position: 'absolute',
        left: 0,
        height: 4,
        backgroundColor: '#94A3B8',
        borderBottomWidth: 2,
        borderBottomColor: '#64748B',
        zIndex: 5,
    },
    levelLabelOnShelf: {
        position: 'absolute',
        right: 2,
        top: -16,
    },
    levelLabelText: {
        fontSize: 9,
        color: '#94A3B8',
        fontWeight: '700',
    },
    productBlock: {
        borderRadius: 2,
        overflow: 'hidden',
    },
    productInner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 1,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 32,
        maxHeight: SCREEN_HEIGHT * 0.7,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 12,
    },
    modalHeaderBg: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
    },
    modalHeaderTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    modalClose: {
        margin: 0,
    },
    modalProductRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 14,
    },
    modalProductIcon: {
        width: 56,
        height: 56,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalProductInfo: {
        flex: 1,
    },
    modalProductName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    modalProductSku: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2,
    },
    modalTagRow: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 6,
    },
    modalTag: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    modalTagText: {
        fontSize: 10,
        fontWeight: '700',
    },
    modalTagBrand: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: '#F3F4F6',
    },
    modalTagBrandText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280',
    },
    modalGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    modalGridItem: {
        width: '47%',
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
        gap: 4,
    },
    modalGridItemHighlight: {
        width: '100%',
    },
    modalGridLabel: {
        fontSize: 9,
        color: '#9CA3AF',
        textTransform: 'uppercase',
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    modalGridValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
    },
    modalDimensions: {
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    modalDimTitle: {
        fontSize: 9,
        color: '#9CA3AF',
        textTransform: 'uppercase',
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    modalDimValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },
});

export default PlanogramShelfViewScreen;
