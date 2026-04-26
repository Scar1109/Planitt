import axios from 'axios';
import { OpenAI } from 'openai';
import SavedSimulation from '../models/SavedSimulation.js';

const PYTHON_SERVICE_URL = 'http://localhost:8001/api/v1';

export const checkHealth = async (req, res) => {
    try {
        const response = await axios.get(`http://localhost:8001/health`);
        res.json(response.data);
    } catch (error) {
        console.error('Error calling Python health endpoint:', error.message);
        res.status(503).json({ message: 'Python promotion forecasting service unavailable' });
    }
};

export const simulatePromotion = async (req, res) => {
    try {
        // Forward the request body directly to the Python service
        const response = await axios.post(`${PYTHON_SERVICE_URL}/simulate/sku`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Error calling Python service:', error.message);
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            res.status(503).json({ message: 'Python service unavailable' });
        } else {
            // Something happened in setting up the request that triggered an Error
            res.status(500).json({ message: 'Error calling promotion forecasting service', error: error.message });
        }
    }
};

export const generatePlan = async (req, res) => {
    try {
        // 1. Send data to Python (Deterministic Math Engine)
        const pythonResponse = await axios.post(`${PYTHON_SERVICE_URL}/plan/generate`, req.body);
        const deterministicPlan = pythonResponse.data;

        // 2. Generate Narrative Explanation (LLM Engine via Node)
        let narrativeExplanation = "";
        try {
            const openai = new OpenAI(); // Automatically uses process.env.OPENAI_API_KEY
            const prompt = `
                You are a Senior Retail Strategist. Please briefly summarize and explain the following scientifically-formulated promotion plan.
                Do not make up any new numeric facts. Only rely on the numbers provided in the JSON payload:
                JSON: ${JSON.stringify(deterministicPlan.summary_stats)} \\n\\n
                Focus on the high-level impact and the key recommended items.
            `;
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "You are a professional retail planner explaining data clearly. Mention no new numbers." },
                    { role: "user", content: prompt }
                ],
                max_tokens: 300,
                temperature: 0.7
            });
            narrativeExplanation = completion.choices[0].message.content.trim();
        } catch (llmError) {
            console.error("OpenAI Narrative Generation Error:", llmError.message);
            narrativeExplanation = "LLM Generation failed or API Key missing. Falling back to raw numerical output only.";
        }

        // 3. Compose Final Response
        const finalPlan = {
            ...deterministicPlan,
            narrative_explanation: narrativeExplanation
        };

        res.json(finalPlan);
    } catch (error) {
        console.error('Error calling Python service:', error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ message: 'Error calling promotion planning service', error: error.message });
        }
    }
};

export const explainSimulation = async (req, res) => {
    try {
        const simData = req.body;
        const openai = new OpenAI();
        const prompt = `
            You are a Retail Strategist. Briefly explain the financial outcome of this proposed promotion in 2-3 sentences.
            The user wants to discount sku ${simData.sku_id} by ${simData.discount * 100}%.
            This will result in an uplift of ${simData.uplift.toFixed(2)} units over ${simData.duration_days} days.
            The total Revenue Lift compared to doing nothing is Rs. ${simData.revenue_lift.toFixed(2)}.
            The total Profit Lift (accounting for margin lost on base units) is Rs. ${simData.profit_lift.toFixed(2)}.
            Is this a good idea? Explain why.
        `;
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: "You are a professional retail planner." }, { role: "user", content: prompt }],
            max_tokens: 200,
            temperature: 0.7
        });
        res.json({ explanation: completion.choices[0].message.content.trim() });
    } catch (error) {
        console.error("OpenAI Error:", error.message);
        res.status(500).json({ explanation: "Explanation generation failed. Please check backend logs or OpenAI credits." });
    }
};

export const findOptimalDiscount = async (req, res) => {
    try {
        const payload = req.body; // should pass { sku: {...}, duration_days: X }

        // Search discount levels from 5% to 80% in 5% steps (16 levels instead of 76)
        // Process in small sequential batches to avoid overwhelming the Python API server
        const discountLevels = [];
        for (let d = 5; d <= 80; d += 5) {
            discountLevels.push(d / 100);
        }

        const BATCH_SIZE = 4; // Process 4 at a time to avoid ECONNRESET
        const allResults = [];

        for (let i = 0; i < discountLevels.length; i += BATCH_SIZE) {
            const batch = discountLevels.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(discount => {
                const simPayload = { ...payload, test_discount: discount };
                return axios.post(`${PYTHON_SERVICE_URL}/simulate/sku`, simPayload, {
                    timeout: 30000 // 30s timeout per request
                }).then(response => ({
                    discount: discount,
                    simulation: response.data,
                    profit_lift: response.data.profit_lift
                })).catch(err => {
                    console.warn(`Discount ${(discount * 100).toFixed(0)}% failed: ${err.message}`);
                    return null; // Skip failed requests instead of crashing
                });
            });

            const batchResults = await Promise.all(batchPromises);
            allResults.push(...batchResults.filter(r => r !== null));
        }

        if (allResults.length === 0) {
            return res.status(500).json({ message: 'All discount simulations failed' });
        }

        // Sort by absolute profit generation descending
        allResults.sort((a, b) => b.profit_lift - a.profit_lift);

        const top5 = allResults.slice(0, 5);

        res.json({
            optimal_discount: top5[0].discount,
            simulation: top5[0].simulation,
            top_5: top5
        });
    } catch (error) {
        console.error('Error finding optimal discount:', error.message);
        res.status(500).json({ message: 'Error finding optimal discount', error: error.message });
    }
};

export const saveSimulation = async (req, res) => {
    try {
        const newSim = new SavedSimulation(req.body);
        const saved = await newSim.save();
        res.status(201).json(saved);
    } catch (error) {
        console.error('Error saving simulation:', error.message);
        res.status(500).json({ message: 'Error saving simulation', error: error.message });
    }
};

export const getSavedSimulations = async (req, res) => {
    try {
        const sims = await SavedSimulation.find().sort({ createdAt: -1 });
        res.json(sims);
    } catch (error) {
        console.error('Error fetching saved simulations:', error.message);
        res.status(500).json({ message: 'Error fetching saved simulations', error: error.message });
    }
};
