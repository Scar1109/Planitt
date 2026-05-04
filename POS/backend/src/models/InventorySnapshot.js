const mongoose = require('mongoose');

const inventorySnapshotSchema = new mongoose.Schema({
    date: { type: Date, required: true, index: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    sku: { type: String, required: true, index: true },
    openingStock: { type: Number, default: 0 },
    receivedQty: { type: Number, default: 0 },
    soldQty: { type: Number, default: 0 },
    discardedQty: { type: Number, default: 0 },
    closingStock: { type: Number, default: 0 },
    orderPlacedQty: { type: Number, default: 0 },
    supplierLeadTimeDays: { type: Number, default: 0 },
    oldestReceiptDate: { type: Date, default: null },
    newestReceiptDate: { type: Date, default: null },
    estimatedOldStockQty: { type: Number, default: 0 },
    oldestAgeDays: { type: Number, default: 0 },
    oldStockShare: { type: Number, default: 0 },
    ageRiskRatio: { type: Number, default: 0 },
}, { timestamps: true });

inventorySnapshotSchema.index({ storeId: 1, date: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model('InventorySnapshot', inventorySnapshotSchema);
