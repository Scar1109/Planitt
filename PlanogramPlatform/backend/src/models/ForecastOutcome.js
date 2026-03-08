import mongoose from "mongoose";

const ForecastOutcomeSchema = new mongoose.Schema({
    sku: { type: String, index: true },
    store_id: String,
    forecast_date: { type: Date, index: true },
    generated_at: Date,
    predicted_demand: Number,
    actual_demand: Number,
    error_pct: Number,
    outcome_type: { type: String, enum: ['accurate', 'overstock', 'stockout', 'waste_risk'], index: true },
    bias_direction: { type: String, enum: ['over', 'under', 'neutral'] },
    multipliers_used: {
        holiday: Number,
        weather: Number,
        weekend: Number,
        monsoon: Number,
        bias_correction: Number
    },
    category: String,
    correction_applied: Number,
    evaluated_at: { type: Date, default: Date.now }
});

ForecastOutcomeSchema.index({ sku: 1, forecast_date: 1 });
ForecastOutcomeSchema.index({ evaluated_at: -1 });

export default mongoose.model("ForecastOutcome", ForecastOutcomeSchema, "forecast_outcomes");
