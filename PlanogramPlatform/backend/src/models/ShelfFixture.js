import mongoose from "mongoose";

const ShelfFixtureSchema = new mongoose.Schema({
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    aisleBaySide: { type: String, required: true, index: true },
    fixtureType: { type: String, enum: ["gondola", "wall", "endcap", "rack", "other"], default: "other" },
    totalWidthCm: { type: Number, required: true },
    totalHeightCm: { type: Number, required: true },
    totalDepthCm: { type: Number, required: true },
    tags: [{ type: String, index: true }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

ShelfFixtureSchema.index({ ownerUserId: 1, aisleBaySide: 1 }, { unique: true });

export default mongoose.model("ShelfFixture", ShelfFixtureSchema);
