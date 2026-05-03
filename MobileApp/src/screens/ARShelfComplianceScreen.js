import React, { useEffect, useState } from 'react';
import { View, StyleSheet, NativeModules, ActivityIndicator, Text, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { jwtToken } from '../utils/auth';
import { getApiUrl } from '../utils/config';

const { ARShelfViewModule } = NativeModules;

const ARShelfComplianceScreen = ({ navigation, route }) => {
    const theme = useTheme();
    const isFocused = useIsFocused();
    const { report, fixture } = route.params;
    
    const [isLaunching, setIsLaunching] = useState(false);
    const [fullRunData, setFullRunData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRunDetails = async () => {
            try {
                const response = await fetch(`${getApiUrl()}/api/planograms/optimization/runs/${report.metadata.optimizationRunId}`, {
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setFullRunData(data);
                } else {
                    Alert.alert("Error", "Failed to fetch planogram details for AR.");
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRunDetails();
    }, [report.metadata.optimizationRunId]);

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
            Alert.alert('Error', 'AR Module not available. Native rebuild required.');
            return;
        }

        setIsLaunching(true);
        try {
            const shelfData = prepareComplianceData(scale);
            await ARShelfViewModule.showShelfInAR(JSON.stringify(shelfData));
            navigation.goBack();
        } catch (err) {
            console.error('AR Launch Error', err);
            Alert.alert('Error', err.message || 'Failed to launch AR');
            setIsLaunching(false);
        }
    };

    const prepareComplianceData = (scale) => {
        // Filter placements for this fixture
        const placements = fullRunData.resultingPlacements.filter(p => 
            (p.fixtureId || p.fixture_id) === (fixture._id || fixture.id)
        );

        return {
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
                heightCm: 4 
            })),
            products: placements.map(p => {
                const compItem = report.comparison.find(c => c.sku === p.sku);
                let colorHex = '#2E7D32'; // Default Green (Compliant)
                
                if (compItem) {
                    if (compItem.deviation < 0) colorHex = '#80FFFFFF'; // Ghost-like White (Missing/Needs Restock)
                    else if (compItem.deviation > 0) colorHex = '#C62828'; // Red (Overstock/Remove)
                }

                let labelPrefix = "";
                if (compItem) {
                    if (compItem.deviation < 0) labelPrefix = "[PLACE] ";
                    else if (compItem.deviation > 0) labelPrefix = "[REMOVE] ";
                }

                const level = fixture.levels.find(l => (l._id || l.id) === (p.levelId || p.level_id));
                const levelY = level ? level.heightFromFloorCm : 0;

                return {
                    name: labelPrefix + (p.productName || p.sku),
                    sku: p.sku,
                    x: p.positionXcm || 0,
                    y: levelY,
                    widthCm: p.widthCm || 10,
                    heightCm: p.heightCm || 15,
                    depthCm: p.depthCm || 10,
                    facings: p.facings || 1,
                    unitsHigh: p.unitsHigh || 1,
                    unitsDeep: 1,
                    colorHex: colorHex
                };
            })
        };
    };

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.text}>Loading planogram data...</Text>
            </View>
        );
    }

    if (isLaunching) {
        return (
            <View style={[styles.center, { backgroundColor: '#111' }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.text}>Initializing Compliance AR...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: '#111' }]}>
            <View style={styles.content}>
                <Text style={styles.title}>AR Compliance Guidance</Text>
                <Text style={styles.subtitle}>Visualize where corrections are needed on the shelf</Text>
                
                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.colorBox, { backgroundColor: '#2E7D32' }]} />
                        <Text style={styles.legendText}>Compliant</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.colorBox, { backgroundColor: '#FFFFFF', opacity: 0.5 }]} />
                        <Text style={styles.legendText}>Missing / Needs Restock (Ghost Marker)</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.colorBox, { backgroundColor: '#C62828' }]} />
                        <Text style={styles.legendText}>Overstock / Remove (Red Alert)</Text>
                    </View>
                </View>

                <View style={styles.optionsContainer}>
                    <TouchableOpacity 
                        style={[styles.optionCard, { borderColor: theme.colors.primary }]} 
                        onPress={() => launchAR(1.0)}
                    >
                        <Text style={styles.optionTitle}>Full Scale Guidance (1:1)</Text>
                        <Text style={styles.optionDesc}>Overlay corrections directly onto the physical shelf.</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.optionCard, { borderColor: theme.colors.primary }]} 
                        onPress={() => launchAR(0.2)}
                    >
                        <Text style={styles.optionTitle}>Review Mini Model (1:5)</Text>
                        <Text style={styles.optionDesc}>View a tabletop representation of the compliance status.</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelText}>Back to Report</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 24 },
    title: { color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
    subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 24 },
    legend: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, marginBottom: 32 },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    colorBox: { width: 16, height: 16, borderRadius: 4, marginRight: 12 },
    legendText: { color: '#fff', fontSize: 13 },
    optionsContainer: { gap: 16 },
    optionCard: { backgroundColor: '#1E1E2D', borderRadius: 16, padding: 20, borderWidth: 1 },
    optionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    optionDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 8, lineHeight: 18 },
    text: { color: '#aaa', marginTop: 16 },
    cancelBtn: { marginTop: 32, padding: 16, alignItems: 'center' },
    cancelText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '600' }
});

export default ARShelfComplianceScreen;
