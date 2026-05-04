const mongoose = require('mongoose');

const inventoryMovementSchema = new mongoose.Schema({
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    sku: { type: String, required: true, index: true },
    movementType: {
        type: String,
        enum: ['SALE', 'RETURN', 'VOID_REVERSAL', 'RECEIVE', 'ADJUSTMENT'],
        required: true,
        index: true,
    },
    quantityDelta: { type: Number, required: true },
    billId: { type: mongoose.Schema.Types.ObjectId, ref: 'PosBill', default: null, index: true },
    purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', default: null, index: true },
    reason: { type: String, default: '' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    occurredAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

module.exports = mongoose.model('InventoryMovement', inventoryMovementSchema);
