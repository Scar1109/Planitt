import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, FlatList, Modal } from 'react-native';
import { Text, Button, Card, useTheme, ActivityIndicator, IconButton, Divider } from 'react-native-paper';
import { Camera, Image as ImageIcon, CheckCircle2, AlertCircle, Info, ChevronDown, Trash2, Box, ArrowRight } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { jwtToken } from '../utils/auth';
import { getApiUrl } from '../utils/config';

const ShelfComplianceScreen = ({ navigation }) => {
    const theme = useTheme();
    
    // Selection States
    const [runs, setRuns] = useState([]);
    const [fixtures, setFixtures] = useState([]);
    const [selectedRun, setSelectedRun] = useState(null);
    const [selectedFixture, setSelectedFixture] = useState(null);
    const [isRunModalVisible, setIsRunModalVisible] = useState(false);
    const [isFixtureModalVisible, setIsFixtureModalVisible] = useState(false);

    // Image States
    const [image, setImage] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Result States
    const [report, setReport] = useState(null);

    const fetchData = async () => {
        try {
            const [runRes, fixtureRes] = await Promise.all([
                fetch(`${getApiUrl()}/api/planograms/optimization/runs`, {
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                }),
                fetch(`${getApiUrl()}/api/planograms/shelves?storeId=6956357610ec0ab348888893`, {
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                })
            ]);

            if (runRes.ok) {
                const runData = await runRes.json();
                setRuns(Array.isArray(runData) ? runData.filter(r => r.status === 'success') : []);
            }

            if (fixtureRes.ok) {
                const fixtureData = await fixtureRes.json();
                setFixtures(Array.isArray(fixtureData) ? fixtureData : []);
            }
        } catch (error) {
            console.error("Error fetching data", error);
            Alert.alert("Error", "Failed to fetch necessary data from the server.");
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false, // Disabling editing for better reliability
                quality: 0.7,
            });

            if (!result.canceled) {
                const selectedAsset = result.assets ? result.assets[0] : result;
                setImage(selectedAsset);
            }
        } catch (error) {
            console.log("Error picking image:", error);
            Alert.alert("Error", "Failed to pick image from gallery.");
        }
    };

    const takePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Sorry, we need camera permissions to make this work!');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: false,
                quality: 0.7,
            });

            if (!result.canceled) {
                const selectedAsset = result.assets ? result.assets[0] : result;
                setImage(selectedAsset);
            }
        } catch (error) {
            console.log("Error taking photo:", error);
            Alert.alert("Error", "Failed to open camera.");
        }
    };

    const runAnalysis = async () => {
        if (!selectedRun) {
            Alert.alert("Missing Selection", "Please select an Optimization Run first.");
            return;
        }
        if (!selectedFixture) {
            Alert.alert("Missing Selection", "Please select a Target Fixture (Shelf).");
            return;
        }
        if (!image) {
            Alert.alert("Missing Image", "Please take a photo or upload an image of the shelf.");
            return;
        }

        setIsAnalyzing(true);
        setReport(null);

        const formData = new FormData();
        formData.append('optimizationRunId', selectedRun._id);
        formData.append('fixtureId', selectedFixture._id || selectedFixture.id);
        
        // Append image
        const uriParts = image.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('image', {
            uri: image.uri,
            name: `photo.${fileType}`,
            type: `image/${fileType}`,
        });

        try {
            const response = await fetch(`${getApiUrl()}/api/compliance/shelf-scan`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${jwtToken}`,
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });

            let data;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(`Server returned non-JSON response: ${text.slice(0, 100)}`);
            }

            if (response.ok) {
                setReport(data);
            } else {
                Alert.alert("Analysis Failed", data.message || "Failed to analyze shelf compliance.");
            }
        } catch (error) {
            console.log("Analysis error", error);
            Alert.alert("Critical Error", error.message || "An unexpected error occurred during analysis.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const renderRunItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.modalItem} 
            onPress={() => {
                setSelectedRun(item);
                setIsRunModalVisible(false);
            }}
        >
            <View>
                <Text variant="titleSmall">Run: #{item._id.slice(-6)}</Text>
                <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                    {new Date(item.createdAt).toLocaleDateString()} - Score: {item.bestScore?.toFixed(1)}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderFixtureItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.modalItem} 
            onPress={() => {
                setSelectedFixture(item);
                setIsFixtureModalVisible(false);
            }}
        >
            <View>
                <Text variant="titleSmall">{item.aisleBaySide || item.fixtureType || 'Shelf'}</Text>
                <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                    {item.fixtureType} - {item.totalWidthCm}x{item.totalHeightCm}cm
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <IconButton 
                    icon="arrow-left" 
                    iconColor="#fff" 
                    size={24} 
                    onPress={() => navigation.goBack()} 
                    style={styles.backBtn}
                />
                <View style={styles.headerTitleContainer}>
                    <Text variant="headlineSmall" style={styles.headerTitle}>Shelf Audit</Text>
                    <Text variant="bodySmall" style={styles.headerSubtitle}>Compliance Intelligence Layer</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Step 1: Configuration */}
                <Card style={styles.card} mode="elevated">
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.sectionTitle}>1. Configuration</Text>
                        
                        <TouchableOpacity 
                            style={styles.selector} 
                            onPress={() => setIsRunModalVisible(true)}
                        >
                            <View style={styles.selectorInfo}>
                                <Text variant="labelSmall" style={styles.selectorLabel}>Optimization Run</Text>
                                <Text variant="bodyLarge">
                                    {selectedRun ? `Run #${selectedRun._id.slice(-6)}` : "Select a Run"}
                                </Text>
                            </View>
                            <ChevronDown size={20} color={theme.colors.outline} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.selector} 
                            onPress={() => setIsFixtureModalVisible(true)}
                        >
                            <View style={styles.selectorInfo}>
                                <Text variant="labelSmall" style={styles.selectorLabel}>Target Fixture (Shelf)</Text>
                                <Text variant="bodyLarge">
                                    {selectedFixture ? (selectedFixture.aisleBaySide || "Active Shelf") : "Select a Fixture"}
                                </Text>
                            </View>
                            <ChevronDown size={20} color={theme.colors.outline} />
                        </TouchableOpacity>
                    </Card.Content>
                </Card>

                {/* Step 2: Image Input */}
                <Card style={styles.card} mode="elevated">
                    <Card.Content>
                        <View style={styles.row}>
                            <Text variant="titleMedium" style={styles.sectionTitle}>2. Shelf Image</Text>
                            {image && (
                                <TouchableOpacity onPress={() => setImage(null)}>
                                    <Trash2 size={18} color={theme.colors.error} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {image ? (
                            <View style={styles.previewContainer}>
                                <Image source={{ uri: image.uri }} style={styles.previewImage} />
                            </View>
                        ) : (
                            <View style={styles.imageActionRow}>
                                <TouchableOpacity style={styles.imageBtn} onPress={takePhoto}>
                                    <View style={[styles.imageIconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                                        <Camera size={28} color={theme.colors.primary} />
                                    </View>
                                    <Text variant="labelMedium">Take Photo</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
                                    <View style={[styles.imageIconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                                        <ImageIcon size={28} color={theme.colors.primary} />
                                    </View>
                                    <Text variant="labelMedium">Upload</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </Card.Content>
                </Card>

                <Button 
                    mode="contained" 
                    onPress={runAnalysis}
                    loading={isAnalyzing}
                    disabled={isAnalyzing}
                    style={styles.mainBtn}
                    contentStyle={styles.mainBtnContent}
                >
                    {isAnalyzing ? "Processing..." : "Analyze Compliance"}
                </Button>

                {/* Results Section */}
                {report && (
                    <View style={styles.resultContainer}>
                        <Card style={[styles.card, { backgroundColor: theme.colors.secondaryContainer }]}>
                            <Card.Content>
                                <View style={styles.pasRow}>
                                    <View>
                                        <Text variant="labelSmall" style={{ color: theme.colors.secondary }}>Compliance Score (PAS)</Text>
                                        <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: report.metrics.pas > 80 ? '#2E7D32' : '#C62828' }}>
                                            {report.metrics.pas}%
                                        </Text>
                                    </View>
                                    <CheckCircle2 size={40} color={report.metrics.pas > 80 ? '#2E7D32' : '#C62828'} />
                                </View>
                                <Divider style={{ marginVertical: 12, backgroundColor: 'rgba(0,0,0,0.05)' }} />
                                <Text variant="bodyMedium" style={{ fontStyle: 'italic', opacity: 0.8 }}>
                                    "{report.audit_insight}"
                                </Text>
                            </Card.Content>
                        </Card>

                        <Text variant="titleMedium" style={styles.sectionTitle}>Target vs. Actual</Text>
                        <View style={styles.comparisonPreviewRow}>
                            <View style={styles.previewBox}>
                                <Text variant="labelSmall" style={styles.previewLabel}>Current Scan</Text>
                                <View style={styles.imageMiniContainer}>
                                    <Image source={{ uri: image.uri }} style={styles.miniImage} />
                                </View>
                            </View>
                            <View style={styles.previewBox}>
                                <Text variant="labelSmall" style={styles.previewLabel}>Target Planogram</Text>
                                <View style={[styles.imageMiniContainer, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                                    <Layers size={32} color={theme.colors.primary} opacity={0.3} />
                                    <Text variant="labelSmall" style={{ marginTop: 8, opacity: 0.5 }}>Optimized Model</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.metricsGrid}>
                            <View style={styles.metricBox}>
                                <Text variant="labelSmall" style={styles.metricLabel}>Revenue Loss</Text>
                                <Text variant="titleLarge" style={styles.metricValue}>LKR {report.metrics.revenueRecovery}</Text>
                            </View>
                            <View style={styles.metricBox}>
                                <Text variant="labelSmall" style={styles.metricLabel}>Out of Stock</Text>
                                <Text variant="titleLarge" style={[styles.metricValue, { color: theme.colors.error }]}>{report.metrics.oosCount} SKUs</Text>
                            </View>
                        </View>

                        <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: 16 }]}>Adherence Table</Text>
                        <Card style={styles.card}>
                            {report.comparison.map((item, idx) => (
                                <View key={idx} style={styles.comparisonRow}>
                                    <View style={styles.comparisonInfo}>
                                        <Text variant="labelLarge" numberOfLines={1}>{item.productName}</Text>
                                        <Text variant="bodySmall" style={{ opacity: 0.5 }}>{item.sku}</Text>
                                    </View>
                                    <View style={styles.comparisonValues}>
                                        <View style={styles.valBox}>
                                            <Text variant="labelSmall">Exp.</Text>
                                            <Text variant="titleMedium">{item.expected}</Text>
                                        </View>
                                        <View style={styles.valBox}>
                                            <Text variant="labelSmall">Det.</Text>
                                            <Text variant="titleMedium" style={{ color: item.deviation !== 0 ? theme.colors.error : theme.colors.primary }}>
                                                {item.detected}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </Card>

                        <Button 
                            mode="contained" 
                            buttonColor={theme.colors.tertiary}
                            icon={() => <Box size={20} color="#fff" />}
                            style={styles.arBtn}
                            onPress={() => navigation.navigate('ARShelfCompliance', { 
                                report, 
                                fixture: fixtures.find(f => (f._id || f.id) === (selectedFixture._id || selectedFixture.id)) 
                            })}
                        >
                            View Guidance in AR
                        </Button>

                        <Button 
                            mode="outlined" 
                            icon={() => <ListChecks size={20} color={theme.colors.primary} />}
                            style={[styles.arBtn, { borderColor: theme.colors.primary, backgroundColor: 'transparent' }]}
                            onPress={() => navigation.navigate('ComplianceFix', { report })}
                        >
                            View Restoration Tasks
                        </Button>
                    </View>
                )}
            </ScrollView>

            {/* Run Selector Modal */}
            <Modal visible={isRunModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text variant="titleLarge">Select Optimization Run</Text>
                            <IconButton icon="close" onPress={() => setIsRunModalVisible(false)} />
                        </View>
                        <FlatList
                            data={runs}
                            renderItem={renderRunItem}
                            keyExtractor={item => item._id}
                        />
                    </View>
                </View>
            </Modal>

            {/* Fixture Selector Modal */}
            <Modal visible={isFixtureModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text variant="titleLarge">Select Target Shelf</Text>
                            <IconButton icon="close" onPress={() => setIsFixtureModalVisible(false)} />
                        </View>
                        <FlatList
                            data={fixtures}
                            renderItem={renderFixtureItem}
                            keyExtractor={item => item._id || item.id}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingTop: 60,
        paddingBottom: 24,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    backBtn: { margin: 0, marginRight: 8 },
    headerTitleContainer: { flex: 1 },
    headerTitle: { color: '#fff', fontWeight: 'bold' },
    headerSubtitle: { color: 'rgba(255,255,255,0.7)' },
    scrollContent: { padding: 16, paddingBottom: 40 },
    card: { marginBottom: 16, borderRadius: 16 },
    sectionTitle: { fontWeight: 'bold', marginBottom: 16, color: '#333' },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F5F7FA',
        borderRadius: 12,
        marginBottom: 12,
    },
    selectorInfo: { flex: 1 },
    selectorLabel: { opacity: 0.5, marginBottom: 2 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    imageActionRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16 },
    imageBtn: { alignItems: 'center' },
    imageIconBox: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    previewContainer: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 8,
    },
    previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    mainBtn: { borderRadius: 12, marginBottom: 16 },
    mainBtnContent: { paddingVertical: 8 },
    resultContainer: { marginTop: 8 },
    pasRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    comparisonPreviewRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    previewBox: { flex: 1 },
    previewLabel: { opacity: 0.5, marginBottom: 8, textAlign: 'center' },
    imageMiniContainer: {
        width: '100%',
        height: 120,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    miniImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    metricsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    metricBox: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        elevation: 1,
    },
    metricLabel: { opacity: 0.5, marginBottom: 4 },
    metricValue: { fontWeight: 'bold' },
    comparisonRow: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        alignItems: 'center',
    },
    comparisonInfo: { flex: 1, marginRight: 8 },
    comparisonValues: { flexDirection: 'row', gap: 12 },
    valBox: { alignItems: 'center' },
    arBtn: { marginTop: 16, borderRadius: 12, paddingVertical: 4 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalItem: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    }
});

export default ShelfComplianceScreen;
