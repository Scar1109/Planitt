import mongoose from "mongoose";

const OptimizationRunSchema = new mongoose.Schema({
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    planogramId: { type: mongoose.Schema.Types.ObjectId, ref: "Planogram", required: true, index: true },
    runType: { type: String, enum: ["heuristic_only", "metaheuristic_only", "hybrid"], required: true },
    solver: { type: String, default: "" },
    constraintRuleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "ConstraintRule" }],
    objectiveWeights: { type: mongoose.Schema.Types.Mixed, default: {} },
    hyperparams: { type: mongoose.Schema.Types.Mixed, default: {} },
    inputsSnapshotHash: { type: String, default: "" },
    constraintsSnapshotHash: { type: String, default: "" },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
    runtimeMs: { type: Number, default: null },
    bestScore: { type: Number, default: null },
    baselineScore: { type: Number, default: null },
    improvementPct: { type: Number, default: null },
    status: { type: String, enum: ["queued", "running", "success", "failed"], default: "queued" },
    errorMessage: { type: String, default: "" },
    logsRef: { type: String, default: "" },
    resultingPlacements: { type: mongoose.Schema.Types.Mixed, default: [] }
}, { timestamps: true });

export default mongoose.model("OptimizationRun", OptimizationRunSchema);
