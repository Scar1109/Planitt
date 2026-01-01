import mongoose from "mongoose";

const ConstraintRuleSchema = new mongoose.Schema({
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    ruleType: { type: String, required: true, index: true },
    scope: { type: String, enum: ["sku", "brand", "category", "fixture", "level", "global"], required: true },
    targetSku: { type: String, default: null, index: true },
    targetBrand: { type: String, default: null, index: true },
    targetCategory: { type: String, default: null, index: true },
    targetFixtureId: { type: mongoose.Schema.Types.ObjectId, ref: "ShelfFixture", default: null, index: true },
    targetLevelId: { type: mongoose.Schema.Types.ObjectId, ref: "ShelfLevel", default: null, index: true },
    hardConstraint: { type: Boolean, default: true },
    penaltyWeight: { type: Number, default: null },
    params: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

export default mongoose.model("ConstraintRule", ConstraintRuleSchema);
