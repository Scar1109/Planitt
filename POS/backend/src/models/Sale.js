const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    date: { type: Date, index: true, required: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', index: true, default: null },
    billId: { type: mongoose.Schema.Types.ObjectId, ref: 'PosBill', index: true },
    sku: { type: String, required: true, index: true },
    unitsSold: { type: Number, required: true },
    unitPriceLKR: { type: Number, required: true },
    promotionFlag: { type: Boolean, default: false },
    promotionType: { type: String, default: '' },
    stockoutFlag: { type: Boolean, default: false },
    paymentMethod: { type: String, enum: ['cash', 'card', 'digital'], default: 'cash' },
}, { timestamps: true });

saleSchema.index({ date: 1, sku: 1, storeId: 1 });

module.exports = mongoose.model('Sale', saleSchema);
