import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Animated } from 'react-native';
import { Text, useTheme, Card, Chip, ActivityIndicator, IconButton } from 'react-native-paper';
import { LayoutDashboard, Clock, TrendingUp, ChevronRight, Zap, BarChart3, AlertTriangle } from 'lucide-react-native';
import { jwtToken } from '../utils/auth';
import { getApiUrl } from '../utils/config';

const PlanogramsScreen = ({ navigation }) => {
    const theme = useTheme();
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const fetchRuns = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${getApiUrl()}/api/planograms/optimization/runs`, {
                headers: {
                    'Authorization': `Bearer ${jwtToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (response.ok) {
                const data = await response.json();
                setRuns(Array.isArray(data) ? data : []);
            } else {
                setError('Failed to load optimization runs.');
                setRuns([]);
            }
        } catch (err) {
            console.log('Fetch runs error:', err);
            setError('Could not connect to the server.');
            setRuns([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchRuns();
        });
        fetchRuns();
        return unsubscribe;
    }, [navigation]);

    const onRefresh = useCallback(() => {
        fetchRuns(true);
    }, []);

    const formatTime = (isoString) => {
        if (!isoString) return '--';
        const d = new Date(isoString);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatRuntime = (ms) => {
        if (!ms) return '--';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'success': return { bg: '#E8F5E9', color: '#2E7D32', label: 'SUCCESS' };
            case 'failed': return { bg: '#FFEBEE', color: '#C62828', label: 'FAILED' };
            case 'running': return { bg: '#E3F2FD', color: '#1565C0', label: 'RUNNING' };
            default: return { bg: '#FFF3E0', color: '#E65100', label: status?.toUpperCase() || 'UNKNOWN' };
        }
    };

    const getRunTypeIcon = (runType) => {
        if (runType?.includes('hybrid')) return <Zap size={14} color="#FF8F00" />;
        if (runType?.includes('meta')) return <BarChart3 size={14} color="#1565C0" />;
        return <TrendingUp size={14} color="#2E7D32" />;
    };

    const renderRunCard = ({ item, index }) => {
        const statusConfig = getStatusConfig(item.status);
        const placementCount = Array.isArray(item.resultingPlacements) ? item.resultingPlacements.length : 0;
        const improvement = item.heuristicScore > 0
            ? ((item.bestScore - item.heuristicScore) / item.heuristicScore * 100).toFixed(1)
            : null;
        const violationCount = item.constraintViolations?.length || 0;

        return (
            <Animated.View>
                <Card
                    style={[styles.runCard, { borderLeftColor: statusConfig.color }]}
                    onPress={() => {
                        if (item.status === 'success') {
                            navigation.navigate('PlanogramRunDetail', { run: item });
                        }
                    }}
                >
                    <Card.Content style={styles.runCardContent}>
                        {/* Top Row: Status + Time */}
                        <View style={styles.runTopRow}>
                            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                                    {statusConfig.label}
                                </Text>
                            </View>
                            <View style={styles.timeRow}>
                                <Clock size={12} color="#9CA3AF" />
                                <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
                            </View>
                        </View>

                        {/* Run Type + ID */}
                        <View style={styles.runTitleRow}>
                            {getRunTypeIcon(item.runType)}
                            <Text style={styles.runTitle}>
                                {item.runType?.replace(/_/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase()) || 'Optimization'} Run
                            </Text>
                            <Text style={styles.runId}>#{item._id?.slice(-6)}</Text>
                        </View>

                        {/* Metrics Row */}
                        <View style={styles.metricsRow}>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricLabel}>Score</Text>
                                <Text style={[styles.metricValue, { color: theme.colors.primary }]}>
                                    {item.bestScore?.toFixed(1) || '--'}
                                </Text>
                            </View>
                            <View style={styles.metricDivider} />
                            <View style={styles.metricItem}>
                                <Text style={styles.metricLabel}>Placements</Text>
                                <Text style={styles.metricValue}>{placementCount}</Text>
                            </View>
                            <View style={styles.metricDivider} />
                            <View style={styles.metricItem}>
                                <Text style={styles.metricLabel}>Runtime</Text>
                                <Text style={styles.metricValue}>{formatRuntime(item.runtimeMs)}</Text>
                            </View>
                            {improvement && (
                                <>
                                    <View style={styles.metricDivider} />
                                    <View style={styles.metricItem}>
                                        <Text style={styles.metricLabel}>Improve</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                            <TrendingUp size={10} color="#2E7D32" />
                                            <Text style={[styles.metricValue, { color: '#2E7D32' }]}>
                                                {improvement}%
                                            </Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Violations Warning */}
                        {violationCount > 0 && (
                            <View style={styles.violationRow}>
                                <AlertTriangle size={12} color="#E65100" />
                                <Text style={styles.violationText}>
                                    {violationCount} constraint violation{violationCount > 1 ? 's' : ''}
                                </Text>
                            </View>
                        )}

                        {/* Navigate Arrow */}
                        {item.status === 'success' && (
                            <View style={styles.navigateHint}>
                                <Text style={[styles.navigateText, { color: theme.colors.primary }]}>
                                    View Shelves
                                </Text>
                                <ChevronRight size={16} color={theme.colors.primary} />
                            </View>
                        )}
                    </Card.Content>
                </Card>
            </Animated.View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <Text variant="headlineMedium" style={styles.headerTitle}>Planograms</Text>
                <Text style={styles.headerSubtitle}>
                    Optimization runs & shelf layouts
                </Text>
                {runs.length > 0 && (
                    <View style={styles.headerStats}>
                        <View style={styles.headerStatItem}>
                            <Text style={styles.headerStatValue}>{runs.length}</Text>
                            <Text style={styles.headerStatLabel}>Total Runs</Text>
                        </View>
                        <View style={styles.headerStatDivider} />
                        <View style={styles.headerStatItem}>
                            <Text style={styles.headerStatValue}>
                                {runs.filter(r => r.status === 'success').length}
                            </Text>
                            <Text style={styles.headerStatLabel}>Successful</Text>
                        </View>
                        <View style={styles.headerStatDivider} />
                        <View style={styles.headerStatItem}>
                            <Text style={styles.headerStatValue}>
                                {runs.length > 0 ? Math.max(...runs.filter(r => r.bestScore).map(r => r.bestScore)).toFixed(0) : '--'}
                            </Text>
                            <Text style={styles.headerStatLabel}>Best Score</Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Loading optimization runs...</Text>
                </View>
            ) : error ? (
                <View style={styles.centerContainer}>
                    <AlertTriangle size={48} color={theme.colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : runs.length === 0 ? (
                <View style={styles.centerContainer}>
                    <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
                        <LayoutDashboard size={48} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.emptyTitle}>No Optimization Runs</Text>
                    <Text style={styles.emptyDesc}>
                        Run an optimization from the web dashboard first. Results will appear here.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={runs}
                    keyExtractor={item => item._id}
                    renderItem={renderRunCard}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[theme.colors.primary]}
                        />
                    }
                    showsVerticalScrollIndicator={false}
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
        paddingTop: 56,
        paddingBottom: 28,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTitle: {
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
    },
    headerStats: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        padding: 12,
        marginTop: 16,
    },
    headerStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    headerStatValue: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerStatLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    headerStatDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 8,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    loadingText: {
        marginTop: 16,
        color: '#9CA3AF',
        fontSize: 14,
    },
    errorText: {
        marginTop: 12,
        color: '#6B7280',
        fontSize: 14,
        textAlign: 'center',
    },
    emptyIcon: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 8,
    },
    emptyDesc: {
        fontSize: 13,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 20,
    },
    listContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    runCard: {
        marginBottom: 12,
        elevation: 2,
        borderRadius: 16,
        borderLeftWidth: 4,
        backgroundColor: '#fff',
    },
    runCardContent: {
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    runTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeText: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    runTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    runTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        flex: 1,
    },
    runId: {
        fontSize: 11,
        color: '#9CA3AF',
        fontFamily: 'monospace',
    },
    metricsRow: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        padding: 10,
        marginBottom: 8,
    },
    metricItem: {
        flex: 1,
        alignItems: 'center',
    },
    metricLabel: {
        fontSize: 9,
        color: '#9CA3AF',
        textTransform: 'uppercase',
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    metricValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
    },
    metricDivider: {
        width: 1,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 4,
    },
    violationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFF3E0',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginBottom: 8,
    },
    violationText: {
        fontSize: 11,
        color: '#E65100',
        fontWeight: '600',
    },
    navigateHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        marginTop: 4,
    },
    navigateText: {
        fontSize: 12,
        fontWeight: '700',
    },
});

export default PlanogramsScreen;
