import mongoose from "mongoose";

const SaleSchema = new mongoose.Schema({
    date: { type: Date, index: true },
    sku: { type: String, index: true },
    unitsSold: Number,
    unitPriceLKR: Number,
    promotionFlag: Boolean,
    promotionType: String,
    stockoutFlag: Boolean
});

SaleSchema.index({ date: 1, sku: 1 });

export default mongoose.model("Sale", SaleSchema);