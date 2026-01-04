import axios from 'axios';
import config from '../config/index.js';
import logger from '../config/logger.js';

/**
 * HTTP client for communicating with Python ML backend
 * Handles demand forecasting and waste risk predictions
 */
class PythonMLService {
    constructor() {
        this.client = axios.create({
            baseURL: config.pythonML.baseUrl,
            timeout: config.pythonML.timeout,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Request interceptor for logging
        this.client.interceptors.request.use(
            (config) => {
                logger.info(`Python ML Request: ${config.method.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => {
                logger.error('Python ML Request Error:', error);
                return Promise.reject(error);
            }
        );

        // Response interceptor for logging
        this.client.interceptors.response.use(
            (response) => {
                logger.info(`Python ML Response: ${response.status} ${response.config.url}`);
                return response;
            },
            (error) => {
                logger.error('Python ML Response Error:', error.message);
                return Promise.reject(error);
            }
        );
    }

    /**
     * Get demand forecast from Python ML service
     * @param {string} productId - Product ID
     * @param {string} storeId - Store ID
     * @param {number} horizon - Forecast horizon in days
     * @returns {Promise<Object>} Forecast data
     */
    async getDemandForecast(productId, storeId, horizon = 7) {
        try {
            const response = await this.client.post('/api/v1/forecast', {
                product_id: productId,
                store_id: storeId,
                horizon_days: horizon,
            });

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            logger.error(`Failed to get demand forecast for ${productId}:`, error.message);

            // Return fallback response
            return {
                success: false,
                error: error.message,
                data: null,
            };
        }
    }

    /**
     * Get waste risk prediction from Python ML service
     * @param {string} productId - Product ID
     * @param {string} storeId - Store ID
     * @param {Date} expiryDate - Product expiry date
     * @returns {Promise<Object>} Waste risk data
     */
    async getWasteRisk(productId, storeId, expiryDate) {
        try {
            const response = await this.client.post('/api/v1/waste-risk', {
                product_id: productId,
                store_id: storeId,
                expiry_date: expiryDate.toISOString(),
            });

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            logger.error(`Failed to get waste risk for ${productId}:`, error.message);

            // Return fallback response
            return {
                success: false,
                error: error.message,
                data: null,
            };
        }
    }

    /**
     * Get historical sales data from Python backend
     * @param {string} productId - Product ID
     * @param {string} storeId - Store ID
     * @param {number} days - Number of days of history
     * @returns {Promise<Object>} Historical sales data
     */
    async getHistoricalSales(productId, storeId, days = 30) {
        try {
            const response = await this.client.get('/api/v1/sales/history', {
                params: {
                    product_id: productId,
                    store_id: storeId,
                    days: days,
                },
            });

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            logger.error(`Failed to get historical sales for ${productId}:`, error.message);

            return {
                success: false,
                error: error.message,
                data: null,
            };
        }
    }

    /**
     * Check if Python ML service is available
     * @returns {Promise<boolean>} Service health status
     */
    async healthCheck() {
        try {
            const response = await this.client.get('/health', {
                timeout: 5000,
            });
            return response.status === 200;
        } catch (error) {
            logger.error('Python ML service health check failed:', error.message);
            return false;
        }
    }
}

// Export singleton instance
const pythonMLService = new PythonMLService();
export default pythonMLService;
