const mongoose = require('mongoose');
const PosBill = require('../models/PosBill');
const PosSession = require('../models/PosSession');
const PosCustomer = require('../models/PosCustomer');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Store = require('../models/Store');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { toBusinessDate } = require('../utils/date');
const { recalculateBillTotals, generateBillNo } = require('../services/billing.service');
const { applyInventoryDelta } = require('../services/inventory.service');
const { writeAuditLog } = require('../services/audit.service');
const { printReceipt, openCashDrawer } = require('../services/printing/escpos.service');

async function getEditableBillOrThrow(billId, storeId) {
    const bill = await PosBill.findOne({ _id: billId, storeId });
    if (!bill) {
        throw new HttpError(404, 'Bill not found');
    }
    if (!['draft', 'suspended'].includes(bill.status)) {
        throw new HttpError(400, `Bill is not editable in ${bill.status} status`);
    }
    return bill;
}

const createDraftBill = asyncHandler(async (req, res) => {
    const { sessionId } = req.body;
    const session = await PosSession.findOne({
        _id: sessionId,
        storeId: req.storeId,
        userId: req.user._id,
        status: 'open',
    });
    if (!session) {
        throw new HttpError(400, 'Open session is required');
    }

    const bill = await PosBill.create({
        storeId: req.storeId,
        sessionId: session._id,
        cashierId: req.user._id,
        businessDate: toBusinessDate(),
        status: 'draft',
        items: [],
    });

    res.status(201).json(bill);
});

const addBillItem = asyncHandler(async (req, res) => {
    const bill = await getEditableBillOrThrow(req.params.id, req.storeId);
    const product = await Product.findOne({ sku: req.body.sku, isActive: true }).lean();
    if (!product) {
        throw new HttpError(404, 'Product not found');
    }

    const existingLine = bill.items.find((line) => line.sku === product.sku);
    if (existingLine) {
        existingLine.quantity += req.body.quantity;
        if (typeof req.body.lineDiscountLKR === 'number') {
            existingLine.lineDiscountLKR = req.body.lineDiscountLKR;
        }
    } else {
        bill.items.push({
            sku: product.sku,
            productName: product.productName,
            quantity: req.body.quantity,
            unitPriceLKR: typeof req.body.unitPriceLKR === 'number' ? req.body.unitPriceLKR : product.baseUnitPriceLKR,
            taxRate: Number(product.taxRate || 0),
            lineDiscountLKR: Number(req.body.lineDiscountLKR || 0),
        });
    }

    recalculateBillTotals(bill);
    await bill.save();
    res.json(bill);
});

const updateBillItem = asyncHandler(async (req, res) => {
    const bill = await getEditableBillOrThrow(req.params.id, req.storeId);
    const line = bill.items.id(req.params.lineId);
    if (!line) {
        throw new HttpError(404, 'Line item not found');
    }
    if (typeof req.body.quantity === 'number') {
        line.quantity = req.body.quantity;
    }
    if (typeof req.body.lineDiscountLKR === 'number') {
        line.lineDiscountLKR = req.body.lineDiscountLKR;
    }
    recalculateBillTotals(bill);
    await bill.save();
    res.json(bill);
});

const suspendBill = asyncHandler(async (req, res) => {
    const bill = await getEditableBillOrThrow(req.params.id, req.storeId);
    bill.status = 'suspended';
    bill.suspendedAt = new Date();
    await bill.save();
    res.json(bill);
});

const resumeBill = asyncHandler(async (req, res) => {
    const bill = await PosBill.findOne({ _id: req.params.id, storeId: req.storeId, status: 'suspended' });
    if (!bill) {
        throw new HttpError(404, 'Suspended bill not found');
    }
    bill.status = 'draft';
    await bill.save();
    res.json(bill);
});

const assignCustomer = asyncHandler(async (req, res) => {
    const bill = await getEditableBillOrThrow(req.params.id, req.storeId);

    if (req.body.customerId) {
        const customer = await PosCustomer.findOne({ _id: req.body.customerId, storeId: req.storeId });
        if (!customer) throw new HttpError(404, 'Customer not found');
        bill.customerId = customer._id;
    } else {
        bill.customerId = null;
    }

    await bill.save();

    // Populate the customer data before sending it back so the frontend can display it
    await bill.populate('customerId', 'name phone loyaltyPoints');
    res.json(bill);
});

const listSuspendedBills = asyncHandler(async (req, res) => {
    const bills = await PosBill.find({ storeId: req.storeId, status: 'suspended' })
        .sort({ suspendedAt: -1 })
        .limit(100);
    res.json({ data: bills });
});

const getBillById = asyncHandler(async (req, res) => {
    const bill = await PosBill.findOne({ _id: req.params.id, storeId: req.storeId })
        .populate('customerId', 'name phone loyaltyPoints');

    if (!bill) {
        throw new HttpError(404, 'Bill not found');
    }
    res.json(bill);
});

const checkoutBill = asyncHandler(async (req, res) => {
    const dbSession = await mongoose.startSession();
    let bill;
    let printResult = { ok: false, message: '' };
    try {
        await dbSession.withTransaction(async () => {
            bill = await PosBill.findOne({ _id: req.params.id, storeId: req.storeId }).session(dbSession);
            if (!bill) throw new HttpError(404, 'Bill not found');
            if (!['draft', 'suspended'].includes(bill.status)) {
                throw new HttpError(400, 'Bill cannot be checked out');
            }
            if (bill.items.length === 0) {
                throw new HttpError(400, 'Cannot checkout empty bill');
            }

            if (typeof req.body.billDiscountLKR === 'number') {
                bill.billDiscountLKR = req.body.billDiscountLKR;
            }
            recalculateBillTotals(bill);

            if (req.body.paidAmountLKR < bill.grandTotalLKR) {
                throw new HttpError(400, 'Paid amount is less than grand total');
            }

            for (const line of bill.items) {
                await applyInventoryDelta({
                    storeId: req.storeId,
                    sku: line.sku,
                    delta: -Math.abs(line.quantity),
                    movementType: 'SALE',
                    userId: req.user._id,
                    reason: `Sale for bill ${bill._id}`,
                    billId: bill._id,
                    session: dbSession,
                });
            }

            bill.billNo = await generateBillNo({
                storeId: req.storeId,
                businessDate: bill.businessDate,
                session: dbSession,
            });
            bill.status = 'paid';
            bill.paymentMethod = req.body.paymentMethod;
            bill.paymentReference = req.body.paymentReference || '';
            bill.paidAmountLKR = req.body.paidAmountLKR;
            bill.changeAmountLKR = Number((req.body.paidAmountLKR - bill.grandTotalLKR).toFixed(2));
            bill.checkoutAt = new Date();

            // Handle Loyalty Points if a customer is attached
            if (bill.customerId) {
                // Earn 1 point per 100 LKR spent
                const pointsEarned = Math.floor(bill.grandTotalLKR / 100);
                bill.pointsEarned = pointsEarned;

                await PosCustomer.updateOne(
                    { _id: bill.customerId },
                    { $inc: { loyaltyPoints: pointsEarned } },
                    { session: dbSession }
                );
            }

            await bill.save({ session: dbSession });

            const salesDocs = bill.items.map((line) => ({
                date: bill.checkoutAt,
                storeId: req.storeId,
                billId: bill._id,
                sku: line.sku,
                unitsSold: line.quantity,
                unitPriceLKR: line.unitPriceLKR,
                paymentMethod: req.body.paymentMethod,
            }));
            await Sale.insertMany(salesDocs, { session: dbSession });

            await writeAuditLog({
                storeId: req.storeId,
                userId: req.user._id,
                action: 'BILL_CHECKOUT',
                entityType: 'PosBill',
                entityId: bill._id,
                payload: {
                    billNo: bill.billNo,
                    total: bill.grandTotalLKR,
                    paymentMethod: bill.paymentMethod,
                },
                session: dbSession,
            });
        });
    } finally {
        await dbSession.endSession();
    }

    try {
        const store = await Store.findById(req.storeId).select('name').lean();
        const receiptPayload = {
            storeName: store?.name || 'Store',
            billNo: bill.billNo,
            cashierName: req.user.fullName,
            paymentMethod: bill.paymentMethod,
            items: bill.items,
            totals: {
                subtotalLKR: bill.subtotalLKR,
                taxLKR: bill.taxLKR,
                billDiscountLKR: bill.billDiscountLKR,
                grandTotalLKR: bill.grandTotalLKR,
            },
            printedAt: new Date(),
        };
        printResult = await printReceipt({
            storeId: req.storeId,
            terminalId: req.body.terminalId,
            payload: receiptPayload,
        });
        if (bill.paymentMethod === 'cash' && printResult.drawerPulseOnCash) {
            await openCashDrawer({ storeId: req.storeId, terminalId: req.body.terminalId });
        }
    } catch (error) {
        printResult = { ok: false, message: error.message };
    }

    res.json({
        bill,
        printResult,
    });
});

const voidBill = asyncHandler(async (req, res) => {
    const dbSession = await mongoose.startSession();
    try {
        await dbSession.withTransaction(async () => {
            const bill = await PosBill.findOne({ _id: req.params.id, storeId: req.storeId }).session(dbSession);
            if (!bill) throw new HttpError(404, 'Bill not found');
            if (!['paid', 'partially_returned'].includes(bill.status)) {
                throw new HttpError(400, 'Only paid bills can be voided');
            }

            for (const line of bill.items) {
                await applyInventoryDelta({
                    storeId: req.storeId,
                    sku: line.sku,
                    delta: Math.abs(line.returnableQty || line.quantity),
                    movementType: 'VOID_REVERSAL',
                    userId: req.user._id,
                    reason: req.body.reason,
                    billId: bill._id,
                    session: dbSession,
                });
            }

            bill.status = 'voided';
            bill.voidReason = req.body.reason;
            await bill.save({ session: dbSession });

            await writeAuditLog({
                storeId: req.storeId,
                userId: req.user._id,
                action: 'BILL_VOID',
                entityType: 'PosBill',
                entityId: bill._id,
                reason: req.body.reason,
                payload: { billNo: bill.billNo },
                session: dbSession,
            });
        });
    } finally {
        await dbSession.endSession();
    }
    res.json({ message: 'Bill voided' });
});

const returnBillItems = asyncHandler(async (req, res) => {
    const dbSession = await mongoose.startSession();
    let updatedBill;
    try {
        await dbSession.withTransaction(async () => {
            const bill = await PosBill.findOne({ _id: req.params.id, storeId: req.storeId }).session(dbSession);
            if (!bill) throw new HttpError(404, 'Bill not found');
            if (!['paid', 'partially_returned'].includes(bill.status)) {
                throw new HttpError(400, 'Bill is not returnable');
            }

            let totalReturned = 0;
            let returnedItems = 0;

            for (const entry of req.body.items) {
                const line = bill.items.id(entry.lineId);
                if (!line) throw new HttpError(400, `Line not found: ${entry.lineId}`);
                if (entry.quantity > line.returnableQty) throw new HttpError(400, `Return quantity exceeds returnable qty for ${line.sku}`);

                line.returnableQty -= entry.quantity;
                const lineReturnedValue = entry.quantity * line.unitPriceLKR;
                totalReturned += lineReturnedValue;
                returnedItems += entry.quantity;

                await applyInventoryDelta({
                    storeId: req.storeId,
                    sku: line.sku,
                    delta: entry.quantity,
                    movementType: 'RETURN',
                    userId: req.user._id,
                    reason: entry.reason,
                    billId: bill._id,
                    session: dbSession,
                });

                await Sale.create([{
                    date: new Date(),
                    storeId: req.storeId,
                    billId: bill._id,
                    sku: line.sku,
                    unitsSold: -entry.quantity,
                    unitPriceLKR: line.unitPriceLKR,
                    paymentMethod: bill.paymentMethod,
                }], { session: dbSession });
            }

            bill.returnSummary.returnedAmountLKR += Number(totalReturned.toFixed(2));
            bill.returnSummary.returnedItems += returnedItems;
            const remaining = bill.items.reduce((acc, item) => acc + item.returnableQty, 0);
            bill.status = remaining === 0 ? 'returned' : 'partially_returned';
            await bill.save({ session: dbSession });

            await writeAuditLog({
                storeId: req.storeId,
                userId: req.user._id,
                action: 'BILL_RETURN',
                entityType: 'PosBill',
                entityId: bill._id,
                payload: req.body,
                session: dbSession,
            });

            updatedBill = bill;
        });
    } finally {
        await dbSession.endSession();
    }

    res.json(updatedBill);
});

module.exports = {
    createDraftBill,
    addBillItem,
    updateBillItem,
    suspendBill,
    resumeBill,
    assignCustomer,
    listSuspendedBills,
    getBillById,
    checkoutBill,
    voidBill,
    returnBillItems,
};
