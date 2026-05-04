import OpenAI from 'openai';
import axios from 'axios';
import mongoose from 'mongoose';
import OptimizationRun from '../models/OptimizationRun.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Store from '../models/Store.js';
import ShelfFixture from '../models/ShelfFixture.js';
import ShelfLevel from '../models/ShelfLevel.js';
import ConstraintRule from '../models/ConstraintRule.js';

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
                model: process.env.OPENAI_MODEL,
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
    async orchestrateOptimization(userId, planogramId, userConfig = null) {
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
        let config;
        if (userConfig) {
            console.log("[Agent] Using Manual User Configuration");
            config = userConfig;

            // Map Frontend RunType to Backend Enum
            const runTypeMap = {
                'fast': 'heuristic_only',
                'balanced': 'hybrid',
                'deep': 'metaheuristic_only'
            };
            if (runTypeMap[config.runType]) {
                config.runType = runTypeMap[config.runType];
            }

            // Ensure default structure if missing
            if (!config.objectiveWeights) config.objectiveWeights = { sales: 0.5, margin: 0.5 };
            if (!config.hyperparams) config.hyperparams = { iterations: 100 };
            config.explanation = "Manual User Configuration";
        } else {
            console.log("[Agent] Generating Auto-Configuration");
            config = await this.analyzeDataAndGetConfig(userId);
        }

        // Ensure planogramId is a valid ObjectId
        let validPlanogramId = planogramId;
        if (!mongoose.Types.ObjectId.isValid(planogramId)) {
            validPlanogramId = new mongoose.Types.ObjectId(); // Generate a valid ID
            console.log(`[Agent] Generated new ObjectId for run: ${validPlanogramId}`);
        }

        // 3. Create OptimizationRun record
        const runRecord = new OptimizationRun({
            ownerUserId: userId,
            planogramId: validPlanogramId,
            runType: config.runType, // Now mapped correctly
            solver: config.solver || "python_optimizer_v1",
            objectiveWeights: config.objectiveWeights,
            hyperparams: config.hyperparams,
            status: "running",
            logsRef: `Run initialized for Store: ${store.name}. Strategy: ${config.explanation}`
        });
        await runRecord.save();

        const startTime = Date.now();
        try {
            // 4. Gather Data (Products, Fixtures, Levels)
            const products = await Product.find({}).lean();

            // Fetch active constraints for this user
            const activeConstraints = await ConstraintRule.find({
                ownerUserId: userId,
                isActive: true
            }).lean();
            console.log(`[Agent] Loaded ${activeConstraints.length} active constraints.`);

            // Initial Fetch
            const allFixtures = await ShelfFixture.find({ storeId: store._id, isActive: true }).lean();
            if (allFixtures.length === 0) throw new Error("No active fixtures found for this store.");

            const allFixtureIds = allFixtures.map(f => f._id);
            const allLevels = await ShelfLevel.find({ fixtureId: { $in: allFixtureIds } }).lean();

            let targetFixtures = allFixtures;
            let targetLevels = allLevels;

            // Apply Scope Filtering
            if (config.scope) {
                console.log(`[Agent] Filtering scope: ${config.scope.type}`);

                if (config.scope.type === 'fixture' && config.scope.fixtureId) {
                    // Filter for Single Fixture
                    targetFixtures = allFixtures.filter(f => f._id.toString() === config.scope.fixtureId);
                    targetLevels = allLevels.filter(l => l.fixtureId.toString() === config.scope.fixtureId);

                } else if (config.scope.type === 'level' && config.scope.levelId) {
                    // Filter for Single Level
                    const selectedLevel = allLevels.find(l => l._id.toString() === config.scope.levelId);
                    if (selectedLevel) {
                        targetLevels = [selectedLevel];
                        targetFixtures = allFixtures.filter(f => f._id.toString() === selectedLevel.fixtureId.toString());
                    }
                }
            }

            // Construct Payload for Python Service
            const payload = {
                run_id: runRecord._id.toString(),
                config: config,
                products: products,
                fixtures: targetFixtures,
                levels: targetLevels.map(l => ({
                    ...l,
                    tags: l.tags || []
                })),
                constraints: activeConstraints
            };

            // DEBUG: Log sample level to ensure tags are present
            if (payload.levels.length > 0) {
                console.log("[Agent] Sample Level Tags:", JSON.stringify(payload.levels[0].tags));
            }

            // 5. Call Python Service (Sync wait for demonstration)
            console.log(`[Agent] Sending ${products.length} products and ${targetLevels.length} levels to Python...`);
            const response = await axios.post(`${this.pythonUrl}/optimize`, payload);

            if (response.data.status === 'success') {
                const runtimeMs = Date.now() - startTime;
                const heuristicScore = response.data.heuristic_score || 0;
                const bestScore = response.data.score;
                const improvementPct = heuristicScore !== 0
                    ? ((bestScore - heuristicScore) / Math.abs(heuristicScore) * 100)
                    : 0;

                console.log(`[Agent] Optimization Success. Score: ${bestScore}, Runtime: ${runtimeMs}ms, Improvement: ${improvementPct.toFixed(2)}%`);

                // Update Run Record
                runRecord.status = "success";
                runRecord.bestScore = bestScore;
                runRecord.baselineScore = heuristicScore;
                runRecord.improvementPct = Math.round(improvementPct * 100) / 100;
                runRecord.runtimeMs = runtimeMs;
                runRecord.resultingPlacements = response.data.placements;
                runRecord.convergenceHistory = response.data.convergence_history || [];
                runRecord.constraintViolations = response.data.constraint_violations || [];
                runRecord.heuristicScore = heuristicScore;
                runRecord.finishedAt = new Date();
                runRecord.logsRef += `\nOptimization completed. Score: ${bestScore}. Improvement: ${improvementPct.toFixed(2)}%. Runtime: ${runtimeMs}ms`;
                await runRecord.save();

                return {
                    runId: runRecord._id,
                    status: "success",
                    score: bestScore,
                    heuristicScore: heuristicScore,
                    improvementPct: Math.round(improvementPct * 100) / 100,
                    runtimeMs: runtimeMs,
                    placementCount: response.data.placements.length,
                    resultingPlacements: response.data.placements,
                    convergenceHistory: response.data.convergence_history || [],
                    constraintViolations: response.data.constraint_violations || [],
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
