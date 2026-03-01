const mongoose = require('mongoose');

const purchaseOrderLineSchema = new mongoose.Schema({
    sku: { type: String, required: true },
    productName: { type: String, required: true },
    orderedQty: { type: Number, required: true, min: 1 },
    receivedQty: { type: Number, default: 0, min: 0 },
    unitCostLKR: { type: Number, default: 0, min: 0 },
}, { _id: true });

const purchaseOrderSchema = new mongoose.Schema({
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    poNo: { type: String, required: true, index: true },
    supplier: { type: String, required: true },
    status: {
        type: String,
        enum: ['DRAFT', 'APPROVED', 'ORDERED', 'PARTIAL_RECEIVED', 'RECEIVED', 'CANCELLED'],
        default: 'DRAFT',
        index: true,
    },
    lines: { type: [purchaseOrderLineSchema], default: [] },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    orderedAt: { type: Date, default: null },
    receivedAt: { type: Date, default: null },
}, { timestamps: true });

purchaseOrderSchema.index({ storeId: 1, poNo: 1 }, { unique: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
