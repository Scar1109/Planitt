import AsyncStorage from '@react-native-async-storage/async-storage';

// Default fallback if not set in .env
let API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.4:3000';

export const getApiUrl = () => API_BASE_URL;
export const getMlApiUrl = () => API_BASE_URL.replace(':3000', ':8003');

export const setApiUrl = async (url) => {
    // Basic validation to ensure it has http/https
    let formattedUrl = url.trim();
    if (formattedUrl && !formattedUrl.startsWith('http')) {
        formattedUrl = `http://${formattedUrl}`;
    }
    API_BASE_URL = formattedUrl;
    await AsyncStorage.setItem('API_BASE_URL', formattedUrl);
};

export const loadApiUrl = async () => {
    try {
        const stored = await AsyncStorage.getItem('API_BASE_URL');
        if (stored) {
            API_BASE_URL = stored;
        }
    } catch (e) {
        console.log("Failed to load API URL from storage", e);
    }
};
