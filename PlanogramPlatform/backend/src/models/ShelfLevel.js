import mongoose from "mongoose";

const ShelfLevelSchema = new mongoose.Schema({
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true, index: true },
    fixtureId: { type: mongoose.Schema.Types.ObjectId, ref: "ShelfFixture", required: true, index: true },
    levelIndex: { type: Number, required: true },
    heightFromFloorCm: { type: Number, required: true },
    usableWidthCm: { type: Number, required: true },
    usableHeightCm: { type: Number, required: true },
    usableDepthCm: { type: Number, required: true },
    weightLimitKg: { type: Number, default: null }
}, { timestamps: true });

ShelfLevelSchema.index({ storeId: 1, fixtureId: 1, levelIndex: 1 }, { unique: true });

export default mongoose.model("ShelfLevel", ShelfLevelSchema);
