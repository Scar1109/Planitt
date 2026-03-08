import express from 'express';
import InventorySnapshot from '../models/InventorySnapshot.js';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import { validate, schemas } from '../middleware/validation.js';
import logger from '../config/logger.js';
import axios from 'axios';
import { getInventorySummary, getDashboardKPIs } from '../controllers/inventory.controller.js';

const router = express.Router();

/**
 * @route   GET /api/inventory/summary
 * @desc    Get top-level inventory statistics
 * @access  Public
 */
router.get('/summary', getInventorySummary);

/**
 * @route   GET /api/inventory/dashboard-kpis
 * @desc    Get top-level dashboard statistics for the main home page
 * @access  Public
 */
router.get('/dashboard-kpis', getDashboardKPIs);

/**
 * @route   GET /api/inventory/low-stock-alerts
 * @desc    Get low stock alerts based on real inventory vs demand data
 * @access  Public
 */
router.get('/low-stock-alerts', async (req, res, next) => {
    try {
        const { limit = 10 } = req.query;

        // Get the most recent date with inventory data
        const latestInventory = await InventorySnapshot.findOne()
            .sort({ date: -1 })
            .select('date');

        if (!latestInventory) {
            return res.json({
                success: true,
                alerts: [],
                message: "No inventory data available"
            });
        }

        const latestDate = latestInventory.date;

        // Get all products with their latest inventory snapshot
        const latestSnapshots = await InventorySnapshot.find({ date: latestDate })
            .lean();

        // Get product details
        const products = await Product.find().lean();
        const productMap = {};
        products.forEach(p => {
            productMap[p.sku] = p;
        });

        // Analyze low stock situations
        const lowStockAlerts = [];

        for (const snapshot of latestSnapshots) {
            const sku = snapshot.sku || snapshot.SKU;
            if (!sku) continue;

            const currentStock = snapshot.closingStock ?? snapshot.ClosingStock ?? 0;
            const productInfo = productMap[sku] || {};

            // Utilize ML fields natively stored in the DB snapshot
            const avgDailyDemand = snapshot.avgDailySales7d ?? snapshot.AvgDailySales7d ?? 0;
            const reorderUrgencyRaw = snapshot.reorderUrgency || snapshot.ReorderUrgency;

            // Skip products with absolutely no baseline demand mapping
            if (avgDailyDemand === 0 && !reorderUrgencyRaw) continue;

            const daysOfStockRemainingRaw = snapshot.daysOfStockRemaining ?? snapshot.DaysOfStockRemaining;
            const daysOfStock = daysOfStockRemainingRaw !== undefined
                ? daysOfStockRemainingRaw
                : (avgDailyDemand > 0 ? Math.floor(currentStock / avgDailyDemand) : 999);
            const weeklyDemand = avgDailyDemand * 7;

            // Determine alert level based on ML urgency or fallback to daysOfStock
            let alertLevel = null;
            let alertMessage = "";
            let urgency = 0;

            if (reorderUrgencyRaw && reorderUrgencyRaw !== 'Low' && reorderUrgencyRaw !== 'None') {
                const mlUrgency = reorderUrgencyRaw.toLowerCase();
                if (mlUrgency === 'critical') {
                    alertLevel = "critical";
                    alertMessage = "Stockout imminent! Order immediately";
                    urgency = 3;
                } else if (mlUrgency === 'high') {
                    alertLevel = "high";
                    alertMessage = `High risk of stockout. Only ${daysOfStock} days left.`;
                    urgency = 2;
                } else if (mlUrgency === 'medium') {
                    alertLevel = "medium";
                    alertMessage = `${daysOfStock} days of stock - order soon`;
                    urgency = 1;
                }
            } else if (!reorderUrgencyRaw) {
                // Fallback basic logic if ML hasn't populated
                if (daysOfStock <= 1) {
                    alertLevel = "critical";
                    alertMessage = "Stockout imminent! Order immediately";
                    urgency = 3;
                } else if (daysOfStock <= 3) {
                    alertLevel = "high";
                    alertMessage = `Only ${daysOfStock} days of stock remaining`;
                    urgency = 2;
                } else if (daysOfStock <= 5) {
                    alertLevel = "medium";
                    alertMessage = `${daysOfStock} days of stock - order soon`;
                    urgency = 1;
                }
            }

            if (alertLevel) {
                lowStockAlerts.push({
                    sku: sku,
                    name: productInfo.productName || sku,
                    category: productInfo.category || 'Unknown',
                    brand: productInfo.brand || 'Unknown',
                    currentStock: Math.round(currentStock),
                    avgDailyDemand: Math.round(avgDailyDemand),
                    daysOfStock: daysOfStock,
                    weeklyDemand: Math.round(weeklyDemand),
                    suggestedOrder: Math.max(0, Math.round(weeklyDemand * 2 - currentStock)),
                    alertLevel,
                    alertMessage,
                    urgency,
                    soldQtyToday: snapshot.soldQty ?? snapshot.SoldQty ?? 0,
                    discardedQty: snapshot.discardedQty ?? snapshot.DiscardedQty ?? 0,
                    lastOrderQty: snapshot.orderPlacedQty ?? snapshot.OrderPlacedQty ?? 0,
                    supplierLeadDays: snapshot.supplierLeadTimeDays ?? snapshot.SupplierLeadTimeDays ?? 3,
                    snapshotDate: latestDate,
                    stockoutRisk: snapshot.stockoutRisk ?? snapshot.StockoutRisk ?? 0,
                    demandTrend: snapshot.demandTrend ?? snapshot.DemandTrend ?? 0
                });
            }
        }

        // Sort by urgency (critical first)
        lowStockAlerts.sort((a, b) => {
            if (b.urgency !== a.urgency) return b.urgency - a.urgency;
            return a.daysOfStock - b.daysOfStock;
        });

        const topAlerts = lowStockAlerts.slice(0, parseInt(limit));

        logger.info(`Found ${lowStockAlerts.length} low stock alerts, returning top ${topAlerts.length}`);

        res.json({
            success: true,
            alerts: topAlerts,
            totalLowStock: lowStockAlerts.length,
            summary: {
                critical: lowStockAlerts.filter(a => a.alertLevel === 'critical').length,
                high: lowStockAlerts.filter(a => a.alertLevel === 'high').length,
                medium: lowStockAlerts.filter(a => a.alertLevel === 'medium').length
            },
            dataDate: latestDate,
            analyzedProducts: latestSnapshots.length
        });

    } catch (error) {
        logger.error('Error fetching low stock alerts:', error);
        next(error);
    }
});


/**
 * @route   GET /api/inventory/replenishment/:storeId
 * @desc    Get JIT replenishment recommendations from ML
 * @access  Public
 */
router.get('/replenishment/:storeId', validate(schemas.storeIdParam), async (req, res, next) => {
    try {
        const { storeId } = req.params;
        const limit = parseInt(req.query.limit) || 20;

        // 1. Get the most recent date with inventory data
        const latestInventory = await InventorySnapshot.findOne()
            .sort({ date: -1 })
            .select('date');

        if (!latestInventory) {
            return res.json({ success: true, recommendations: [] });
        }

        const latestDate = latestInventory.date;

        // 2. Extract real inventory state and prioritize items
        // In 2025 data, ReorderUrgency is capitalized, so we need to match both casings
        const latestSnapshots = await InventorySnapshot.find({
            $or: [
                { date: latestDate },
                { Date: latestDate }
            ],
            $or: [
                { reorderUrgency: { $in: ["Critical", "High", "Medium", "critical", "high", "medium"] } },
                { ReorderUrgency: { $in: ["Critical", "High", "Medium", "critical", "high", "medium"] } }
            ]
        }).limit(limit).lean();

        // Also add some random products just to ensure we see the pipeline working
        // if no criticals exist
        if (latestSnapshots.length === 0) {
            const fallbackSnapshots = await InventorySnapshot.find({
                $or: [{ date: latestDate }, { Date: latestDate }]
            }).limit(limit).lean();
            latestSnapshots.push(...fallbackSnapshots);
        }

        // 3. Assemble products for Python
        const itemsList = [];
        const skus = latestSnapshots.map(s => s.sku || s.SKU).filter(Boolean);
        const products = await Product.find({ sku: { $in: skus } }).lean();
        const pMap = {};
        products.forEach(p => pMap[p.sku] = p);

        for (const s of latestSnapshots) {
            const sku = s.sku || s.SKU;
            if (!sku) continue;

            const p = pMap[sku] || {};
            itemsList.push({
                sku: sku,
                name: p.productName || p.name || sku,
                current_stock: s.closingStock ?? s.ClosingStock ?? 0,
                lead_time_days: s.supplierLeadTimeDays ?? s.SupplierLeadTimeDays ?? 3,
                shelf_life_days: p.typicalShelfLifeDays || 30
            });
        }

        // 4. Hit python ML algorithm
        const mlPayload = {
            store_id: storeId,
            items: itemsList,
            target_days: 14
        };

        const pyRes = await axios.post("http://127.0.0.1:8003/api/v1/replenishment", mlPayload);

        res.json({
            success: true,
            recommendations: pyRes.data.recommendations || []
        });

    } catch (error) {
        logger.error('Error in Replenishment Proxy Endpoint:', error.message);
        if (error.response) {
            logger.error('Python Error Detail:', error.response.data);
        }
        next(error);
    }
});


/**
 * @route   GET /api/inventory/:storeId
 * @desc    Get all inventory for a store
 * @access  Public
 */
router.get('/:storeId', validate(schemas.storeIdParam), async (req, res, next) => {
    try {
        const { storeId } = req.params;

        logger.info(`Getting inventory for store ${storeId}`);

        const inventory = await InventorySnapshot.find({ storeId })
            .sort({ snapshotDate: -1 });

        // Group by product and get latest snapshot for each
        const latestInventory = {};
        for (const item of inventory) {
            if (!latestInventory[item.productId]) {
                latestInventory[item.productId] = item;
            }
        }

        // Enrich with product details
        const enrichedInventory = await Promise.all(
            Object.values(latestInventory).map(async (inv) => {
                const product = await Product.findOne({ productId: inv.productId });
                return {
                    ...inv.toObject(),
                    productName: product?.name,
                    category: product?.category,
                };
            })
        );

        res.json({
            success: true,
            count: enrichedInventory.length,
            data: enrichedInventory,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /api/inventory/:storeId/:productId
 * @desc    Get inventory for a specific product at a store
 * @access  Public
 */
router.get('/:storeId/:productId', validate(schemas.productIdParam), async (req, res, next) => {
    try {
        const { storeId, productId } = req.params;

        logger.info(`Getting inventory for product ${productId} at store ${storeId}`);

        const inventory = await InventorySnapshot.findOne({
            storeId,
            productId,
        }).sort({ snapshotDate: -1 });

        if (!inventory) {
            return res.status(404).json({
                success: false,
                error: 'Inventory not found',
            });
        }

        // Get product details
        const product = await Product.findOne({ productId });

        res.json({
            success: true,
            data: {
                ...inventory.toObject(),
                productName: product?.name,
                category: product?.category,
                unitPrice: product?.unitPrice,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   POST /api/inventory/snapshot
 * @desc    Create a new inventory snapshot
 * @access  Public
 */
router.post('/snapshot', async (req, res, next) => {
    try {
        const snapshot = new InventorySnapshot(req.body);
        await snapshot.save();

        logger.info(`Created inventory snapshot for ${snapshot.productId} at ${snapshot.storeId}`);

        res.status(201).json({
            success: true,
            data: snapshot,
        });
    } catch (error) {
        next(error);
    }
});
export default router;
