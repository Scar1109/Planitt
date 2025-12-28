import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ShelfAuditScreen = () => {
    return (
        <View style={styles.container}>
            <Text>Shelf Audit Screen</Text>
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

export default ShelfAuditScreen;
