import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ComplianceFixScreen = () => {
    return (
        <View style={styles.container}>
            <Text>Compliance Fix Screen</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    }
});

export default ComplianceFixScreen;
