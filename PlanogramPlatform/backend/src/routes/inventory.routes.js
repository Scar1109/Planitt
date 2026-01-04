import express from 'express';
import InventorySnapshot from '../models/InventorySnapshot.js';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import { validate, schemas } from '../middleware/validation.js';
import logger from '../config/logger.js';

const router = express.Router();

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

        // Calculate average daily sales for the last 14 days for each product
        const twoWeeksAgo = new Date(latestDate);
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const salesAggregation = await Sale.aggregate([
            {
                $match: {
                    date: { $gte: twoWeeksAgo, $lte: latestDate }
                }
            },
            {
                $group: {
                    _id: "$sku",
                    totalSold: { $sum: "$unitsSold" },
                    salesDays: { $addToSet: "$date" }
                }
            },
            {
                $project: {
                    sku: "$_id",
                    totalSold: 1,
                    daysWithSales: { $size: "$salesDays" },
                    avgDailySales: {
                        $divide: ["$totalSold", { $max: [{ $size: "$salesDays" }, 1] }]
                    }
                }
            }
        ]);

        // Create a map of SKU to avg daily sales
        const salesMap = {};
        salesAggregation.forEach(s => {
            salesMap[s.sku] = {
                avgDailySales: Math.ceil(s.avgDailySales),
                totalSold: s.totalSold,
                daysWithSales: s.daysWithSales
            };
        });

        // Get product details
        const products = await Product.find().lean();
        const productMap = {};
        products.forEach(p => {
            productMap[p.sku] = p;
        });

        // Analyze low stock situations
        const lowStockAlerts = [];

        for (const snapshot of latestSnapshots) {
            const currentStock = snapshot.closingStock || 0;
            const salesData = salesMap[snapshot.sku] || { avgDailySales: 0, totalSold: 0 };
            const productInfo = productMap[snapshot.sku] || {};

            // Skip products with no sales history
            if (salesData.avgDailySales === 0) continue;

            const avgDailyDemand = salesData.avgDailySales;
            const daysOfStock = avgDailyDemand > 0 ? Math.floor(currentStock / avgDailyDemand) : 999;
            const weeklyDemand = avgDailyDemand * 7;

            // Determine alert level based on days of stock remaining
            let alertLevel = null;
            let alertMessage = "";
            let urgency = 0;

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

            if (alertLevel) {
                lowStockAlerts.push({
                    sku: snapshot.sku,
                    name: productInfo.productName || snapshot.sku,
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
                    soldQtyToday: snapshot.soldQty || 0,
                    discardedQty: snapshot.discardedQty || 0,
                    lastOrderQty: snapshot.orderPlacedQty || 0,
                    supplierLeadDays: snapshot.supplierLeadTimeDays || 3,
                    snapshotDate: latestDate
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
