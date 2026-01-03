import OpenAI from 'openai';
import axios from 'axios';
import mongoose from 'mongoose';
import OptimizationRun from '../models/OptimizationRun.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Store from '../models/Store.js';
import ShelfFixture from '../models/ShelfFixture.js';
import ShelfLevel from '../models/ShelfLevel.js';

class PlanogramAgent {
    constructor() {
        this.openai = null;
        this.pythonUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
    }

    _initOpenAI() {
        if (!this.openai && process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }
        if (!this.openai) {
            console.warn("OPENAI_API_KEY not found (Lazy Init). Agent will run in fallback simulation mode.");
        }
    }

    /**
     * analyzeDataAndGetConfig
     * 1. Fetches data summaries (mocked or real).
     * 2. Asks OpenAI for optimization strategy.
     * 3. Returns configuration object.
     */
    async analyzeDataAndGetConfig(userId) {
        try {
            // Mock Insights
            const insights = {
                salesVolatility: "Medium",
                stockLevel: "Adequate",
                promotionActive: true,
                dominantCategory: "Grocery"
            };

            const prompt = `
                You are a Retail Optimization Expert.
                Context:
                - Sales Volatility: ${insights.salesVolatility}
                - Stock Level: ${insights.stockLevel}
                - Promotion Active: ${insights.promotionActive}
                - Dominant Category: ${insights.dominantCategory}

                Recommend an optimization configuration for a Planogram.
                Return ONLY a JSON object with this structure:
                {
                    "runType": "hybrid", 
                    "objectiveWeights": { "sales": 0.0-1.0, "margin": 0.0-1.0, "consistency": 0.0-1.0 },
                    "hyperparams": { "initialTemperature": number, "coolingRate": number, "iterations": number },
                    "explanation": "Short text explaining why."
                }
            `;

            this._initOpenAI();

            if (!this.openai) throw new Error("OpenAI not initialized");

            const completion = await this.openai.chat.completions.create({
                messages: [{ role: "system", content: "You represent a sophisticated backend agent." }, { role: "user", content: prompt }],
                model: "gpt-3.5-turbo",
                response_format: { type: "json_object" }
            });

            const decision = JSON.parse(completion.choices[0].message.content);
            return decision;

        } catch (error) {
            console.error("Agent Error getting config:", error);
            // Fallback config
            return {
                runType: "hybrid",
                objectiveWeights: { sales: 0.7, margin: 0.3, consistency: 0.1 },
                hyperparams: { initialTemperature: 500, coolingRate: 0.95, iterations: 200 },
                explanation: "Fallback configuration due to agent error."
            };
        }
    }

    /**
     * orchestrateOptimization
     * Main entry point to run the pipeline.
     */
    async orchestrateOptimization(userId, planogramId) {
        console.log(`[Agent] Starting optimization for user ${userId}, planogram ${planogramId}`);

        // 1. Get User and Store
        const user = await User.findById(userId);
        if (!user) throw new Error("User not found");

        // Find store created by user or linked
        let store = await Store.findOne({ createdBy: userId });
        if (!store && user.store) {
            store = await Store.findById(user.store);
        }
        // Fallback or Admin Override (Planitt HQ) if verifying
        if (!store) {
            store = await Store.findById("6956357610ec0ab348888893");
        }

        if (!store) throw new Error("Store not found for user.");

        // 2. Get Agent Decision/Config
        const config = await this.analyzeDataAndGetConfig(userId);

        // 3. Create OptimizationRun record
        const runRecord = new OptimizationRun({
            ownerUserId: userId,
            planogramId: planogramId,
            runType: config.runType,
            solver: "python_optimizer_v1",
            objectiveWeights: config.objectiveWeights,
            hyperparams: config.hyperparams,
            status: "running",
            logsRef: `Run initialized for Store: ${store.name}. Strategy: ${config.explanation}`
        });
        await runRecord.save();

        try {
            // 4. Gather Data (Products, Fixtures, Levels)
            const products = await Product.find({}).lean();

            // Filter fixtures by Store ID
            const fixtures = await ShelfFixture.find({ storeId: store._id, isActive: true }).lean();
            if (fixtures.length === 0) throw new Error("No active fixtures found for this store.");

            const fixtureIds = fixtures.map(f => f._id);
            const levels = await ShelfLevel.find({ fixtureId: { $in: fixtureIds } }).lean();

            // Construct Payload for Python Service
            const payload = {
                run_id: runRecord._id.toString(),
                config: config,
                products: products,
                fixtures: fixtures,
                levels: levels
            };

            // 5. Call Python Service (Sync wait for demonstration)
            console.log(`[Agent] Sending ${products.length} products and ${levels.length} levels to Python...`);
            const response = await axios.post(`${this.pythonUrl}/optimize`, payload);

            if (response.data.status === 'success') {
                console.log(`[Agent] Optimization Success. Score: ${response.data.score}`);

                // Update Run Record
                runRecord.status = "success";
                runRecord.bestScore = response.data.score;
                runRecord.resultingPlacements = response.data.placements;
                runRecord.finishedAt = new Date();
                runRecord.logsRef += `\nOptimization completed. Score: ${response.data.score}`;
                await runRecord.save();

                return {
                    runId: runRecord._id,
                    status: "success",
                    score: response.data.score,
                    placementCount: response.data.placements.length,
                    message: "Optimization completed successfully."
                };
            } else {
                throw new Error(response.data.message || "Optimization failed in Python service.");
            }

        } catch (error) {
            console.error(`[Agent] Optimization Failed: ${error.message}`);
            runRecord.status = "failed";
            runRecord.errorMessage = error.message;
            runRecord.finishedAt = new Date();
            await runRecord.save();
            throw error;
        }
    }
}

export default new PlanogramAgent();
