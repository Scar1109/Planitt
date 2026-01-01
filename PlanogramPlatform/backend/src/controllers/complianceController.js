import axios from 'axios';
import complianceAgent from '../agents/complianceAgent.js';

const PYTHON_SERVICE_URL = 'http://localhost:8000';

export const analyzeCompliance = async (req, res) => {
    try {
        const { current_planogram, optimized_planogram } = req.body;

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
            agent_summary: agentSummary
        };

        res.json(finalResponse);

    } catch (error) {
        console.error("Compliance Controller Error:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

export const triggerTraining = async (req, res) => {
    // Optional: Trigger training via Python API if implemented, or just return mock msg
    res.json({ message: "Training trigger not yet exposed via API." });
};
