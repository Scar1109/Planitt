import mongoose from "mongoose";

const PlanogramPlacementSchema = new mongoose.Schema({
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    planogramId: { type: mongoose.Schema.Types.ObjectId, ref: "Planogram", required: true, index: true },
    fixtureId: { type: mongoose.Schema.Types.ObjectId, ref: "ShelfFixture", required: true, index: true },
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: "ShelfLevel", required: true, index: true },
    sku: { type: String, required: true, index: true },
    facings: { type: Number, required: true },
    positionXcm: { type: Number, required: true },
    widthUsedCm: { type: Number, required: true },
    unitsDeep: { type: Number, default: 1 },
    stackCount: { type: Number, default: 1 },
    scoreContribution: { type: Number, default: null },
    reasonTags: [{ type: String }]
}, { timestamps: true });

PlanogramPlacementSchema.index(
    { ownerUserId: 1, planogramId: 1, levelId: 1, positionXcm: 1 },
    { unique: true }
);

export default mongoose.model("PlanogramPlacement", PlanogramPlacementSchema);
