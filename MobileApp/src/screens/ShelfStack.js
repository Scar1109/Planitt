import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ShelfListScreen from './ShelfListScreen';
import ShelfDetailScreen from './ShelfDetailScreen';
import ARMeasureScreen from './ARMeasureScreen';

const Stack = createNativeStackNavigator();

export default function ShelfStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ShelfList" component={ShelfListScreen} />
            <Stack.Screen name="ShelfDetail" component={ShelfDetailScreen} />
            <Stack.Screen name="ARMeasure" component={ARMeasureScreen} />
        </Stack.Navigator>
    );
}
