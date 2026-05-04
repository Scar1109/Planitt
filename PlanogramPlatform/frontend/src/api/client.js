import axios from 'axios';

// Python ML Service (Demand Forecasting) - port 8000
const ML_API_BASE = 'http://localhost:8003';

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

    // Get batch forecast for multiple products (for Demand Patterns component)
    async getBatchForecast(storeId = 'STORE-001', productIds = [], horizonDays = 14) {
        try {
            const response = await mlClient.post('/api/v1/batch-forecast', {
                store_id: storeId,
                product_ids: productIds,
                horizon_days: horizonDays,
            });
            return response.data;
        } catch (error) {
            console.error('Batch forecast error:', error);
            // Fallback: fetch individual forecasts
            const results = await Promise.all(
                productIds.map(async (productId) => {
                    try {
                        const forecast = await this.getForecast(productId, storeId, horizonDays);
                        return { product_id: productId, forecasts: forecast.forecasts || [], error: null };
                    } catch (e) {
                        return { product_id: productId, forecasts: [], error: e.message };
                    }
                })
            );
            return { store_id: storeId, results, model_version: '2.0.0', total_products: productIds.length, successful: results.filter(r => !r.error).length };
        }
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
    async getProducts(category = null, search = null, limit = 500, sortBy = null) {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (limit) params.append('limit', limit.toString());
        if (sortBy) params.append('sortBy', sortBy);

        const response = await nodeClient.get(`/inventory/products?${params.toString()}`);
        return response.data;
    },

    // Get low stock alerts from real inventory data
    async getLowStockAlerts(limit = 10) {
        try {
            const response = await nodeClient.get(`/inventory/low-stock-alerts?limit=${limit}`);
            return response.data;
        } catch (error) {
            console.error('Low stock alerts error:', error);
            throw error;
        }
    },

    // Get JIT replenishment queue
    async getReplenishment(storeId = 'STORE-001', limit = 20) {
        try {
            const response = await nodeClient.get(`/inventory/replenishment/${storeId}?limit=${limit}`);
            return response.data;
        } catch (error) {
            console.error('Failed to get replenishment queue:', error);
            throw error;
        }
    },

    // Get inventory statistics summary
    async getInventorySummary() {
        try {
            const response = await nodeClient.get(`/inventory/summary`);
            return response.data;
        } catch (error) {
            console.error('Inventory summary error:', error);
            throw error;
        }
    },

    // Get all inventory for a store
    async getInventoryForStore(storeId = 'STORE-001') {
        try {
            const response = await nodeClient.get(`/inventory/${storeId}`);
            return response.data;
        } catch (error) {
            console.error('Inventory list error:', error);
            throw error;
        }
    },

    // Get top-level dashboard statistics for the main home page
    async getDashboardKpis() {
        try {
            const response = await nodeClient.get('/inventory/dashboard-kpis');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch dashboard KPIs:', error);
            throw error;
        }
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

    // ============================================
    // Adaptive Learning Feedback Controller
    // ============================================

    // Get adaptive learning health metrics and analytics
    async getFeedbackAnalytics() {
        try {
            const response = await mlClient.get('/api/v1/feedback/analytics');
            return response.data;
        } catch (error) {
            console.error('Feedback analytics error:', error);
            throw error;
        }
    },

    // Trigger manual evaluation of forecast outcomes
    async triggerFeedbackEvaluation() {
        try {
            const response = await mlClient.post('/api/v1/feedback/evaluate');
            return response.data;
        } catch (error) {
            console.error('Feedback evaluation error:', error);
            throw error;
        }
    },

    // Trigger full background model retraining using latest data
    async triggerModelRetraining() {
        try {
            const response = await mlClient.post('/api/v1/model/retrain');
            return response.data;
        } catch (error) {
            console.error('Model retraining API error:', error);
            throw error;
        }
    },

    // Get per-SKU learning history
    async getSKUFeedback(sku) {
        try {
            const response = await mlClient.get(`/api/v1/feedback/sku/${sku}`);
            return response.data;
        } catch (error) {
            console.error('SKU feedback error:', error);
            throw error;
        }
    },

    // Submit natural language manual feedback override
    async submitManualFeedback(feedbackText) {
        try {
            const response = await mlClient.post('/api/v1/feedback/manual-override', {
                feedback_text: feedbackText
            });
            return response.data;
        } catch (error) {
            console.error('Manual feedback error:', error);
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
            const history = forecastResponse.data.history || [];

            // Get product info for human-readable name
            let productName = productId;
            try {
                const productsResponse = await nodeClient.get(`/products?limit=1000`);
                const product = productsResponse.data?.data?.find(p => p.sku === productId);
                if (product) {
                    productName = product.productName || product.name || productId;
                }
            } catch (e) {
                // Use SKU as fallback
            }

            // Calculate insights
            const totalDemand = forecasts.reduce((sum, f) => sum + f.forecast, 0);
            const avgDailyDemand = totalDemand / (forecasts.length || 1);
            const roundedTotal = Math.round(totalDemand);
            const roundedAvg = Math.round(avgDailyDemand);

            // Find peak demand day
            let peakDay = null;
            let peakDemand = 0;
            forecasts.forEach(f => {
                if (f.forecast > peakDemand) {
                    peakDemand = f.forecast;
                    peakDay = f.date;
                }
            });

            // Format peak day for display
            const peakDayFormatted = peakDay ? new Date(peakDay).toLocaleDateString('en-US', {
                weekday: 'long', month: 'short', day: 'numeric'
            }) : 'Unknown';

            // Get historical average for comparison
            const historyTotal = history.reduce((sum, h) => sum + (h.actual_sales || 0), 0);
            const historyAvg = history.length > 0 ? historyTotal / history.length : avgDailyDemand;
            const demandTrend = ((avgDailyDemand - historyAvg) / historyAvg * 100).toFixed(0);
            const trendDirection = demandTrend >= 0 ? 'increase' : 'decrease';
            const trendText = Math.abs(demandTrend) > 5
                ? `${Math.abs(demandTrend)}% ${trendDirection} compared to recent sales`
                : 'stable compared to recent sales';

            // Generate human-readable recommendation
            let recommendation = 'sufficient';
            let urgency = 'low';
            let actionTitle = '';
            let actionDetails = '';
            let orderSuggestion = '';

            // Determine next business day for ordering
            const today = new Date();
            const orderByDate = new Date(today);
            orderByDate.setDate(orderByDate.getDate() + Math.max(1, Math.floor(horizonDays / 3)));
            const orderByDay = orderByDate.toLocaleDateString('en-US', { weekday: 'long' });

            if (avgDailyDemand > 100) {
                recommendation = 'restock';
                urgency = 'high';
                actionTitle = '🚨 Urgent: High Demand Expected';
                actionDetails = `You'll need approximately ${roundedTotal} units over the next ${horizonDays} days. Peak demand is expected on ${peakDayFormatted} with ${Math.round(peakDemand)} units.`;
                orderSuggestion = `Place your order by ${orderByDay} to ensure stock arrives before the rush.`;
            } else if (avgDailyDemand > 50) {
                recommendation = 'monitor';
                urgency = 'medium';
                actionTitle = '⚡ Attention: Moderate Demand';
                actionDetails = `Expected demand is ${roundedTotal} units over ${horizonDays} days, averaging ${roundedAvg} units daily. This is ${trendText}.`;
                orderSuggestion = `Consider ordering before ${orderByDay} if current stock is below ${roundedTotal} units.`;
            } else if (avgDailyDemand > 20) {
                recommendation = 'sufficient';
                urgency = 'low';
                actionTitle = '✅ Stock Looks Good';
                actionDetails = `Normal demand expected: ${roundedTotal} units over ${horizonDays} days (${roundedAvg} units/day). This is ${trendText}.`;
                orderSuggestion = `Reorder when stock falls below ${roundedAvg * 3} units to maintain 3-day buffer.`;
            } else {
                recommendation = 'sufficient';
                urgency = 'low';
                actionTitle = '✅ Low Demand Period';
                actionDetails = `Light demand expected: only ${roundedTotal} units needed over ${horizonDays} days. Avoid overstocking to reduce waste risk.`;
                orderSuggestion = `No immediate reorder needed. Check again in ${Math.min(horizonDays, 5)} days.`;
            }

            const dayByDaySummary = forecasts.slice(0, 5).map(f => {
                const date = new Date(f.date);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const units = Math.round(f.forecast);
                const label = units > avgDailyDemand * 1.2 ? '📈' : units < avgDailyDemand * 0.8 ? '📉' : '';
                return `${dayName} (${dateStr}): ${units} units ${label}`;
            }).join(' → ');

            const reasons = forecastResponse.data.analysis_reasons || [];

            // Build agent-style response with human-readable message
            const message = `**${actionTitle}**

📦 **${productName}** - ${horizonDays}-Day Forecast

${actionDetails}

📊 **Daily Breakdown**: ${dayByDaySummary}

💡 **Recommendation**: ${orderSuggestion}`;

            return {
                success: true,
                message: message,
                data: {
                    recommendation: recommendation,
                    quantity: roundedTotal,
                    confidence: metrics.mape ? Math.max(0.5, 1 - metrics.mape / 100) : 0.85,
                    forecasts: forecasts,
                    analysis_reasons: reasons,
                    insights: {
                        avgDaily: roundedAvg,
                        peakDay: peakDayFormatted,
                        peakDemand: Math.round(peakDemand),
                        trendPercent: parseFloat(demandTrend),
                        urgency: urgency,
                    }
                },
                metadata: {
                    agent: 'SmartReplan+ AI',
                    iterations: 1,
                    tokensUsed: 0,
                    productId: productId,
                    productName: productName,
                    horizonDays: horizonDays,
                },
            };
        } catch (error) {
            console.error('Agent forecast error:', error);
            return {
                success: false,
                message: `❌ Could not generate forecast for this product. ${error.response?.data?.detail || error.message || 'Please try again.'}\n\n💡 **Tip**: Make sure the product exists in our ML training data.`,
                data: null,
                metadata: {
                    agent: 'SmartReplan+ AI',
                    error: true,
                },
            };
        }
    },

    // ============================================
    // Wastage Prevention System
    // ============================================

    // Get aggregated wastage dashboard data (KPIs, charts, risk items)
    async getWastageDashboard(storeId = 'STORE-001') {
        try {
            const response = await nodeClient.get(`/wastage/dashboard/${storeId}`);
            return response.data;
        } catch (error) {
            console.error('Wastage dashboard error:', error);
            throw error;
        }
    },

    // Get products expiring soon
    async getExpiringProducts(storeId = 'STORE-001', days = 7) {
        try {
            const response = await nodeClient.get(`/wastage/expiring/${storeId}?days=${days}`);
            return response.data;
        } catch (error) {
            console.error('Expiring products error:', error);
            throw error;
        }
    },

    // Apply a wastage prevention action (markdown, donate, bundle)
    async applyWastageAction({ productId, storeId, actionType, discountPercent, targetQuantity }) {
        try {
            const response = await nodeClient.post('/wastage/action', {
                productId,
                storeId,
                actionType,
                discountPercent,
                targetQuantity,
            });
            return response.data;
        } catch (error) {
            console.error('Wastage action error:', error);
            throw error;
        }
    },

    // Get AI-driven smart insight for order reduction
    async getSmartInsight(storeId = 'STORE-001') {
        try {
            const response = await mlClient.post('/api/v1/wastage/smart-insight', {
                store_id: storeId,
            });
            return response.data;
        } catch (error) {
            console.error('Smart insight error:', error);
            throw error;
        }
    },

    // Get AI-powered optimal discount for a near-expiry product
    async getSmartDiscount({ sku, currentStock, daysToExpiry, basePrice, costPrice }) {
        try {
            const response = await nodeClient.post('/wastage/smart-discount', {
                sku,
                currentStock,
                daysToExpiry,
                basePrice,
                costPrice,
            });
            return response.data;
        } catch (error) {
            console.error('Smart discount error:', error);
            throw error;
        }
    },

    // Batch create AI-recommended promotions for near-expiry items
    async autoPromoteRiskItems(items, storeId = 'STORE-001') {
        try {
            const response = await nodeClient.post('/wastage/auto-promote', {
                items,
                storeId,
            });
            return response.data;
        } catch (error) {
            console.error('Auto-promote error:', error);
            throw error;
        }
    },

    // Auth endpoints are handled by AuthContext using services/api.js
};

// Export both clients for direct use if needed
export { mlClient, nodeClient };

export default api;
