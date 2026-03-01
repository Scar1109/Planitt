const mongoose = require('mongoose');

const lineSchema = new mongoose.Schema({
    sku: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPriceLKR: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    lineDiscountLKR: { type: Number, default: 0, min: 0 },
    lineSubtotalLKR: { type: Number, default: 0, min: 0 },
    lineTaxLKR: { type: Number, default: 0, min: 0 },
    lineTotalLKR: { type: Number, default: 0, min: 0 },
    returnableQty: { type: Number, default: 0, min: 0 },
}, { _id: true });

const posBillSchema = new mongoose.Schema({
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PosSession', required: true, index: true },
    cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'PosCustomer', default: null, index: true },
    billNo: { type: String, default: null, index: true },
    businessDate: { type: String, required: true, index: true },
    status: { type: String, enum: ['draft', 'suspended', 'paid', 'voided', 'partially_returned', 'returned'], default: 'draft', index: true },
    items: { type: [lineSchema], default: [] },
    subtotalLKR: { type: Number, default: 0 },
    taxLKR: { type: Number, default: 0 },
    billDiscountLKR: { type: Number, default: 0 },
    grandTotalLKR: { type: Number, default: 0 },
    paidAmountLKR: { type: Number, default: 0 },
    changeAmountLKR: { type: Number, default: 0 },
    pointsEarned: { type: Number, default: 0 },
    pointsRedeemed: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ['cash', 'card', 'digital', null], default: null },
    paymentReference: { type: String, default: '' },
    checkoutAt: { type: Date, default: null, index: true },
    suspendedAt: { type: Date, default: null },
    voidReason: { type: String, default: '' },
    returnSummary: {
        returnedAmountLKR: { type: Number, default: 0 },
        returnedItems: { type: Number, default: 0 },
    },
}, { timestamps: true });

posBillSchema.index({ storeId: 1, businessDate: 1, billNo: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('PosBill', posBillSchema);
