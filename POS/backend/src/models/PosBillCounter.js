const mongoose = require('mongoose');

const posBillCounterSchema = new mongoose.Schema({
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    businessDate: { type: String, required: true, index: true },
    seq: { type: Number, default: 0 },
}, { timestamps: true });

posBillCounterSchema.index({ storeId: 1, businessDate: 1 }, { unique: true });

module.exports = mongoose.model('PosBillCounter', posBillCounterSchema);
