const mongoose = require('mongoose');
const InventoryBalance = require('../models/InventoryBalance');
const Product = require('../models/Product');
const InventorySnapshot = require('../models/InventorySnapshot');
const asyncHandler = require('../utils/asyncHandler');
const { applyInventoryDelta } = require('../services/inventory.service');
const { runInventorySnapshot } = require('../services/snapshot.service');
const { writeAuditLog } = require('../services/audit.service');

const listCurrentInventory = asyncHandler(async (req, res) => {
    const balances = await InventoryBalance.find({ storeId: req.storeId }).lean();
    const products = await Product.find({ sku: { $in: balances.map((item) => item.sku) } }).lean();
    const productMap = new Map(products.map((item) => [item.sku, item]));

    const data = balances.map((balance) => ({
        ...balance,
        productName: productMap.get(balance.sku)?.productName || balance.sku,
        category: productMap.get(balance.sku)?.category || 'Unknown',
    }));

    res.json({ data });
});

const adjustInventory = asyncHandler(async (req, res) => {
    const dbSession = await mongoose.startSession();
    try {
        await dbSession.withTransaction(async () => {
            await applyInventoryDelta({
                storeId: req.storeId,
                sku: req.body.sku,
                delta: req.body.quantityDelta,
                movementType: 'ADJUSTMENT',
                userId: req.user._id,
                reason: req.body.reason,
                session: dbSession,
            });
            await writeAuditLog({
                storeId: req.storeId,
                userId: req.user._id,
                action: 'INVENTORY_ADJUSTMENT',
                entityType: 'InventoryBalance',
                entityId: req.body.sku,
                reason: req.body.reason,
                payload: req.body,
                session: dbSession,
            });
        });
    } finally {
        await dbSession.endSession();
    }
    res.status(201).json({ message: 'Inventory adjusted' });
});

const receiveInventory = asyncHandler(async (req, res) => {
    const dbSession = await mongoose.startSession();
    try {
        await dbSession.withTransaction(async () => {
            await applyInventoryDelta({
                storeId: req.storeId,
                sku: req.body.sku,
                delta: req.body.receivedQty,
                movementType: 'RECEIVE',
                userId: req.user._id,
                reason: req.body.reason || 'Manual receive',
                session: dbSession,
            });
            await writeAuditLog({
                storeId: req.storeId,
                userId: req.user._id,
                action: 'INVENTORY_RECEIVE',
                entityType: 'InventoryBalance',
                entityId: req.body.sku,
                payload: req.body,
                session: dbSession,
            });
        });
    } finally {
        await dbSession.endSession();
    }
    res.status(201).json({ message: 'Stock received' });
});

const runSnapshot = asyncHandler(async (req, res) => {
    const date = req.body.date ? new Date(req.body.date) : new Date();
    const output = await runInventorySnapshot({ storeId: req.storeId, date });
    res.json(output);
});

const listSnapshots = asyncHandler(async (req, res) => {
    const query = { storeId: req.storeId };
    if (req.query.from || req.query.to) {
        query.date = {};
        if (req.query.from) query.date.$gte = new Date(req.query.from);
        if (req.query.to) query.date.$lte = new Date(req.query.to);
    }
    const data = await InventorySnapshot.find(query).sort({ date: -1 }).limit(Number(req.query.limit || 500));
    res.json({ data });
});

module.exports = {
    listCurrentInventory,
    adjustInventory,
    receiveInventory,
    runSnapshot,
    listSnapshots,
};
