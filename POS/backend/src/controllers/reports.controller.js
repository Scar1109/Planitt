const PosBill = require('../models/PosBill');
const PosSession = require('../models/PosSession');
const InventoryMovement = require('../models/InventoryMovement');
const PurchaseOrder = require('../models/PurchaseOrder');
const PosAuditLog = require('../models/PosAuditLog');
const asyncHandler = require('../utils/asyncHandler');

const dailySalesReport = asyncHandler(async (req, res) => {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const data = await PosBill.aggregate([
        {
            $match: {
                storeId: req.storeId,
                checkoutAt: { $gte: start, $lt: end },
                status: { $in: ['paid', 'partially_returned', 'returned'] },
            },
        },
        {
            $group: {
                _id: null,
                grossSales: { $sum: '$grandTotalLKR' },
                discount: { $sum: '$billDiscountLKR' },
                tax: { $sum: '$taxLKR' },
                returnAmount: { $sum: '$returnSummary.returnedAmountLKR' },
                totalBills: { $sum: 1 },
            },
        },
    ]);
    res.json(data[0] || {
        grossSales: 0,
        discount: 0,
        tax: 0,
        returnAmount: 0,
        totalBills: 0,
    });
});

const shiftReport = asyncHandler(async (req, res) => {
    const session = await PosSession.findOne({ _id: req.params.id, storeId: req.storeId }).lean();
    if (!session) {
        return res.status(404).json({ message: 'Shift not found' });
    }

    const bills = await PosBill.find({ sessionId: session._id, storeId: req.storeId }).lean();
    const totals = bills.reduce((acc, bill) => {
        acc.totalSales += Number(bill.grandTotalLKR || 0);
        acc.totalBills += 1;
        if (bill.paymentMethod === 'cash') acc.cashSales += Number(bill.grandTotalLKR || 0);
        return acc;
    }, { totalSales: 0, totalBills: 0, cashSales: 0 });

    res.json({ session, totals, billsCount: bills.length });
});

const inventoryMovementsReport = asyncHandler(async (req, res) => {
    const query = { storeId: req.storeId };
    if (req.query.from || req.query.to) {
        query.occurredAt = {};
        if (req.query.from) query.occurredAt.$gte = new Date(req.query.from);
        if (req.query.to) query.occurredAt.$lte = new Date(req.query.to);
    }
    const data = await InventoryMovement.find(query).sort({ occurredAt: -1 }).limit(Number(req.query.limit || 500));
    res.json({ data });
});

const poStatusReport = asyncHandler(async (req, res) => {
    const data = await PurchaseOrder.aggregate([
        { $match: { storeId: req.storeId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);
    res.json({ data });
});

const auditReport = asyncHandler(async (req, res) => {
    const data = await PosAuditLog.find({ storeId: req.storeId })
        .sort({ createdAt: -1 })
        .limit(Number(req.query.limit || 300));
    res.json({ data });
});

module.exports = {
    dailySalesReport,
    shiftReport,
    inventoryMovementsReport,
    poStatusReport,
    auditReport,
};
