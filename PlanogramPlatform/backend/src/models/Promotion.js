import mongoose from "mongoose";

const PromotionSchema = new mongoose.Schema({
    promotionId: { type: String, unique: true, index: true },
    productId: String,
    storeId: String,
    promotionType: { type: String, enum: ['markdown', 'clearance', 'bundle', 'donation'] },
    discountPercent: { type: Number, default: 0 },
    startDate: Date,
    endDate: Date,
    reason: { type: String, enum: ['expiry', 'overstock', 'seasonal', 'promotional'] },
    targetQuantity: Number,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

PromotionSchema.index({ storeId: 1, reason: 1 });

export default mongoose.model("Promotion", PromotionSchema);
