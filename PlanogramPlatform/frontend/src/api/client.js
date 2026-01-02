import axios from 'axios';

// Python ML Service (Demand Forecasting) - port 8000
const ML_API_BASE = 'http://localhost:8000';

// Node.js Backend (Auth, Users, Stores) - port 3000
const NODE_API_BASE = 'http://localhost:3000/api';

// ML Service axios instance
const mlClient = axios.create({
    baseURL: ML_API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Node.js Backend axios instance
const nodeClient = axios.create({
    baseURL: NODE_API_BASE,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// API client with helper methods
export const api = {
    // ============================================
    // ML Service Endpoints (Python - port 8000)
    // ============================================

    // Get demand forecast for a product
    async getForecast(productId, storeId = 'STORE-001', horizonDays = 14) {
        const response = await mlClient.post('/api/v1/forecast', {
            product_id: productId,
            store_id: storeId,
            horizon_days: horizonDays,
            include_weather: true,
        });
        return response.data;
    },

    // Get waste risk predictions
    async getWasteRisk(inventory, includeRecommendations = true) {
        const response = await mlClient.post('/api/v1/waste-risk', {
            inventory,
            include_recommendations: includeRecommendations,
        });
        return response.data;
    },

    // Get model metrics
    async getMetrics() {
        const response = await mlClient.get('/api/v1/metrics');
        return response.data;
    },

    // Get products list from MongoDB (Node.js backend)
    async getProducts(category = null, search = null, limit = 500) {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (limit) params.append('limit', limit.toString());

        const response = await nodeClient.get(`/products?${params.toString()}`);
        return response.data;
    },

    // Health check
    async healthCheck() {
        const response = await mlClient.get('/health');
        return response.data;
    },

    // Get weather data from backend (which calls OpenWeatherMap or Open-Meteo)
    async getWeather(city = 'Colombo', days = 5) {
        try {
            const params = new URLSearchParams();
            params.append('city', city);
            params.append('country_code', 'LK');

            console.log('📡 API Client: Calling /weather endpoint...');
            const response = await nodeClient.get(`/weather?${params.toString()}`);
            console.log('📡 API Client: Weather response:', response.data);
            return response.data;
        } catch (error) {
            console.error('📡 API Client: Weather fetch failed:', error.message);
            throw error;
        }
    },

    // Get events/holidays from backend (Sri Lankan holidays, Poya days, etc.)
    async getEvents(city = 'Colombo', countryCode = 'LK', days = 30) {
        const params = new URLSearchParams();
        params.append('city', city);
        params.append('country_code', countryCode);
        params.append('days', days.toString());

        const response = await nodeClient.get(`/events?${params.toString()}`);
        return response.data;
    },

    // Get comprehensive external factors analysis (past impact + future predictions)
    async getExternalFactorsAnalysis(days = 30) {
        try {
            const response = await nodeClient.get(`/external-factors?days=${days}`);
            return response.data;
        } catch (error) {
            console.error('External factors analysis error:', error);
            throw error;
        }
    },

    // Get agent-style inventory forecast (uses ML forecast + wraps in agent format)
    async getAgentInventoryForecast(productId, storeId = 'STORE-001', horizonDays = 7) {
        try {
            // Call the ML service forecast endpoint
            const forecastResponse = await mlClient.post('/api/v1/forecast', {
                product_id: productId,
                store_id: storeId,
                horizon_days: horizonDays,
                include_weather: true,
            });

            const forecasts = forecastResponse.data.forecasts || [];
            const metrics = forecastResponse.data.accuracy_metrics || {};

            // Calculate total predicted demand
            const totalDemand = forecasts.reduce((sum, f) => sum + f.forecast, 0);
            const avgDailyDemand = totalDemand / (forecasts.length || 1);

            // Generate recommendation based on forecast
            let recommendation = 'sufficient';
            let recommendationText = '';

            if (avgDailyDemand > 100) {
                recommendation = 'restock';
                recommendationText = 'High demand expected. Consider increasing stock levels.';
            } else if (avgDailyDemand > 50) {
                recommendation = 'monitor';
                recommendationText = 'Moderate demand expected. Monitor inventory levels.';
            } else {
                recommendation = 'sufficient';
                recommendationText = 'Stock levels appear sufficient for forecasted demand.';
            }

            // Format day-by-day forecast for message
            const dayForecasts = forecasts.map((f, i) =>
                `- Day ${i + 1}: ${Math.round(f.forecast)} units`
            ).join('\n');

            // Build agent-style response
            return {
                success: true,
                message: `Based on ML analysis for product ${productId}, here is the ${horizonDays}-day demand forecast:\n\n${dayForecasts}\n\n${recommendationText}`,
                data: {
                    recommendation: recommendation,
                    quantity: Math.round(totalDemand),
                    confidence: metrics.r2 || 0.85,
                    forecasts: forecasts,
                },
                metadata: {
                    agent: 'InventoryForecastAgent',
                    iterations: 1,
                    tokensUsed: 0, // ML model, not LLM
                    productId: productId,
                    horizonDays: horizonDays,
                },
            };
        } catch (error) {
            console.error('Agent forecast error:', error);
            return {
                success: false,
                message: error.response?.data?.detail || error.message || 'Failed to generate forecast',
                data: null,
                metadata: {
                    agent: 'InventoryForecastAgent',
                    error: true,
                },
            };
        }
    },

    // Auth endpoints are handled by AuthContext using services/api.js
};

// Export both clients for direct use if needed
export { mlClient, nodeClient };

export default api;
