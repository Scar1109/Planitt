const mongoose = require('mongoose');

const inventoryBalanceSchema = new mongoose.Schema({
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    sku: { type: String, required: true, index: true },
    quantity: { type: Number, default: 0 },
    lastMovementAt: { type: Date, default: null },
}, { timestamps: true });

inventoryBalanceSchema.index({ storeId: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model('InventoryBalance', inventoryBalanceSchema);
