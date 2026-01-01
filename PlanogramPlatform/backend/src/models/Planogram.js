import mongoose from "mongoose";

const PlanogramSchema = new mongoose.Schema({
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true },
    status: { type: String, enum: ["draft", "approved", "deployed", "archived"], default: "draft" },
    fixtureIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "ShelfFixture", index: true }],
    validFrom: { type: Date, default: null },
    validTo: { type: Date, default: null },
    baselinePlanogramId: { type: mongoose.Schema.Types.ObjectId, ref: "Planogram", default: null },
    lastOptimizationRunId: { type: mongoose.Schema.Types.ObjectId, ref: "OptimizationRun", default: null },
    notes: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.model("Planogram", PlanogramSchema);
