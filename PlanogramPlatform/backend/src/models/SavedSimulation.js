import mongoose from 'mongoose';

const savedSimulationSchema = new mongoose.Schema({
    skuId: { type: String, required: true },
    productName: { type: String, required: true },
    basePrice: { type: Number, required: true },
    costPrice: { type: Number, required: true },
    durationDays: { type: Number, required: true },
    discount: { type: Number, required: true },
    baseline: { type: Number, required: true },
    uplift: { type: Number, required: true },
    revenueLift: { type: Number, required: true },
    profitLift: { type: Number, required: true },
    aiExplanation: { type: String },
    risks: { type: Object }
}, { timestamps: true });

const SavedSimulation = mongoose.model('SavedSimulation', savedSimulationSchema);

export default SavedSimulation;
