import express from 'express';
import InventorySnapshot from '../models/InventorySnapshot.js';
import Product from '../models/Product.js';
import Promotion from '../models/Promotion.js';
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

export default router;
