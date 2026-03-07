import express from 'express';
import InventorySnapshot from '../models/InventorySnapshot.js';
import Product from '../models/Product.js';
import Promotion from '../models/Promotion.js';
import pythonMLService from '../services/PythonMLService.js';
import { validate, schemas } from '../middleware/validation.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * @route   GET /api/wastage/expiring/:storeId
 * @desc    Get products expiring soon at a store
 * @access  Public
 */
router.get('/expiring/:storeId', validate(schemas.storeIdParam), async (req, res, next) => {
    try {
        const { storeId } = req.params;
        const days = parseInt(req.query.days) || 7;

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
                    ...inv.toObject(),
                    productName: product?.name,
                    category: product?.category,
                    unitPrice: product?.unitPrice,
                    daysUntilExpiry: inv.daysUntilExpiry,
                };
            })
        );

        res.json({
            success: true,
            count: enrichedProducts.length,
            data: enrichedProducts,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /api/wastage/risk/:storeId/:productId
 * @desc    Get waste risk for a specific product
 * @access  Public
 */
router.get('/risk/:storeId/:productId', validate(schemas.productIdParam), async (req, res, next) => {
    try {
        const { storeId, productId } = req.params;

        logger.info(`Getting waste risk for product ${productId} at store ${storeId}`);

        const inventory = await InventorySnapshot.findOne({
            storeId,
            productId,
        }).sort({ snapshotDate: -1 });

        if (!inventory) {
            return res.status(404).json({
                success: false,
                error: 'Product inventory not found',
            });
        }

        const product = await Product.findOne({ productId });

        // Calculate simple risk score based on days until expiry
        let riskLevel = 'low';
        let riskScore = 0;

        if (inventory.expiryDate) {
            const daysUntilExpiry = inventory.daysUntilExpiry || 0;

            if (daysUntilExpiry <= 1) {
                riskLevel = 'critical';
                riskScore = 0.9;
            } else if (daysUntilExpiry <= 3) {
                riskLevel = 'high';
                riskScore = 0.7;
            } else if (daysUntilExpiry <= 7) {
                riskLevel = 'medium';
                riskScore = 0.4;
            } else {
                riskLevel = 'low';
                riskScore = 0.2;
            }
        }

        res.json({
            success: true,
            data: {
                productId,
                productName: product?.name,
                currentStock: inventory.currentStock,
                expiryDate: inventory.expiryDate,
                daysUntilExpiry: inventory.daysUntilExpiry,
                riskLevel,
                riskScore,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   POST /api/wastage/action
 * @desc    Record a waste prevention action (markdown, donation, etc.)
 * @access  Public
 */
router.post('/action', async (req, res, next) => {
    try {
        const { productId, storeId, actionType, discountPercent, targetQuantity } = req.body;

        logger.info(`Recording waste action: ${actionType} for ${productId}`);

        // Create a promotion record
        const promotion = new Promotion({
            promotionId: `WASTE_${Date.now()}`,
            productId,
            storeId,
            promotionType: actionType === 'donate' ? 'clearance' : 'markdown',
            discountPercent: discountPercent || 0,
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            reason: 'expiry',
            targetQuantity,
            isActive: true,
        });

        await promotion.save();

        res.status(201).json({
            success: true,
            message: 'Waste prevention action recorded',
            data: promotion,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /api/wastage/dashboard/:storeId
 * @desc    Get aggregated wastage dashboard data (KPIs, charts)
 * @access  Public
 */
router.get('/dashboard/:storeId', async (req, res, next) => {
    try {
        const { storeId } = req.params;
        const now = new Date();
        const dbCol = InventorySnapshot.collection;

        // --- Monthly Wastage (kg) ---
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyInventory = await dbCol.find({
            sku: { $exists: true },
            date: { $gte: monthStart, $lte: now },
            DiscardedQty: { $gt: 0 },
        }).toArray();
        const monthlyWastageKg = monthlyInventory.reduce((sum, inv) => sum + (inv.DiscardedQty || 0), 0);

        // Previous month for comparison
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const prevMonthInventory = await dbCol.find({
            sku: { $exists: true },
            date: { $gte: prevMonthStart, $lte: prevMonthEnd },
            DiscardedQty: { $gt: 0 },
        }).toArray();
        const prevMonthlyWastageKg = prevMonthInventory.reduce((sum, inv) => sum + (inv.DiscardedQty || 0), 0);
        const wastageChangePercent = prevMonthlyWastageKg > 0
            ? Math.round(((monthlyWastageKg - prevMonthlyWastageKg) / prevMonthlyWastageKg) * 100)
            : 0;

        // --- Value at Risk (next 7 days) ---
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const atRiskInventory = await dbCol.find({
            sku: { $exists: true },
            DaysToExpiry: { $gte: 0, $lte: 7 },
            ClosingStock: { $gt: 0 },
        }).sort({ DaysToExpiry: 1 }).limit(200).toArray();

        // Enrich at-risk items with product info
        const enrichedRiskItems = [];
        let totalValueAtRisk = 0;
        const categoryRiskMap = {};

        // 🚀 BULK OPTIMIZATION: Get all required products in 1 query instead of 200 individual queries
        const skuList = [...new Set(atRiskInventory.map(inv => inv.sku))];
        const productsList = await Product.find({ sku: { $in: skuList } });
        const productMap = {};
        for (const p of productsList) productMap[p.sku] = p;

        for (const inv of atRiskInventory) {
            const product = productMap[inv.sku];
            const stock = inv.ClosingStock || 0;
            const value = stock * (product?.baseUnitPriceLKR || 0);
            totalValueAtRisk += value;

            const category = product?.category || 'Other';
            categoryRiskMap[category] = (categoryRiskMap[category] || 0) + value;

            // Determine baseline risk level
            let risk = 'Low';
            let action = 'Monitor';
            const dte = inv.DaysToExpiry ?? 999;

            if (dte <= 1) {
                risk = 'Critical';
            } else if (dte <= 3) {
                risk = 'High';
            } else if (dte <= 5) {
                risk = 'Medium';
            } else if (dte <= 7) {
                risk = 'Low';
            }

            // Simple fast rules without ML delay overhead
            if (dte > 0 && dte <= 7) {
                action = `Discount ${dte <= 1 ? 50 : dte <= 3 ? 30 : 10}%`;
            } else if (dte <= 0) {
                action = 'Donate / Discard';
            }

            enrichedRiskItems.push({
                id: inv._id,
                sku: inv.sku,
                productName: product?.productName || inv.sku,
                category,
                daysToExpiry: dte,
                expiryLabel: dte <= 0 ? 'Expired' : dte === 1 ? 'Tomorrow' : `${dte} Days`,
                closingStock: stock,
                value: Math.round(value),
                risk,
                action,
            });
        }

        // Sort risk items by urgency (critical first)
        const riskOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        enrichedRiskItems.sort((a, b) => (riskOrder[a.risk] ?? 99) - (riskOrder[b.risk] ?? 99));

        const topRiskItems = enrichedRiskItems.slice(0, 20);

        // --- AI Savings (actions taken this month) ---
        const monthlyActions = await Promotion.find({
            reason: 'expiry',
            createdAt: { $gte: monthStart },
        });
        let aiSavingsLKR = 0;
        for (const promo of monthlyActions) {
            const promoProduct = await Product.findOne({ sku: promo.productId });
            const unitPrice = promoProduct?.baseUnitPriceLKR || 0;
            const recoveredValue = (promo.targetQuantity || 0) * (1 - (promo.discountPercent || 0) / 100) * unitPrice;
            aiSavingsLKR += recoveredValue;
        }

        // --- Expiry Timeline (value per day for next 5 days) ---
        const expiryTimeline = [];
        for (let d = 0; d < 5; d++) {
            const dayLabel = d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `Day ${d + 1}`;
            const dayItems = enrichedRiskItems.filter(item => item.daysToExpiry === d);
            const dayValue = dayItems.reduce((sum, item) => sum + item.value, 0);
            expiryTimeline.push({ day: dayLabel, value: dayValue });
        }

        // --- Category Breakdown ---
        const categoryBreakdown = Object.entries(categoryRiskMap).map(([name, value]) => ({
            name,
            value: Math.round(value),
        }));

        res.json({
            success: true,
            data: {
                kpis: {
                    monthlyWastageKg: Math.round(monthlyWastageKg * 10) / 10,
                    wastageChangePercent,
                    valueAtRiskLKR: Math.round(totalValueAtRisk),
                    aiSavingsLKR: Math.round(aiSavingsLKR),
                },
                expiryTimeline,
                categoryBreakdown,
                riskItems: topRiskItems,
                totalRiskItems: enrichedRiskItems.length,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /api/wastage/actions/history/:storeId
 * @desc    Get past wastage prevention actions taken
 * @access  Public
 */
router.get('/actions/history/:storeId', async (req, res, next) => {
    try {
        const { storeId } = req.params;
        const limit = parseInt(req.query.limit) || 20;

        const actions = await Promotion.find({
            storeId,
            reason: 'expiry',
        })
            .sort({ createdAt: -1 })
            .limit(limit);

        res.json({
            success: true,
            count: actions.length,
            data: actions,
        });
    } catch (error) {
        next(error);
    }
});

export default router;

