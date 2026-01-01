import mongoose from "mongoose";

const InventorySchema = new mongoose.Schema({
    date: { type: Date, index: true },
    sku: { type: String, index: true },

    openingStock: Number,
    receivedQty: Number,
    soldQty: Number,
    discardedQty: Number,
    closingStock: Number,

    orderPlacedQty: Number,
    supplierLeadTimeDays: Number,

    oldestReceiptDate: Date,
    newestReceiptDate: Date,

    estimatedOldStockQty: Number,
    oldestAgeDays: Number,
    oldStockShare: Number,
    ageRiskRatio: Number
});

InventorySchema.index({ date: 1, sku: 1 });

export default mongoose.model("InventorySnapshot", InventorySchema);