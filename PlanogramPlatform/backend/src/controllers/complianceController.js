import axios from 'axios';
import complianceAgent from '../agents/complianceAgent.js';
import ComplianceRun from '../models/ComplianceRun.js';
import Planogram from '../models/Planogram.js';

const PYTHON_SERVICE_URL = 'http://localhost:8000';

export const analyzeCompliance = async (req, res) => {
    try {
        const { current_planogram, optimized_planogram, save_result, run_name } = req.body;

        if (!current_planogram || !optimized_planogram) {
            return res.status(400).json({ message: "Missing current or optimized planogram data." });
        }

        // 1. Call Python Compliance Service for Quantitative Analysis
        console.log("Calling Python Analysis Service...");
        let pythonResponse;
        try {
            const pyRes = await axios.post(`${PYTHON_SERVICE_URL}/analyze`, {
                current_planogram,
                optimized_planogram
            });
            pythonResponse = pyRes.data;
        } catch (error) {
            console.error("Python Service Error:", error.message);
            if (error.code === 'ECONNREFUSED') {
                return res.status(503).json({ message: "Compliance Analysis Service is unavailable." });
            }
            throw error;
        }

        // 2. Call OpenAI Agent for Qualitative Summary
        console.log("Calling OpenAI Agent...");
        const agentSummary = await complianceAgent.generateSummary(pythonResponse);

        // 3. Combine and Return
        const finalResponse = {
            ...pythonResponse,
            agent_summary: agentSummary,
            model_used: process.env.OPENAI_MODEL || "gpt-3.5-turbo"
        };

        // 4. Automatically Save Run
        const generatedName = run_name || `Compliance Run - ${new Date().toLocaleString()}`;

        try {
            // Assuming current_planogram has an _id or we use a provided ID
            const planogramId = current_planogram._id || current_planogram.id; 
            
            // Calculate an aggregate score if not provided directly
            const score = pythonResponse.score || pythonResponse.compliance_score || 0;

            const newRun = new ComplianceRun({
                name: generatedName,
                planogram_id: planogramId, 
                compliance_score: score,
                details: { ...finalResponse, inputs: { current_planogram, optimized_planogram } }, // Store inputs for rerun
                status: 'success'
            });
            await newRun.save();
            finalResponse.saved_run_id = newRun._id;
            finalResponse.run_name = generatedName;
        } catch (saveError) {
            console.error("Error saving compliance run:", saveError);
             // We don't fail the request if save fails, but we might want to notify
            finalResponse.save_error = saveError.message;
        }

        res.json(finalResponse);

    } catch (error) {
        console.error("Compliance Controller Error:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

export const getAllRuns = async (req, res) => {
    try {
        const runs = await ComplianceRun.find().sort({ createdAt: -1 });
        res.json(runs);
    } catch (error) {
        res.status(500).json({ message: "Error fetching runs", error: error.message });
    }
};

export const deleteRun = async (req, res) => {
    try {
        const { id } = req.params;
        await ComplianceRun.findByIdAndDelete(id);
        res.json({ message: "Run deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting run", error: error.message });
    }
};

export const rerunCompliance = async (req, res) => {
    try {
        const { id } = req.params;
        const run = await ComplianceRun.findById(id);
        if (!run) {
            return res.status(404).json({ message: "Run not found" });
        }

        // Check if we stored input data in details
        if (run.details && run.details.inputs) {
            const { current_planogram, optimized_planogram } = run.details.inputs;
            
            // Reuse analyze logic
            // We can call the analyze function internally or just duplicate the logic
            // Calling via axios locally or just refactoring analyzeCompliance to be callable?
            // For simplicity, I'll essentially replicate the analyzeCompliance core steps here
            
             // 1. Call Python Compliance Service
            const pyRes = await axios.post(`${PYTHON_SERVICE_URL}/analyze`, {
                current_planogram,
                optimized_planogram
            });
            const pythonResponse = pyRes.data;

            // 2. Call OpenAI Agent
            const agentSummary = await complianceAgent.generateSummary(pythonResponse);

             // 3. Combine
            const finalResponse = {
                ...pythonResponse,
                agent_summary: agentSummary,
                model_used: process.env.OPENAI_MODEL || "gpt-3.5-turbo"
            };
            
            // Update the existing run with new results? Or create new?
            // "rerun" usually implies updating the status or creating a new entry.
            // I'll update the existing run with new details.
            
            run.compliance_score = pythonResponse.compliance_score || 0;
            run.details = { ...finalResponse, inputs: run.details.inputs };
            run.run_date = new Date(); // Update timestamp
            await run.save();

            res.json({ message: "Run updated", result: finalResponse });
            
        } else {
             res.status(400).json({ message: "Historical data missing inputs, cannot rerun." });
        }

    } catch (error) {
        console.error("Rerun Error:", error);
        res.status(500).json({ message: "Error rerunning", error: error.message });
    }
};

export const triggerTraining = async (req, res) => {
    // Optional: Trigger training via Python API if implemented, or just return mock msg
    res.json({ message: "Training trigger not yet exposed via API." });
};

export const getSystemMetadata = async (req, res) => {
    try {
        const response = await axios.get(`${PYTHON_SERVICE_URL}/metadata`);
        res.json(response.data);
    } catch (error) {
        console.error("Metadata Fetch Error:", error.message);
        res.status(503).json({ 
            message: "Model metadata unavailable", 
            timestamp: new Date().toISOString(), 
            metrics: { MAE: 0, RMSE: 0 } 
        });
    }
};
