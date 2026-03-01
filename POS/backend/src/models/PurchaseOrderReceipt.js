const mongoose = require('mongoose');

const receiptLineSchema = new mongoose.Schema({
    sku: { type: String, required: true },
    receivedQty: { type: Number, required: true, min: 1 },
}, { _id: false });

const purchaseOrderReceiptSchema = new mongoose.Schema({
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true, index: true },
    lines: { type: [receiptLineSchema], default: [] },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, default: '' },
    receivedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrderReceipt', purchaseOrderReceiptSchema);
