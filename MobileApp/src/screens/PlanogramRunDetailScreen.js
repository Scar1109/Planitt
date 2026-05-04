import React, { useState, useEffect, useRef } from 'react';
import {
    View, StyleSheet, FlatList, Dimensions, Animated,
    RefreshControl
} from 'react-native';
import { Text, useTheme, Card, ActivityIndicator, IconButton } from 'react-native-paper';
import {
    ArrowLeft, Layers, ChevronLeft, ChevronRight, Eye,
    TrendingUp, Clock, Hash, AlertTriangle, CheckCircle, BarChart3
} from 'lucide-react-native';
import { jwtToken } from '../utils/auth';
import { getApiUrl } from '../utils/config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

const PlanogramRunDetailScreen = ({ navigation, route }) => {
    const theme = useTheme();
    const { run } = route.params;
    const flatListRef = useRef(null);

    const [fixtures, setFixtures] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);

    const placements = run?.resultingPlacements || [];

    // Fetch shelves and products from backend
    useEffect(() => {
        fetchContextData();
    }, []);

    const fetchContextData = async () => {
        setLoading(true);
        try {
            const [shelvesRes, productsRes] = await Promise.all([
                fetch(`${getApiUrl()}/api/planograms/shelves`, {
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                }),
                fetch(`${getApiUrl()}/api/products?isActive=true`, {
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                })
            ]);

            const shelvesData = shelvesRes.ok ? await shelvesRes.json() : [];
            const productsData = productsRes.ok ? await productsRes.json() : [];

            setFixtures(Array.isArray(shelvesData) ? shelvesData : []);
            setProducts(Array.isArray(productsData) ? productsData : []);
        } catch (err) {
            console.log('Fetch context error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Get unique fixture IDs from placements
    const usedFixtureIds = [...new Set(placements.map(p => p.fixture_id))];

    // Filter to only fixtures with placements
    const relevantFixtures = usedFixtureIds.length > 0
        ? fixtures.filter(f => usedFixtureIds.includes(f._id))
        : fixtures;

    // Build fixtures with levels and their placements
    const fixturesWithData = relevantFixtures.map(fixture => {
        const fixtureLevels = (fixture.levels || [])
            .sort((a, b) => b.levelIndex - a.levelIndex); // top to bottom

        const fixturePlacements = placements.filter(p => p.fixture_id === fixture._id);

        // Merge product data for each placement
        const enrichedPlacements = fixturePlacements.map(p => {
            const product = products.find(prod =>
                (p.product_id && prod._id === p.product_id) ||
                (prod.sku && p.sku && prod.sku.toLowerCase() === p.sku.toLowerCase())
            ) || {};

            const level = fixtureLevels.find(l => l._id === p.level_id) || {};
            const productDepth = product.depthCm || 10;
            const productHeight = product.heightCm || 10;
            const shelfDepth = level.usableDepthCm || 40;
            const shelfHeight = level.usableHeightCm || 40;
            const unitsDeep = Math.floor(shelfDepth / productDepth) || 1;
            const unitsHigh = Math.floor(shelfHeight / productHeight) || 1;

            return {
                ...p,
                product_name: product.productName || p.sku,
                widthCm: product.widthCm || 10,
                heightCm: productHeight,
                depthCm: productDepth,
                category: product.category || 'General',
                brand: product.brand || '',
                product_id: product._id,
                facings: p.facings || 1,
                shelfDepth,
                unitsDeep,
                unitsHigh,
            };
        });

        return {
            ...fixture,
            levels: fixtureLevels,
            placements: enrichedPlacements,
            productCount: enrichedPlacements.length,
        };
    });

    const formatRuntime = (ms) => {
        if (!ms) return '--';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    const improvement = run.heuristicScore > 0
        ? ((run.bestScore - run.heuristicScore) / run.heuristicScore * 100).toFixed(1)
        : null;

    const scrollToIndex = (index) => {
        if (index >= 0 && index < fixturesWithData.length) {
            flatListRef.current?.scrollToIndex({ index, animated: true });
            setActiveIndex(index);
        }
    };

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setActiveIndex(viewableItems[0].index || 0);
        }
    }).current;

    const viewabilityConfig = useRef({
        viewAreaCoveragePercentThreshold: 50,
    }).current;

    const renderShelfCard = ({ item: fixture, index }) => {
        const placementsOnFixture = fixture.placements || [];
        const uniqueCategories = [...new Set(placementsOnFixture.map(p => p.category))];
        const totalCapacity = placementsOnFixture.reduce((sum, p) =>
            sum + (p.facings * p.unitsDeep * p.unitsHigh), 0);

        return (
            <View style={[styles.cardWrapper, { width: CARD_WIDTH }]}>
                <Card style={styles.shelfCard} elevation={3}>
                    <Card.Content>
                        {/* Shelf Header */}
                        <View style={styles.shelfHeader}>
                            <View style={[styles.shelfIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                                <Layers size={22} color={theme.colors.primary} />
                            </View>
                            <View style={styles.shelfHeaderText}>
                                <Text style={styles.shelfName}>
                                    {fixture.aisleBaySide || 'Unnamed Shelf'}
                                </Text>
                                <Text style={styles.shelfDimensions}>
                                    {fixture.totalWidthCm}W × {fixture.totalDepthCm}D × {fixture.totalHeightCm}H cm
                                </Text>
                            </View>
                            <View style={[styles.indexBadge, { backgroundColor: theme.colors.primary }]}>
                                <Text style={styles.indexBadgeText}>{index + 1}/{fixturesWithData.length}</Text>
                            </View>
                        </View>

                        {/* Quick Stats */}
                        <View style={styles.quickStats}>
                            <View style={styles.quickStatItem}>
                                <Text style={styles.quickStatValue}>{fixture.levels?.length || 0}</Text>
                                <Text style={styles.quickStatLabel}>Levels</Text>
                            </View>
                            <View style={styles.quickStatDivider} />
                            <View style={styles.quickStatItem}>
                                <Text style={styles.quickStatValue}>{placementsOnFixture.length}</Text>
                                <Text style={styles.quickStatLabel}>Products</Text>
                            </View>
                            <View style={styles.quickStatDivider} />
                            <View style={styles.quickStatItem}>
                                <Text style={styles.quickStatValue}>{totalCapacity}</Text>
                                <Text style={styles.quickStatLabel}>Capacity</Text>
                            </View>
                        </View>

                        {/* Category Tags */}
                        {uniqueCategories.length > 0 && (
                            <View style={styles.categoryRow}>
                                {uniqueCategories.slice(0, 4).map((cat, i) => (
                                    <View key={i} style={styles.categoryTag}>
                                        <Text style={styles.categoryTagText}>{cat}</Text>
                                    </View>
                                ))}
                                {uniqueCategories.length > 4 && (
                                    <View style={styles.categoryTag}>
                                        <Text style={styles.categoryTagText}>+{uniqueCategories.length - 4}</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Level Preview */}
                        <View style={styles.levelPreview}>
                            <Text style={styles.levelPreviewTitle}>Level Overview</Text>
                            {fixture.levels?.map((level, li) => {
                                const levelProducts = placementsOnFixture.filter(p => p.level_id === level._id);
                                const fill = level.usableWidthCm > 0
                                    ? Math.min(100, (levelProducts.reduce((s, p) => s + (p.widthCm * p.facings), 0) / level.usableWidthCm) * 100)
                                    : 0;
                                return (
                                    <View key={li} style={styles.levelRow}>
                                        <Text style={styles.levelLabel}>L{level.levelIndex + 1}</Text>
                                        <View style={styles.levelBar}>
                                            <View style={[styles.levelBarFill, {
                                                width: `${fill}%`,
                                                backgroundColor: fill > 90 ? '#EF476F' : fill > 70 ? '#FF8F00' : '#4361EE'
                                            }]} />
                                        </View>
                                        <Text style={styles.levelCount}>{levelProducts.length} items</Text>
                                    </View>
                                );
                            })}
                        </View>

                        {/* View Button */}
                        <View style={styles.viewButtonContainer}>
                            <Card
                                style={[styles.viewButton, { backgroundColor: theme.colors.primary }]}
                                onPress={() => {
                                    navigation.navigate('PlanogramShelfView', {
                                        fixture,
                                        placements: placementsOnFixture,
                                        products,
                                        runScore: run.bestScore,
                                    });
                                }}
                            >
                                <Card.Content style={styles.viewButtonContent}>
                                    <Eye size={18} color="#fff" />
                                    <Text style={styles.viewButtonText}>View Shelf Layout</Text>
                                </Card.Content>
                            </Card>
                        </View>
                    </Card.Content>
                </Card>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <View style={styles.headerTopRow}>
                    <IconButton
                        icon={() => <ArrowLeft size={22} color="#fff" />}
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    />
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Optimization Run</Text>
                        <Text style={styles.headerSubtitle}>
                            {run.runType?.replace(/_/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase())} • #{run._id?.slice(-6)}
                        </Text>
                    </View>
                </View>

                {/* Run Summary Stats */}
                <View style={styles.summaryStats}>
                    <View style={styles.summaryStatItem}>
                        <BarChart3 size={14} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.summaryStatValue}>{run.bestScore?.toFixed(1) || '--'}</Text>
                        <Text style={styles.summaryStatLabel}>Score</Text>
                    </View>
                    <View style={styles.summaryStatDivider} />
                    <View style={styles.summaryStatItem}>
                        <Clock size={14} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.summaryStatValue}>{formatRuntime(run.runtimeMs)}</Text>
                        <Text style={styles.summaryStatLabel}>Runtime</Text>
                    </View>
                    {improvement && (
                        <>
                            <View style={styles.summaryStatDivider} />
                            <View style={styles.summaryStatItem}>
                                <TrendingUp size={14} color="rgba(255,255,255,0.7)" />
                                <Text style={[styles.summaryStatValue, { color: '#A5D6A7' }]}>+{improvement}%</Text>
                                <Text style={styles.summaryStatLabel}>Improve</Text>
                            </View>
                        </>
                    )}
                    <View style={styles.summaryStatDivider} />
                    <View style={styles.summaryStatItem}>
                        {(run.constraintViolations?.length || 0) === 0
                            ? <CheckCircle size={14} color="#A5D6A7" />
                            : <AlertTriangle size={14} color="#FFB74D" />
                        }
                        <Text style={styles.summaryStatValue}>
                            {(run.constraintViolations?.length || 0) === 0 ? '✓' : run.constraintViolations.length}
                        </Text>
                        <Text style={styles.summaryStatLabel}>Violations</Text>
                    </View>
                </View>
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Loading shelf data...</Text>
                </View>
            ) : fixturesWithData.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <Layers size={48} color="#D1D5DB" />
                    <Text style={styles.emptyText}>No shelves found for this run</Text>
                </View>
            ) : (
                <View style={styles.carouselContainer}>
                    {/* Shelf Count Header */}
                    <View style={styles.carouselHeader}>
                        <Text style={styles.carouselTitle}>
                            Shelves ({fixturesWithData.length})
                        </Text>
                        <View style={styles.carouselNav}>
                            <IconButton
                                icon={() => <ChevronLeft size={20} color={activeIndex > 0 ? theme.colors.primary : '#D1D5DB'} />}
                                onPress={() => scrollToIndex(activeIndex - 1)}
                                disabled={activeIndex === 0}
                                size={20}
                                style={styles.navButton}
                            />
                            <Text style={styles.carouselCounter}>
                                {activeIndex + 1} / {fixturesWithData.length}
                            </Text>
                            <IconButton
                                icon={() => <ChevronRight size={20} color={activeIndex < fixturesWithData.length - 1 ? theme.colors.primary : '#D1D5DB'} />}
                                onPress={() => scrollToIndex(activeIndex + 1)}
                                disabled={activeIndex >= fixturesWithData.length - 1}
                                size={20}
                                style={styles.navButton}
                            />
                        </View>
                    </View>

                    {/* Horizontal Card Carousel */}
                    <FlatList
                        ref={flatListRef}
                        data={fixturesWithData}
                        keyExtractor={item => item._id}
                        renderItem={renderShelfCard}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={CARD_WIDTH + 16}
                        decelerationRate="fast"
                        contentContainerStyle={styles.carouselContent}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig}
                        getItemLayout={(data, index) => ({
                            length: CARD_WIDTH + 16,
                            offset: (CARD_WIDTH + 16) * index,
                            index,
                        })}
                    />

                    {/* Dot Indicators */}
                    {fixturesWithData.length > 1 && (
                        <View style={styles.dotContainer}>
                            {fixturesWithData.map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.dot,
                                        {
                                            backgroundColor: i === activeIndex ? theme.colors.primary : '#D1D5DB',
                                            width: i === activeIndex ? 20 : 8,
                                        }
                                    ]}
                                />
                            ))}
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    backButton: {
        margin: 0,
        marginRight: 8,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginTop: 2,
    },
    summaryStats: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 12,
        padding: 12,
    },
    summaryStatItem: {
        flex: 1,
        alignItems: 'center',
        gap: 3,
    },
    summaryStatValue: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    summaryStatLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    summaryStatDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginHorizontal: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    emptyText: {
        color: '#9CA3AF',
        fontSize: 14,
        marginTop: 8,
    },
    carouselContainer: {
        flex: 1,
        paddingTop: 16,
    },
    carouselHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 8,
    },
    carouselTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
    },
    carouselNav: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 0,
    },
    navButton: {
        margin: 0,
    },
    carouselCounter: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        minWidth: 40,
        textAlign: 'center',
    },
    carouselContent: {
        paddingHorizontal: 24,
    },
    cardWrapper: {
        marginRight: 16,
    },
    shelfCard: {
        borderRadius: 16,
        backgroundColor: '#fff',
    },
    shelfHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    shelfIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    shelfHeaderText: {
        flex: 1,
    },
    shelfName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    shelfDimensions: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2,
    },
    indexBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    indexBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    quickStats: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        marginBottom: 14,
    },
    quickStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    quickStatValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1F2937',
    },
    quickStatLabel: {
        fontSize: 9,
        color: '#9CA3AF',
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: 0.5,
        marginTop: 2,
    },
    quickStatDivider: {
        width: 1,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 8,
    },
    categoryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 14,
    },
    categoryTag: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    categoryTagText: {
        fontSize: 11,
        color: '#4361EE',
        fontWeight: '600',
    },
    levelPreview: {
        marginBottom: 16,
    },
    levelPreviewTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    levelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    levelLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#9CA3AF',
        width: 24,
    },
    levelBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        marginHorizontal: 8,
        overflow: 'hidden',
    },
    levelBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    levelCount: {
        fontSize: 10,
        color: '#9CA3AF',
        width: 50,
        textAlign: 'right',
    },
    viewButtonContainer: {
        marginTop: 4,
    },
    viewButton: {
        borderRadius: 12,
    },
    viewButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 4,
    },
    viewButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    dotContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 16,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
});

export default PlanogramRunDetailScreen;
