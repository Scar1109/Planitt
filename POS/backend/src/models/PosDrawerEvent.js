const mongoose = require('mongoose');

const posDrawerEventSchema = new mongoose.Schema({
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PosSession', required: true, index: true },
    cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventType: { type: String, enum: ['DROP', 'PAYOUT'], required: true, index: true },
    amountLKR: { type: Number, required: true, min: 0.01 },
    reason: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('PosDrawerEvent', posDrawerEventSchema);
