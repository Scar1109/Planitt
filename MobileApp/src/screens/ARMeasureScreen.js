import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, NativeModules, AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTheme, Button } from 'react-native-paper';
import { Check, X, RotateCcw, Camera } from 'lucide-react-native';

const { ARMeasureModule } = NativeModules;

const logAR = (message, payload) => {
    const line = `[ARMeasure] ${message}`;
    if (payload !== undefined) {
        console.log(line, payload);
    } else {
        console.log(line);
    }
};

const ARMeasureScreen = ({ navigation, route }) => {
    const theme = useTheme();
    const isFocused = useIsFocused();
    const [measuredDistance, setMeasuredDistance] = useState(null);
    const [isMeasuring, setIsMeasuring] = useState(false);
    const [error, setError] = useState(null);
    
    const initialTarget = route.params?.target || 'length';
    const [targetMeasurement, setTargetMeasurement] = useState(initialTarget);

    useEffect(() => {
        const parent = navigation.getParent?.();

        if (isFocused) {
            parent?.setOptions({ tabBarStyle: { display: 'none' } });
        }

        return () => {
            parent?.setOptions({ tabBarStyle: undefined });
        };
    }, [isFocused, navigation]);

    const startMeasurement = useCallback(async () => {
        if (!ARMeasureModule) {
            setError('AR module not available. Rebuild the app.');
            logAR('ARMeasureModule is null');
            return;
        }

        setIsMeasuring(true);
        setError(null);
        logAR('Starting native AR measurement');

        try {
            const distanceCm = await ARMeasureModule.startMeasurement();
            logAR('Measurement result', { distanceCm });

            if (distanceCm > 0) {
                setMeasuredDistance(distanceCm);
            } else {
                // User cancelled
                logAR('User cancelled measurement');
            }
        } catch (err) {
            logAR('Measurement error', err?.message);
            setError(err?.message || 'AR measurement failed');
        } finally {
            setIsMeasuring(false);
        }
    }, []);

    // Auto-launch AR on screen focus
    useEffect(() => {
        if (isFocused && !isMeasuring && measuredDistance === null) {
            // Small delay for screen transition
            const timer = setTimeout(() => startMeasurement(), 300);
            return () => clearTimeout(timer);
        }
    }, [isFocused]);

    const mode = route.params?.mode || 'form';
    const isQuickMode = mode === 'quick';

    const handleConfirm = () => {
        if (isQuickMode) {
            navigation.goBack();
            return;
        }
        
        if (measuredDistance) {
            navigation.navigate({
                name: 'ShelfDetail',
                params: { measurements: { [targetMeasurement]: Math.round(measuredDistance) } },
                merge: true,
            });
        } else {
            navigation.goBack();
        }
    };

    const isLevelMeasurement = targetMeasurement.startsWith('level_');
    const targetLabel = isLevelMeasurement ? `Level ${targetMeasurement.split('_')[1]}` : targetMeasurement;

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>{isQuickMode ? 'Quick Measure' : 'AR Measure'}</Text>
                </View>

                {/* Target Selection */}
                {!isQuickMode && !isLevelMeasurement && (
                    <View style={{ marginBottom: 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 4 }}>
                            {['length', 'width', 'height'].map((t) => (
                                <Button
                                    key={t}
                                    mode={targetMeasurement === t ? 'contained' : 'text'}
                                    onPress={() => setTargetMeasurement(t)}
                                    buttonColor={targetMeasurement === t ? theme.colors.primary : 'transparent'}
                                    textColor={targetMeasurement === t ? '#fff' : 'rgba(255,255,255,0.6)'}
                                    style={{ flex: 1, borderRadius: 6 }}
                                    compact
                                >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </Button>
                            ))}
                        </View>
                    </View>
                )}
                {!isQuickMode && isLevelMeasurement && (
                    <Text style={{ color: theme.colors.primary, textAlign: 'center', marginBottom: 24, fontSize: 16, fontWeight: 'bold' }}>
                        Measuring: {targetLabel} Height
                    </Text>
                )}
                {isQuickMode && (
                    <Text style={{ color: theme.colors.secondary, textAlign: 'center', marginBottom: 24, fontSize: 16, fontWeight: 'bold' }}>
                        Free Measurement Mode
                    </Text>
                )}

                {/* Result display */}
                {measuredDistance !== null ? (
                    <View style={styles.resultBox}>
                        <Text style={styles.resultLabel}>Measured Distance</Text>
                        <Text style={styles.resultValue}>{measuredDistance.toFixed(1)} cm</Text>
                        <Text style={styles.resultHint}>
                            {isQuickMode 
                                ? 'Use this tool to measure any distance' 
                                : `${Math.round(measuredDistance)} cm will be used for ${targetLabel}`}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.resultBox}>
                        <Camera color="#06D6A0" size={48} style={{ marginBottom: 16 }} />
                        <Text style={styles.resultLabel}>
                            {isMeasuring ? 'AR camera is open...' : 'Ready to measure'}
                        </Text>
                        <Text style={styles.resultHint}>
                            {isMeasuring
                                ? (isQuickMode ? 'Tap two points in the AR view' : 'Tap two points on the shelf in the AR view')
                                : 'Tap "Measure" to open the AR camera'}
                        </Text>
                        {error && (
                            <Text style={styles.errorText}>{error}</Text>
                        )}
                    </View>
                )}

                {/* Action buttons */}
                <View style={styles.controls}>
                    <Button
                        mode="outlined"
                        onPress={() => {
                            setMeasuredDistance(null);
                            setError(null);
                            startMeasurement();
                        }}
                        textColor="#fff"
                        style={{ borderColor: '#fff', flex: 1, marginRight: 8 }}
                        icon={() => <RotateCcw size={20} color="#fff" />}
                    >
                        {measuredDistance !== null ? 'Re-measure' : 'Measure'}
                    </Button>

                    <Button
                        mode="contained"
                        onPress={handleConfirm}
                        disabled={measuredDistance === null}
                        buttonColor={theme.colors.success}
                        style={{ flex: 1, marginLeft: 8 }}
                        icon={() => <Check size={20} color="#fff" />}
                    >
                        Confirm
                    </Button>
                </View>

                <Button
                    mode="text"
                    onPress={() => navigation.goBack()}
                    textColor="rgba(255,255,255,0.7)"
                    style={{ marginTop: 8 }}
                    icon={() => <X size={18} color="rgba(255,255,255,0.7)" />}
                >
                    Cancel
                </Button>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        paddingTop: 54,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
    },
    resultBox: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        padding: 32,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 32,
    },
    resultLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        marginBottom: 8,
    },
    resultValue: {
        color: '#06D6A0',
        fontSize: 48,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    resultHint: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        textAlign: 'center',
    },
    errorText: {
        color: '#ff6b6b',
        fontSize: 13,
        marginTop: 12,
        textAlign: 'center',
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
});

export default ARMeasureScreen;
