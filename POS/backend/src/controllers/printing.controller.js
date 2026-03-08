const PosBill = require('../models/PosBill');
const Store = require('../models/Store');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { printReceipt, openCashDrawer } = require('../services/printing/escpos.service');

function buildReceiptPayload(bill, cashierName, storeName) {
    return {
        storeName: storeName || 'Store',
        billNo: bill.billNo || String(bill._id),
        cashierName,
        paymentMethod: bill.paymentMethod || 'cash',
        items: bill.items,
        totals: {
            subtotalLKR: Number(bill.subtotalLKR || 0),
            taxLKR: Number(bill.taxLKR || 0),
            billDiscountLKR: Number(bill.billDiscountLKR || 0),
            grandTotalLKR: Number(bill.grandTotalLKR || 0),
        },
        printedAt: new Date(),
    };
}

const printBillReceipt = asyncHandler(async (req, res) => {
    const bill = await PosBill.findOne({ _id: req.params.billId, storeId: req.storeId }).lean();
    if (!bill) {
        throw new HttpError(404, 'Bill not found');
    }
    if (!bill.paymentMethod) {
        throw new HttpError(400, 'Bill is not yet paid');
    }

    const store = await Store.findById(req.storeId).select('name').lean();
    const result = await printReceipt({
        storeId: req.storeId,
        terminalId: req.body.terminalId,
        payload: buildReceiptPayload(bill, req.user.fullName, store?.name),
    });
    res.json(result);
});

const reprintBillReceipt = asyncHandler(async (req, res) => {
    const bill = await PosBill.findOne({ _id: req.params.billId, storeId: req.storeId }).lean();
    if (!bill) {
        throw new HttpError(404, 'Bill not found');
    }
    const store = await Store.findById(req.storeId).select('name').lean();
    const result = await printReceipt({
        storeId: req.storeId,
        terminalId: req.body.terminalId,
        payload: buildReceiptPayload(bill, req.user.fullName, store?.name),
    });
    res.json(result);
});

const openDrawer = asyncHandler(async (req, res) => {
    const result = await openCashDrawer({
        storeId: req.storeId,
        terminalId: req.body.terminalId,
    });
    res.json(result);
});

module.exports = {
    printBillReceipt,
    reprintBillReceipt,
    openDrawer,
};
