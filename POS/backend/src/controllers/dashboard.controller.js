const PosBill = require('../models/PosBill');
const InventoryBalance = require('../models/InventoryBalance');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

function dayBounds(dateQuery) {
    const base = dateQuery ? new Date(dateQuery) : new Date();
    const start = new Date(base);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
}

const getSummary = asyncHandler(async (req, res) => {
    const { start, end } = dayBounds(req.query.date);
    const summary = await PosBill.aggregate([
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
                billCount: { $sum: 1 },
                itemsSold: { $sum: { $sum: '$items.quantity' } },
                returnAmount: { $sum: '$returnSummary.returnedAmountLKR' },
            },
        },
    ]);

    const data = summary[0] || {
        grossSales: 0,
        billCount: 0,
        itemsSold: 0,
        returnAmount: 0,
    };

    data.netSales = Number((data.grossSales - data.returnAmount).toFixed(2));
    data.avgBasket = data.billCount ? Number((data.grossSales / data.billCount).toFixed(2)) : 0;

    res.json(data);
});

const getHourlySales = asyncHandler(async (req, res) => {
    const { start, end } = dayBounds(req.query.date);
    const points = await PosBill.aggregate([
        {
            $match: {
                storeId: req.storeId,
                checkoutAt: { $gte: start, $lt: end },
                status: { $in: ['paid', 'partially_returned', 'returned'] },
            },
        },
        {
            $group: {
                _id: { $hour: '$checkoutAt' },
                sales: { $sum: '$grandTotalLKR' },
                bills: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);
    res.json({ data: points.map((p) => ({ hour: p._id, sales: p.sales, bills: p.bills })) });
});

const getPaymentSplit = asyncHandler(async (req, res) => {
    const { start, end } = dayBounds(req.query.date);
    const result = await PosBill.aggregate([
        {
            $match: {
                storeId: req.storeId,
                checkoutAt: { $gte: start, $lt: end },
                status: { $in: ['paid', 'partially_returned', 'returned'] },
            },
        },
        {
            $group: {
                _id: '$paymentMethod',
                amount: { $sum: '$grandTotalLKR' },
                bills: { $sum: 1 },
            },
        },
    ]);
    res.json({ data: result.map((r) => ({ method: r._id, amount: r.amount, bills: r.bills })) });
});

const getTopProducts = asyncHandler(async (req, res) => {
    const { start, end } = dayBounds(req.query.date);
    const limit = Number(req.query.limit || 10);
    const result = await PosBill.aggregate([
        {
            $match: {
                storeId: req.storeId,
                checkoutAt: { $gte: start, $lt: end },
                status: { $in: ['paid', 'partially_returned', 'returned'] },
            },
        },
        { $unwind: '$items' },
        {
            $group: {
                _id: '$items.sku',
                productName: { $first: '$items.productName' },
                qty: { $sum: '$items.quantity' },
                sales: { $sum: '$items.lineTotalLKR' },
            },
        },
        { $sort: { sales: -1 } },
        { $limit: limit },
    ]);
    res.json({ data: result });
});

const getAlerts = asyncHandler(async (req, res) => {
    const thresholdProducts = await Product.find({ isActive: true }).select('sku reorderLevel productName').lean();
    const thresholdMap = new Map(thresholdProducts.map((p) => [p.sku, p]));
    const balances = await InventoryBalance.find({ storeId: req.storeId }).lean();
    const lowStock = balances
        .map((balance) => {
            const product = thresholdMap.get(balance.sku);
            if (!product) return null;
            const reorderLevel = Number(product.reorderLevel || 0);
            if (reorderLevel <= 0 || balance.quantity > reorderLevel) return null;
            return {
                sku: balance.sku,
                productName: product.productName,
                quantity: balance.quantity,
                reorderLevel,
            };
        })
        .filter(Boolean)
        .slice(0, 20);

    const pendingPO = await PurchaseOrder.countDocuments({
        storeId: req.storeId,
        status: { $in: ['APPROVED', 'ORDERED', 'PARTIAL_RECEIVED'] },
    });
    const suspendedBills = await PosBill.countDocuments({
        storeId: req.storeId,
        status: 'suspended',
    });

    res.json({
        lowStock,
        pendingPO,
        suspendedBills,
    });
});

const getRecentBills = asyncHandler(async (req, res) => {
    const bills = await PosBill.find({
        storeId: req.storeId,
        status: { $in: ['paid', 'partially_returned', 'returned'] },
    })
        .sort({ checkoutAt: -1 })
        .limit(Number(req.query.limit || 10))
        .select('billNo grandTotalLKR paymentMethod checkoutAt status');
    res.json({ data: bills });
});

module.exports = {
    getSummary,
    getHourlySales,
    getPaymentSplit,
    getTopProducts,
    getAlerts,
    getRecentBills,
};
