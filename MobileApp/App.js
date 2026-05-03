import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PaperProvider } from 'react-native-paper';
import { Layers, User, Home, LayoutDashboard, Package } from 'lucide-react-native';

import { theme } from './src/theme';
import { loadApiUrl } from './src/utils/config';

// Intercept fetch to add localtunnel bypass header globally
const originalFetch = global.fetch;
global.fetch = async (url, options = {}) => {
    options.headers = {
        ...options.headers,
        'Bypass-Tunnel-Reminder': 'true'
    };
    return originalFetch(url, options);
};

// Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ShelfStack from './src/screens/ShelfStack';
import PlanogramStack from './src/screens/PlanogramStack';
import EditProfileScreen from './src/screens/EditProfileScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import ConstraintsScreen from './src/screens/ConstraintsScreen';
import ConstraintDetailScreen from './src/screens/ConstraintDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ComplianceScreen from './src/screens/ComplianceScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import ReportsScreen from './src/screens/ReportsScreen';


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                    if (route.name === 'Home') return <Home color={color} size={size} />;
                    if (route.name === 'Shelves') return <Layers color={color} size={size} />;
                    if (route.name === 'Products') return <Package color={color} size={size} />;
                    if (route.name === 'Planograms') return <LayoutDashboard color={color} size={size} />;
                    if (route.name === 'Profile') return <User color={color} size={size} />;
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: 'gray',
                headerShown: false,
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Shelves" component={ShelfStack} />
            <Tab.Screen name="Products" component={ProductsScreen} />
            <Tab.Screen name="Planograms" component={PlanogramStack} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
};

const App = () => {
    useEffect(() => {
        loadApiUrl();
    }, []);

    return (
        <PaperProvider theme={theme}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <NavigationContainer>
                <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Main" component={MainTabs} />
                    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
                    <Stack.Screen name="Constraints" component={ConstraintsScreen} />
                    <Stack.Screen name="ConstraintDetail" component={ConstraintDetailScreen} />
                    <Stack.Screen name="Settings" component={SettingsScreen} />
                    <Stack.Screen name="Compliance" component={ComplianceScreen} />
                    <Stack.Screen name="Alerts" component={AlertsScreen} />
                    <Stack.Screen name="Reports" component={ReportsScreen} />

                </Stack.Navigator>
            </NavigationContainer>
        </PaperProvider>
    );
};

export default App;
