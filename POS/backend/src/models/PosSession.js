const mongoose = require('mongoose');

const posSessionSchema = new mongoose.Schema({
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    terminalId: { type: String, required: true, trim: true },
    businessDate: { type: String, required: true, index: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
    openingFloatLKR: { type: Number, default: 0 },
    expectedCashLKR: { type: Number, default: null }, // System calculated
    actualClosingCashLKR: { type: Number, default: null }, // Counted by cashier
    varianceLKR: { type: Number, default: null }, // Actual - Expected
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    note: { type: String, default: '' },
}, { timestamps: true });

posSessionSchema.index(
    { storeId: 1, terminalId: 1, status: 1 },
    { partialFilterExpression: { status: 'open' } },
);

module.exports = mongoose.model('PosSession', posSessionSchema);
