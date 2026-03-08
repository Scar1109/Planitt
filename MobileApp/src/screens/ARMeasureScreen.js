import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import {
    ViroARScene,
    ViroText,
    ViroARSceneNavigator,
    ViroNode,
    ViroSphere,
    ViroPolyline,
} from '@viro-community/react-viro';
import { useTheme, Button } from 'react-native-paper';
import { Check, X, RotateCcw } from 'lucide-react-native';

const MeasurementScene = (props) => {
    const [nodes, setNodes] = useState([]);
    const [distance, setDistance] = useState(0);

    // Calculate distance between two 3D points
    const calculateDistance = (p1, p2) => {
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const dz = p2[2] - p1[2];
        // Return in cm
        return Math.sqrt(dx * dx + dy * dy + dz * dz) * 100;
    };

    const onSceneClick = (position, source) => {
        if (nodes.length < 2) {
            const newNodes = [...nodes, position];
            setNodes(newNodes);

            if (newNodes.length === 2) {
                const dist = calculateDistance(newNodes[0], newNodes[1]);
                setDistance(dist);
                if (props.arSceneNavigator.viroAppProps.onDistanceMeasured) {
                    props.arSceneNavigator.viroAppProps.onDistanceMeasured(dist);
                }
            }
        }
    };

    return (
        <ViroARScene onAnchorFound={() => { }} onClick={onSceneClick}>
            {/* Instructions Node */}
            {nodes.length === 0 && (
                <ViroText
                    text="Tap on a surface to set the first point"
                    scale={[0.5, 0.5, 0.5]}
                    position={[0, 0, -1]}
                    style={{ fontFamily: 'Arial', fontSize: 20, color: 'white', textAlignVertical: 'center', textAlign: 'center' }}
                />
            )}

            {/* Point 1 */}
            {nodes.length > 0 && (
                <ViroSphere
                    position={nodes[0]}
                    radius={0.02}
                    materials={["red"]}
                />
            )}

            {/* Point 2 */}
            {nodes.length > 1 && (
                <ViroSphere
                    position={nodes[1]}
                    radius={0.02}
                    materials={["blue"]}
                />
            )}

            {/* Line connecting points */}
            {nodes.length === 2 && (
                <ViroPolyline
                    position={[0, 0, 0]}
                    points={[nodes[0], nodes[1]]}
                    thickness={0.01}
                    materials={["white"]}
                />
            )}

            {/* Distance Text */}
            {nodes.length === 2 && (
                <ViroText
                    text={`${distance.toFixed(1)} cm`}
                    scale={[0.2, 0.2, 0.2]}
                    position={[
                        (nodes[0][0] + nodes[1][0]) / 2,
                        (nodes[0][1] + nodes[1][1]) / 2 + 0.1, // slightly above
                        (nodes[0][2] + nodes[1][2]) / 2
                    ]}
                    style={{ fontFamily: 'Arial', fontSize: 20, color: '#06D6A0', textAlign: 'center' }}
                />
            )}
        </ViroARScene>
    );
};

const ARMeasureScreen = ({ navigation, route }) => {
    const theme = useTheme();
    const [measuredDistance, setMeasuredDistance] = useState(null);

    const resetMeasurement = () => {
        setMeasuredDistance(null);
        // ViroReact state forces component to remount to reset internal scene state easily
    };

    const handleConfirm = () => {
        if (route.params?.onMeasureComplete && measuredDistance) {
            // By default, assigning it to length for simplicity. 
            // The user can assign it where needed back in the detail screen.
            route.params.onMeasureComplete({ length: Math.round(measuredDistance) });
        }
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <ViroARSceneNavigator
                autofocus={true}
                initialScene={{
                    scene: MeasurementScene,
                }}
                viroAppProps={{
                    onDistanceMeasured: setMeasuredDistance
                }}
                style={styles.arView}
            />

            {/* UI Overlay */}
            <View style={styles.overlay}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                        <X color="#fff" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.title}>AR Measure</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.footer}>
                    <View style={styles.statusBox}>
                        <Text style={styles.statusText}>
                            {measuredDistance === null
                                ? "Tap two points to measure"
                                : `Distance: ${measuredDistance.toFixed(1)} cm`}
                        </Text>
                    </View>

                    <View style={styles.controls}>
                        <Button
                            mode="outlined"
                            onPress={resetMeasurement}
                            textColor="#fff"
                            style={{ borderColor: '#fff' }}
                            icon={() => <RotateCcw size={20} color="#fff" />}
                        >
                            Reset
                        </Button>

                        <Button
                            mode="contained"
                            onPress={handleConfirm}
                            disabled={measuredDistance === null}
                            buttonColor={theme.colors.success}
                            icon={() => <Check size={20} color="#fff" />}
                        >
                            Confirm
                        </Button>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    arView: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        padding: 24,
        paddingTop: 54, // safe area top
        paddingBottom: 40, // safe area bottom
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    footer: {
        gap: 16,
    },
    statusBox: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    statusText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    }
});

export default ARMeasureScreen;
