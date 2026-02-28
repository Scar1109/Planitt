import mongoose from 'mongoose';

const complianceRunSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    run_date: {
        type: Date,
        default: Date.now
    },
    planogram_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Planogram',
        required: true
    },
    compliance_score: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['success', 'failed', 'pending'],
        default: 'success'
    },
    details: {
        type: mongoose.Schema.Types.Mixed, // Storing flexible JSON result from Python model
        default: {}
    },
    model_version: {
        type: String,
        default: 'v1'
    }
}, {
    timestamps: true
});

const ComplianceRun = mongoose.model('ComplianceRun', complianceRunSchema);

export default ComplianceRun;
