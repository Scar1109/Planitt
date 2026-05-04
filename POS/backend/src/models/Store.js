const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    location: {
        city: { type: String, default: '' },
        latitude: { type: Number, default: 0 },
        longitude: { type: Number, default: 0 },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Store', storeSchema);
