import Product from '../../models/Product.js';
import InventorySnapshot from '../../models/InventorySnapshot.js';
import Sale from '../../models/Sale.js';
import pythonMLService from '../../services/PythonMLService.js';
import logger from '../../config/logger.js';

/**
 * Tool implementations for Inventory Agent
 */

/**
 * Get current inventory for a product at a store
 */
export async function getCurrentInventory({ productId, storeId }) {
    try {
        logger.info(`Getting inventory for product ${productId}`);

        // Get product details using 'sku' field (matching MongoDB schema)
        const product = await Product.findOne({ sku: productId });
        if (!product) {
            return {
                error: `Product ${productId} not found in database`,
            };
        }

        // Get latest inventory snapshot using 'sku' and 'date' fields
        const inventory = await InventorySnapshot.findOne({
            sku: productId,
        }).sort({ date: -1 });

        if (!inventory) {
            return {
                productName: product.productName,
                currentStock: 0,
                reorderPoint: 0,
                message: 'No inventory data found for this product',
            };
        }

        // Calculate reorder point based on average daily sales
        const avgDailySales = inventory.soldQty || 10;
        const leadTime = inventory.supplierLeadTimeDays || 3;
        const safetyStock = Math.ceil(avgDailySales * 0.3);
        const reorderPoint = Math.ceil((avgDailySales * leadTime) + safetyStock);

        return {
            productId: product.sku,
            productName: product.productName,
            category: product.category,
            currentStock: inventory.closingStock || 0,
            openingStock: inventory.openingStock || 0,
            soldQty: inventory.soldQty || 0,
            receivedQty: inventory.receivedQty || 0,
            discardedQty: inventory.discardedQty || 0,
            reorderPoint: reorderPoint,
            maxStock: product.maxShelfCapacityUnits || 100,
            needsReorder: (inventory.closingStock || 0) <= reorderPoint,
            oldStockShare: inventory.oldStockShare || 0,
            lastUpdated: inventory.date,
        };
    } catch (error) {
        logger.error('Error getting current inventory:', error);
        return {
            error: error.message,
        };
    }
}

/**
 * Get demand forecast from Python ML service
 */
export async function getDemandForecast({ productId, storeId, horizon = 7 }) {
    try {
        logger.info(`Getting forecast for product ${productId}, horizon ${horizon} days`);

        const result = await pythonMLService.getDemandForecast(productId, storeId, horizon);

        if (!result.success) {
            // Return mock data as fallback
            return {
                forecast: Array(horizon).fill(0).map(() => Math.floor(Math.random() * 20) + 10),
                confidence: 0.5,
                source: 'fallback',
                message: 'Using fallback forecast - Python service unavailable',
            };
        }

        return {
            forecast: result.data.forecast || result.data.predictions,
            confidence: result.data.confidence || 0.8,
            source: 'ml_model',
        };
    } catch (error) {
        logger.error('Error getting demand forecast:', error);
        return {
            error: error.message,
        };
    }
}

/**
 * Get historical sales data
 */
export async function getHistoricalSales({ productId, storeId, days = 30 }) {
    try {
        logger.info(`Getting historical sales for product ${productId}, last ${days} days`);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Use 'sku' and 'date' fields matching MongoDB schema
        const sales = await Sale.find({
            sku: productId,
            date: { $gte: startDate },
        }).sort({ date: -1 });

        // Calculate statistics using correct field names
        const totalQuantity = sales.reduce((sum, sale) => sum + (sale.unitsSold || 0), 0);
        const totalRevenue = sales.reduce((sum, sale) => sum + ((sale.unitsSold || 0) * (sale.unitPriceLKR || 0)), 0);
        const avgDailySales = sales.length > 0 ? totalQuantity / days : 0;

        // Group by day
        const dailySales = {};
        sales.forEach(sale => {
            const dateKey = sale.date.toISOString().split('T')[0];
            if (!dailySales[dateKey]) {
                dailySales[dateKey] = 0;
            }
            dailySales[dateKey] += sale.unitsSold || 0;
        });

        return {
            totalQuantity,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            avgDailySales: Math.round(avgDailySales * 10) / 10,
            numberOfDays: days,
            numberOfTransactions: sales.length,
            dailySales,
        };
    } catch (error) {
        logger.error('Error getting historical sales:', error);
        return {
            error: error.message,
        };
    }
}

/**
 * Calculate optimal reorder point and quantity
 */
export async function calculateReorderPoint({ productId, storeId, leadTimeDays = 3 }) {
    try {
        logger.info(`Calculating reorder point for product ${productId}`);

        // Get historical sales to calculate average demand
        const salesData = await getHistoricalSales({ productId, storeId, days: 30 });

        if (salesData.error) {
            return salesData;
        }

        const avgDailySales = salesData.avgDailySales || 10;

        // Calculate safety stock (30% of average daily demand)
        const safetyStock = Math.ceil(avgDailySales * 0.3);

        // Calculate reorder point
        const reorderPoint = Math.ceil((avgDailySales * leadTimeDays) + safetyStock);

        // Calculate economic order quantity (simplified)
        const orderQuantity = Math.ceil(avgDailySales * 7); // 1 week supply

        return {
            avgDailySales,
            safetyStock,
            reorderPoint,
            recommendedOrderQuantity: orderQuantity,
            leadTimeDays,
        };
    } catch (error) {
        logger.error('Error calculating reorder point:', error);
        return {
            error: error.message,
        };
    }
}

/**
 * Analyze demand trends
 */
export async function analyzeTrends({ productId, storeId }) {
    try {
        logger.info(`Analyzing trends for product ${productId}`);

        // Get sales for last 60 days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 60);

        // Use 'sku' and 'date' fields matching MongoDB schema
        const sales = await Sale.find({
            sku: productId,
            date: { $gte: startDate },
        }).sort({ date: 1 });

        if (sales.length === 0) {
            return {
                trend: 'stable',
                message: 'Insufficient data for trend analysis - no sales found in last 60 days',
            };
        }

        // Split into two periods
        const midpoint = Math.floor(sales.length / 2);
        const firstHalf = sales.slice(0, midpoint);
        const secondHalf = sales.slice(midpoint);

        const firstHalfAvg = firstHalf.length > 0
            ? firstHalf.reduce((sum, s) => sum + (s.unitsSold || 0), 0) / firstHalf.length
            : 0;
        const secondHalfAvg = secondHalf.length > 0
            ? secondHalf.reduce((sum, s) => sum + (s.unitsSold || 0), 0) / secondHalf.length
            : 0;

        // Calculate trend
        const changePercent = firstHalfAvg > 0
            ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
            : 0;

        let trend = 'stable';
        if (changePercent > 10) trend = 'increasing';
        else if (changePercent < -10) trend = 'decreasing';

        return {
            trend,
            changePercent: Math.round(changePercent * 10) / 10,
            firstPeriodAvg: Math.round(firstHalfAvg * 10) / 10,
            secondPeriodAvg: Math.round(secondHalfAvg * 10) / 10,
            totalSalesRecords: sales.length,
            message: `Demand is ${trend} (${changePercent > 0 ? '+' : ''}${Math.round(changePercent)}%)`,
        };
    } catch (error) {
        logger.error('Error analyzing trends:', error);
        return {
            error: error.message,
        };
    }
}

/**
 * Tool definitions for OpenAI function calling
 */
export const inventoryTools = [
    {
        type: 'function',
        function: {
            name: 'getCurrentInventory',
            description: 'Get current stock levels for a product at a specific store',
            parameters: {
                type: 'object',
                properties: {
                    productId: {
                        type: 'string',
                        description: 'The product ID',
                    },
                    storeId: {
                        type: 'string',
                        description: 'The store ID',
                    },
                },
                required: ['productId', 'storeId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getDemandForecast',
            description: 'Get ML-powered demand forecast for a product',
            parameters: {
                type: 'object',
                properties: {
                    productId: {
                        type: 'string',
                        description: 'The product ID',
                    },
                    storeId: {
                        type: 'string',
                        description: 'The store ID',
                    },
                    horizon: {
                        type: 'number',
                        description: 'Forecast horizon in days (default: 7)',
                    },
                },
                required: ['productId', 'storeId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getHistoricalSales',
            description: 'Get historical sales data for a product',
            parameters: {
                type: 'object',
                properties: {
                    productId: {
                        type: 'string',
                        description: 'The product ID',
                    },
                    storeId: {
                        type: 'string',
                        description: 'The store ID',
                    },
                    days: {
                        type: 'number',
                        description: 'Number of days of history (default: 30)',
                    },
                },
                required: ['productId', 'storeId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'calculateReorderPoint',
            description: 'Calculate optimal reorder point and quantity',
            parameters: {
                type: 'object',
                properties: {
                    productId: {
                        type: 'string',
                        description: 'The product ID',
                    },
                    storeId: {
                        type: 'string',
                        description: 'The store ID',
                    },
                    leadTimeDays: {
                        type: 'number',
                        description: 'Lead time in days (default: 3)',
                    },
                },
                required: ['productId', 'storeId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'analyzeTrends',
            description: 'Analyze demand trends for a product',
            parameters: {
                type: 'object',
                properties: {
                    productId: {
                        type: 'string',
                        description: 'The product ID',
                    },
                    storeId: {
                        type: 'string',
                        description: 'The store ID',
                    },
                },
                required: ['productId', 'storeId'],
            },
        },
    },
];
