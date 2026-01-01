import mongoose from "mongoose";

const PerformanceMetricSchema = new mongoose.Schema({
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    planogramId: { type: mongoose.Schema.Types.ObjectId, ref: "Planogram", required: true, index: true },
    optimizationRunId: { type: mongoose.Schema.Types.ObjectId, ref: "OptimizationRun", default: null, index: true },
    windowStart: { type: Date, required: true },
    windowEnd: { type: Date, required: true },
    spaceUtilizationPct: { type: Number, default: null },
    stockoutRatePct: { type: Number, default: null },
    wasteRatePct: { type: Number, default: null },
    salesUnits: { type: Number, default: null },
    salesValueLKR: { type: Number, default: null },
    grossMarginLKR: { type: Number, default: null },
    notes: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.model("PerformanceMetric", PerformanceMetricSchema);
