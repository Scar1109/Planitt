import Product from '../../models/Product.js';
import InventorySnapshot from '../../models/InventorySnapshot.js';
import pythonMLService from '../../services/PythonMLService.js';
import logger from '../../config/logger.js';

/**
 * Tool implementations for Wastage Agent
 */

/**
 * Get products expiring soon at a store
 */
export async function getExpiringProducts({ storeId, days = 7 }) {
    try {
        logger.info(`Getting expiring products for store ${storeId}, within ${days} days`);

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        const expiringInventory = await InventorySnapshot.find({
            storeId,
            expiryDate: {
                $gte: new Date(),
                $lte: futureDate,
            },
            currentStock: { $gt: 0 },
        }).sort({ expiryDate: 1 });

        // Enrich with product details
        const enrichedProducts = await Promise.all(
            expiringInventory.map(async (inv) => {
                const product = await Product.findOne({ productId: inv.productId });
                return {
                    productId: inv.productId,
                    productName: product?.name || 'Unknown',
                    category: product?.category,
                    currentStock: inv.currentStock,
                    expiryDate: inv.expiryDate,
                    daysUntilExpiry: inv.daysUntilExpiry,
                };
            })
        );

        return {
            count: enrichedProducts.length,
            products: enrichedProducts,
        };
    } catch (error) {
        logger.error('Error getting expiring products:', error);
        return {
            error: error.message,
        };
    }
}

/**
 * Get waste risk prediction from Python ML service
 */
export async function getWasteRiskPrediction({ storeId, productId }) {
    try {
        logger.info(`Getting waste risk prediction for product ${productId || 'all'} at store ${storeId}`);

        // Get inventory data for the request
        const query = productId
            ? { storeId, productId }
            : { storeId };

        const inventory = await InventorySnapshot.find(query)
            .sort({ snapshotDate: -1 })
            .limit(100);

        if (inventory.length === 0) {
            return {
                predictions: [],
                message: 'No inventory data found',
            };
        }

        // Prepare inventory items for ML service
        const inventoryItems = inventory.map(inv => ({
            sku: inv.productId,
            store_id: inv.storeId,
            current_stock: inv.currentStock,
            days_to_expiry: inv.daysUntilExpiry || 7,
            avg_daily_sales: 10, // Default fallback
            old_stock_share: 0,
        }));

        const result = await pythonMLService.getWasteRisk(inventoryItems);

        if (!result.success) {
            return {
                error: 'ML Service Unavailable',
                message: 'Failed to retrieve waste risk prediction from ML engine.',
                details: result.error || 'Unknown error'
            };
        }

        return {
            predictions: result.data.predictions || [],
            total_at_risk_units: result.data.total_at_risk_units || 0,
            source: 'ml_model',
        };
    } catch (error) {
        logger.error('Error getting waste risk prediction:', error);
        return {
            error: error.message,
        };
    }
}

/**
 * Recommend markdown percentage based on days to expiry
 */
export async function recommendMarkdown({ productId, storeId, daysUntilExpiry }) {
    try {
        logger.info(`Calculating markdown for product ${productId}, ${daysUntilExpiry} days to expiry`);

        let discountPercent = 0;
        let action = 'no_action';
        let reasoning = '';

        if (daysUntilExpiry <= 1) {
            discountPercent = 50;
            action = 'emergency_markdown';
            reasoning = 'Product expires in 1 day or less - aggressive discount needed';
        } else if (daysUntilExpiry <= 3) {
            discountPercent = 30;
            action = 'high_markdown';
            reasoning = 'Product expires in 2-3 days - significant discount recommended';
        } else if (daysUntilExpiry <= 5) {
            discountPercent = 20;
            action = 'moderate_markdown';
            reasoning = 'Product expires in 4-5 days - moderate discount recommended';
        } else if (daysUntilExpiry <= 7) {
            discountPercent = 10;
            action = 'light_markdown';
            reasoning = 'Product expires in 6-7 days - light discount to accelerate sales';
        } else {
            action = 'monitor';
            reasoning = 'Product has sufficient shelf life - no discount needed yet';
        }

        return {
            productId,
            storeId,
            daysUntilExpiry,
            discountPercent,
            action,
            reasoning,
        };
    } catch (error) {
        logger.error('Error recommending markdown:', error);
        return {
            error: error.message,
        };
    }
}

/**
 * Suggest product bundles to reduce waste
 */
export async function suggestBundles({ storeId, productId }) {
    try {
        logger.info(`Suggesting bundles for store ${storeId}`);

        // Get products at risk
        const atRiskProducts = await InventorySnapshot.find({
            storeId,
            daysUntilExpiry: { $lte: 7 },
            currentStock: { $gt: 0 },
        }).limit(20);

        if (atRiskProducts.length === 0) {
            return {
                bundles: [],
                message: 'No products at risk currently',
            };
        }

        // Simple bundling logic: group by category
        const bundles = [];
        const categories = {};

        for (const inv of atRiskProducts) {
            const product = await Product.findOne({ productId: inv.productId });
            if (!product) continue;

            const category = product.category || 'Other';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push({
                productId: inv.productId,
                productName: product.name,
                currentStock: inv.currentStock,
                daysUntilExpiry: inv.daysUntilExpiry,
            });
        }

        // Create bundle recommendations
        for (const [category, products] of Object.entries(categories)) {
            if (products.length >= 2) {
                bundles.push({
                    bundleName: `${category} Combo`,
                    products: products.slice(0, 3),
                    suggestedDiscount: 15,
                    reasoning: `Bundle slow-moving ${category} items`,
                });
            }
        }

        return {
            bundles,
            count: bundles.length,
        };
    } catch (error) {
        logger.error('Error suggesting bundles:', error);
        return {
            error: error.message,
        };
    }
}

/**
 * Estimate waste impact
 */
export async function estimateWasteImpact({ storeId, days = 7 }) {
    try {
        logger.info(`Estimating waste impact for store ${storeId}, next ${days} days`);

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        const atRiskInventory = await InventorySnapshot.find({
            storeId,
            expiryDate: {
                $gte: new Date(),
                $lte: futureDate,
            },
            currentStock: { $gt: 0 },
        });

        let totalUnitsAtRisk = 0;
        let estimatedValue = 0;

        for (const inv of atRiskInventory) {
            const product = await Product.findOne({ productId: inv.productId });
            if (!product) continue;

            totalUnitsAtRisk += inv.currentStock;
            estimatedValue += inv.currentStock * (product.unitPrice || 0);
        }

        return {
            storeId,
            days,
            totalUnitsAtRisk,
            estimatedValueLKR: Math.round(estimatedValue),
            productsAtRisk: atRiskInventory.length,
        };
    } catch (error) {
        logger.error('Error estimating waste impact:', error);
        return {
            error: error.message,
        };
    }
}

/**
 * Tool definitions for OpenAI function calling
 */
export const wastageTools = [
    {
        type: 'function',
        function: {
            name: 'getExpiringProducts',
            description: 'Get products expiring soon at a store',
            parameters: {
                type: 'object',
                properties: {
                    storeId: {
                        type: 'string',
                        description: 'The store ID',
                    },
                    days: {
                        type: 'number',
                        description: 'Number of days to look ahead (default: 7)',
                    },
                },
                required: ['storeId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getWasteRiskPrediction',
            description: 'Get ML-powered waste risk prediction for products',
            parameters: {
                type: 'object',
                properties: {
                    storeId: {
                        type: 'string',
                        description: 'The store ID',
                    },
                    productId: {
                        type: 'string',
                        description: 'Optional product ID (if analyzing specific product)',
                    },
                },
                required: ['storeId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'recommendMarkdown',
            description: 'Calculate optimal markdown/discount percentage based on expiry',
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
                    daysUntilExpiry: {
                        type: 'number',
                        description: 'Days until product expires',
                    },
                },
                required: ['productId', 'storeId', 'daysUntilExpiry'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'suggestBundles',
            description: 'Suggest product bundles to reduce waste',
            parameters: {
                type: 'object',
                properties: {
                    storeId: {
                        type: 'string',
                        description: 'The store ID',
                    },
                    productId: {
                        type: 'string',
                        description: 'Optional product ID to find bundles for',
                    },
                },
                required: ['storeId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'estimateWasteImpact',
            description: 'Estimate financial impact of potential waste',
            parameters: {
                type: 'object',
                properties: {
                    storeId: {
                        type: 'string',
                        description: 'The store ID',
                    },
                    days: {
                        type: 'number',
                        description: 'Number of days to forecast (default: 7)',
                    },
                },
                required: ['storeId'],
            },
        },
    },
];
