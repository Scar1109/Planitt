const mongoose = require('mongoose');

const posCustomerSchema = new mongoose.Schema({
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    phone: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: '' },
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    storeCreditLKR: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

// A customer phone number should be unique per store
posCustomerSchema.index({ storeId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('PosCustomer', posCustomerSchema);
