const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    sku: { type: String, required: true, unique: true, index: true },
    barcode: { type: String, index: true, sparse: true, unique: true },
    productName: { type: String, required: true, trim: true },
    category: { type: String, default: 'General' },
    brand: { type: String, default: '' },
    unitSize: { type: String, default: '' },
    baseUnitPriceLKR: { type: Number, required: true, min: 0 },
    unitCostLKR: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    supplier: { type: String, default: '' },
    reorderLevel: { type: Number, default: 0 },
    reorderQty: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
