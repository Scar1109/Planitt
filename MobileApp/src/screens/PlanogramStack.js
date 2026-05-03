import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PlanogramsScreen from './PlanogramsScreen';
import PlanogramRunDetailScreen from './PlanogramRunDetailScreen';
import PlanogramShelfViewScreen from './PlanogramShelfViewScreen';

const Stack = createNativeStackNavigator();

export default function PlanogramStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="PlanogramList" component={PlanogramsScreen} />
            <Stack.Screen name="PlanogramRunDetail" component={PlanogramRunDetailScreen} />
            <Stack.Screen name="PlanogramShelfView" component={PlanogramShelfViewScreen} />
        </Stack.Navigator>
    );
}
