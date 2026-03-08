import { MD3LightTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
    fontFamily: 'System',
};

export const theme = {
    ...MD3LightTheme,
    fonts: configureFonts({ config: fontConfig }),
    colors: {
        ...MD3LightTheme.colors,
        primary: '#4361EE', // Modern vibrant Blue
        secondary: '#3A0CA3', // Deep purple/blue
        background: '#F8F9FA', // Off-white clean background
        surface: '#FFFFFF',
        text: '#1F2937',
        error: '#EF476F', // Vibrant red for errors
        success: '#06D6A0', // Vibrant green
        surfaceVariant: '#E9ECEF',
        outline: '#CED4DA',
    },
    roundness: 12, // Modern rounded corners
};
