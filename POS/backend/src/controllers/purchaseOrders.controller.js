const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');
const PurchaseOrderReceipt = require('../models/PurchaseOrderReceipt');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { applyInventoryDelta } = require('../services/inventory.service');
const { writeAuditLog } = require('../services/audit.service');

async function nextPoNo(storeId) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PO${today}`;
    const count = await PurchaseOrder.countDocuments({ storeId, poNo: { $regex: `^${prefix}` } });
    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

const listPurchaseOrders = asyncHandler(async (req, res) => {
    const query = { storeId: req.storeId };
    if (req.query.status) query.status = req.query.status;
    const data = await PurchaseOrder.find(query).sort({ createdAt: -1 }).limit(Number(req.query.limit || 200));
    res.json({ data });
});

const getPurchaseOrderById = asyncHandler(async (req, res) => {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!po) throw new HttpError(404, 'Purchase order not found');
    res.json(po);
});

const createPurchaseOrder = asyncHandler(async (req, res) => {
    const products = await Product.find({ sku: { $in: req.body.lines.map((l) => l.sku) } }).lean();
    const productMap = new Map(products.map((item) => [item.sku, item]));
    const lines = req.body.lines.map((line) => ({
        ...line,
        productName: productMap.get(line.sku)?.productName || line.sku,
        unitCostLKR: line.unitCostLKR ?? productMap.get(line.sku)?.unitCostLKR ?? 0,
    }));
    const po = await PurchaseOrder.create({
        storeId: req.storeId,
        poNo: await nextPoNo(req.storeId),
        supplier: req.body.supplier,
        notes: req.body.notes || '',
        lines,
        createdBy: req.user._id,
    });
    await writeAuditLog({
        storeId: req.storeId,
        userId: req.user._id,
        action: 'PO_CREATE',
        entityType: 'PurchaseOrder',
        entityId: po._id,
        payload: po.toObject(),
    });
    res.status(201).json(po);
});

const updatePurchaseOrder = asyncHandler(async (req, res) => {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!po) throw new HttpError(404, 'Purchase order not found');
    if (!['DRAFT', 'APPROVED'].includes(po.status)) throw new HttpError(400, 'Cannot edit PO in current status');
    if (req.body.supplier) po.supplier = req.body.supplier;
    if (req.body.notes !== undefined) po.notes = req.body.notes;
    await po.save();
    res.json(po);
});

const approvePurchaseOrder = asyncHandler(async (req, res) => {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!po) throw new HttpError(404, 'Purchase order not found');
    if (po.status !== 'DRAFT') throw new HttpError(400, 'Only draft PO can be approved');
    po.status = 'APPROVED';
    po.approvedBy = req.user._id;
    po.approvedAt = new Date();
    await po.save();
    res.json(po);
});

const placePurchaseOrder = asyncHandler(async (req, res) => {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!po) throw new HttpError(404, 'Purchase order not found');
    if (!['APPROVED', 'DRAFT'].includes(po.status)) throw new HttpError(400, 'PO cannot be placed');
    po.status = 'ORDERED';
    po.orderedAt = new Date();
    await po.save();
    res.json(po);
});

const cancelPurchaseOrder = asyncHandler(async (req, res) => {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!po) throw new HttpError(404, 'Purchase order not found');
    if (po.status === 'RECEIVED') throw new HttpError(400, 'Received PO cannot be cancelled');
    po.status = 'CANCELLED';
    await po.save();
    res.json(po);
});

const receivePurchaseOrder = asyncHandler(async (req, res) => {
    const dbSession = await mongoose.startSession();
    let updated;
    try {
        await dbSession.withTransaction(async () => {
            const po = await PurchaseOrder.findOne({ _id: req.params.id, storeId: req.storeId }).session(dbSession);
            if (!po) throw new HttpError(404, 'Purchase order not found');
            if (!['ORDERED', 'PARTIAL_RECEIVED', 'APPROVED'].includes(po.status)) {
                throw new HttpError(400, 'PO is not receivable');
            }

            for (const lineInput of req.body.lines) {
                const line = po.lines.find((item) => item.sku === lineInput.sku);
                if (!line) throw new HttpError(400, `SKU ${lineInput.sku} not found in PO`);
                line.receivedQty += lineInput.receivedQty;

                await applyInventoryDelta({
                    storeId: req.storeId,
                    sku: lineInput.sku,
                    delta: lineInput.receivedQty,
                    movementType: 'RECEIVE',
                    userId: req.user._id,
                    reason: `PO Receive ${po.poNo}`,
                    purchaseOrderId: po._id,
                    session: dbSession,
                });
            }

            const fullyReceived = po.lines.every((line) => line.receivedQty >= line.orderedQty);
            po.status = fullyReceived ? 'RECEIVED' : 'PARTIAL_RECEIVED';
            po.receivedAt = new Date();
            await po.save({ session: dbSession });

            await PurchaseOrderReceipt.create([{
                storeId: req.storeId,
                purchaseOrderId: po._id,
                lines: req.body.lines,
                receivedBy: req.user._id,
                note: req.body.note || '',
                receivedAt: new Date(),
            }], { session: dbSession });

            await writeAuditLog({
                storeId: req.storeId,
                userId: req.user._id,
                action: 'PO_RECEIVE',
                entityType: 'PurchaseOrder',
                entityId: po._id,
                payload: req.body,
                session: dbSession,
            });
            updated = po;
        });
    } finally {
        await dbSession.endSession();
    }

    res.json(updated);
});

module.exports = {
    listPurchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    updatePurchaseOrder,
    approvePurchaseOrder,
    placePurchaseOrder,
    cancelPurchaseOrder,
    receivePurchaseOrder,
};
