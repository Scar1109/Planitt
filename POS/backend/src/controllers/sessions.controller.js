const PosSession = require('../models/PosSession');
const PosBill = require('../models/PosBill');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { toBusinessDate } = require('../utils/date');

const openSession = asyncHandler(async (req, res) => {
    if (!req.storeId) {
        throw new HttpError(400, 'User is not assigned to a store');
    }

    const { terminalId, openingFloatLKR } = req.body;
    const businessDate = toBusinessDate();

    const existing = await PosSession.findOne({
        storeId: req.storeId,
        userId: req.user._id,
        terminalId,
        status: 'open',
    });

    if (existing) {
        throw new HttpError(409, 'An open session already exists for this terminal');
    }

    const session = await PosSession.create({
        storeId: req.storeId,
        userId: req.user._id,
        terminalId,
        businessDate,
        openingFloatLKR,
        openedAt: new Date(),
    });

    res.status(201).json(session);
});

const currentSession = asyncHandler(async (req, res) => {
    const session = await PosSession.findOne({
        storeId: req.storeId,
        userId: req.user._id,
        status: 'open',
    }).sort({ openedAt: -1 });

    res.json({ session });
});

const closeSession = asyncHandler(async (req, res) => {
    const session = await PosSession.findOne({
        _id: req.params.id,
        storeId: req.storeId,
        userId: req.user._id,
        status: 'open',
    });

    if (!session) {
        throw new HttpError(404, 'Open session not found');
    }

    const paidBills = await PosBill.aggregate([
        {
            $match: {
                sessionId: session._id,
                status: { $in: ['paid', 'partially_returned', 'returned'] },
                paymentMethod: 'cash',
            },
        },
        {
            $group: {
                _id: null,
                cashTotal: { $sum: '$paidAmountLKR' },
            },
        },
    ]);

    const expectedCashLKR = Number((paidBills[0]?.cashTotal || 0) + session.openingFloatLKR);
    session.closingCashLKR = req.body.closingCashLKR;
    session.expectedCashLKR = expectedCashLKR;
    session.varianceLKR = Number((session.closingCashLKR - expectedCashLKR).toFixed(2));
    session.note = req.body.note || '';
    session.status = 'closed';
    session.closedAt = new Date();
    await session.save();

    res.json(session);
});

module.exports = {
    openSession,
    currentSession,
    closeSession,
};
