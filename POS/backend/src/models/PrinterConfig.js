const mongoose = require('mongoose');

const printerConfigSchema = new mongoose.Schema({
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    terminalId: { type: String, required: true, index: true },
    isActive: { type: Boolean, default: true },
    connectionType: { type: String, enum: ['network', 'usb'], default: 'network' },
    network: {
        host: { type: String, default: process.env.PRINTER_HOST || '' },
        port: { type: Number, default: Number(process.env.PRINTER_PORT || 9100) },
        timeoutMs: { type: Number, default: Number(process.env.PRINTER_TIMEOUT_MS || 2000) },
    },
    usb: {
        vendorId: { type: String, default: '' },
        productId: { type: String, default: '' },
    },
    autoCut: { type: Boolean, default: true },
    drawerPulseOnCash: { type: Boolean, default: true },
}, { timestamps: true });

printerConfigSchema.index({ storeId: 1, terminalId: 1 }, { unique: true });

module.exports = mongoose.model('PrinterConfig', printerConfigSchema);
