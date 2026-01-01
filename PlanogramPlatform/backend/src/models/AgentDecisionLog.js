import mongoose from "mongoose";

const AgentDecisionLogSchema = new mongoose.Schema({
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    optimizationRunId: { type: mongoose.Schema.Types.ObjectId, ref: "OptimizationRun", required: true, index: true },
    planogramId: { type: mongoose.Schema.Types.ObjectId, ref: "Planogram", required: true, index: true },
    timestamp: { type: Date, default: Date.now },
    decisionType: {
        type: String,
        enum: [
            "choose_run_type",
            "choose_solver",
            "set_objective_weights",
            "set_hyperparams",
            "adjust_penalties",
            "stop_criteria",
            "recommend_constraints",
            "summarize_results"
        ],
        required: true
    },
    inputsUsed: { type: mongoose.Schema.Types.Mixed, default: {} },
    outputDecision: { type: mongoose.Schema.Types.Mixed, default: {} },
    justificationSummary: { type: String, default: "" },
    humanApproved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, default: null }
}, { timestamps: true });

export default mongoose.model("AgentDecisionLog", AgentDecisionLogSchema);
