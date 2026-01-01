import express from 'express';
import InventorySnapshot from '../models/InventorySnapshot.js';
import Product from '../models/Product.js';
import { validate, schemas } from '../middleware/validation.js';
import logger from '../config/logger.js';

const router = express.Router();

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
