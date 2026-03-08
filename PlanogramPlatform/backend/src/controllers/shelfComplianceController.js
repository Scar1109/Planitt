import OptimizationRun from '../models/OptimizationRun.js';
import Product from '../models/Product.js';
import complianceAgent from '../agents/complianceAgent.js';
import mongoose from 'mongoose';
import ShelfLevel from '../models/ShelfLevel.js';
import axios from 'axios';

export const analyzeShelfScan = async (req, res) => {
    try {
        const { optimizationRunId, fixtureId } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "No image file uploaded." });
        }

        if (!optimizationRunId || !fixtureId) {
            return res.status(400).json({ message: "Missing optimizationRunId or fixtureId." });
        }

        // 1. Fetch Expected Placements for this Fixture from the Optimization Run
        const run = await OptimizationRun.findById(optimizationRunId);
        if (!run) {
            return res.status(404).json({ message: "Optimization run not found." });
        }

        const expectedPlacements = run.resultingPlacements.filter(p => {
            const fid = p.fixtureId || p.fixture_id;
            return fid && fid.toString() === fixtureId.toString();
        });

        if (expectedPlacements.length === 0) {
            const availableFids = [...new Set(run.resultingPlacements.map(p => p.fixtureId || p.fixture_id))];
            console.log(`[ShelfCompliance] No placements for fixture ${fixtureId}. Available in run:`, availableFids);
            return res.status(400).json({ 
                message: "No expected placements found for this fixture in the selected run.",
                details: `This optimization run only contains data for fixtures: ${availableFids.join(', ')}`
            });
        }

        // 1.1 Fetch ShelfLevels to map level_id to levelIndex
        const levels = await ShelfLevel.find({ fixtureId: fixtureId }).sort({ levelIndex: 1 });
        const levelMap = levels.reduce((acc, l) => ({ ...acc, [l._id.toString()]: l.levelIndex }), {});

        // 2. Fetch Product metadata and build level-based grounding map
        const skus = expectedPlacements.map(p => p.sku);
        const products = await Product.find({ sku: { $in: skus } });
        const productMap = products.reduce((acc, p) => ({ ...acc, [p.sku]: p }), {});

        // Group by level for more natural vision "scanning"
        const groundingByLevel = expectedPlacements.reduce((acc, p) => {
            const lid = p.levelId || p.level_id;
            const levelIdx = p.levelIndex !== undefined ? p.levelIndex : (lid ? levelMap[lid.toString()] : 0);
            
            if (!acc[levelIdx]) acc[levelIdx] = [];
            acc[levelIdx].push({
                sku: p.sku,
                name: productMap[p.sku]?.productName || "Unknown Product",
                expectedFacings: p.facings
            });
            return acc;
        }, {});

        console.log(`[ShelfCompliance] Level-Based Grounding:`, JSON.stringify(groundingByLevel, null, 2));

        // 3. Process Image for OpenAI Vision
        const imageBase64 = file.buffer.toString('base64');

        // 4. Call OpenAI Agent
        console.log(`[ShelfCompliance] Analyzing image for fixture ${fixtureId}...`);
        const visionResult = await complianceAgent.analyzeShelfImage(imageBase64, groundingByLevel);

        // 5. Comparison Logic & Metric Calculation
        const detectedMap = visionResult.detected_items.reduce((acc, item) => ({ 
            ...acc, [item.sku]: item.count 
        }), {});

        const comparison = expectedPlacements.map(exp => {
            const detectedCount = detectedMap[exp.sku] || 0;
            const diff = detectedCount - exp.facings;
            const product = productMap[exp.sku];
            
            // Map level_id to levelIndex if missing
            const lid = exp.levelId || exp.level_id;
            const levelIndex = exp.levelIndex !== undefined ? exp.levelIndex : (lid ? levelMap[lid.toString()] : 0);

            return {
                sku: exp.sku,
                productName: product?.productName || "Unknown",
                expected: exp.facings, // This is horizontal facings
                detected: detectedCount,
                deviation: diff,
                levelIndex: levelIndex,
                // Predictive components
                price: product?.baseUnitPriceLKR || 0,
                dailyVelocity: product?.avgDailySales || 1.5 // Mock/Fallback
            };
        });

        // --- Calculate Academic Metrics ---
        const totalExpected = expectedPlacements.reduce((sum, p) => sum + p.facings, 0);
        const totalDetected = visionResult.detected_items.reduce((sum, item) => sum + item.count, 0);
        const absoluteDeviation = comparison.reduce((sum, c) => sum + Math.abs(c.deviation), 0);
        
        const deviationPercentage = (absoluteDeviation / totalExpected) * 100;
        const oosCount = comparison.filter(c => c.detected === 0).length;
        const pas = Math.max(0, 100 - deviationPercentage); // Planogram Adherence Score

        // --- Calculate Audit Metrics ---
        const revenueRecovery = comparison.reduce((sum, c) => {
            if (c.deviation < 0) {
                // Simplified: Loss based on missing horizontal facings
                return sum + (Math.abs(c.deviation) * c.price * 0.2); 
            }
            return sum;
        }, 0);

        const stockoutRisks = comparison.map(c => {
            if (c.detected === 0) return { sku: c.sku, risk: 100 };
            
            // Simplified: Current facings vs daily velocity
            const daysRemaining = c.detected / c.dailyVelocity;
            
            const risk = daysRemaining < 1 ? 90 : daysRemaining < 2 ? 60 : 20;
            return { sku: c.sku, risk };
        }).filter(r => r.risk > 50);

        // --- Generate Improvement Suggestions ---
        const suggestions = [];
        comparison.forEach(c => {
            if (c.deviation < 0) {
                suggestions.push(`Restock ${c.productName} (SKU: ${c.sku}) - Missing ${Math.abs(c.deviation)} facings.`);
            } else if (c.deviation > 0) {
                suggestions.push(`Reduce overstock of ${c.productName} (SKU: ${c.sku}) - ${c.deviation} extra facings.`);
            }
        });

        if (visionResult.oos_gaps_detected > 0) {
            suggestions.push(`Prioritize filling the ${visionResult.oos_gaps_detected} empty shelf gaps detected.`);
        }

        // --- Academic Python Model Integration ---
        // Construct digital planograms for the academic engine
        const optimizedPlanogram = {
            placements: expectedPlacements.map(p => ({
                sku: p.sku,
                fixtureId: p.fixtureId || p.fixture_id,
                levelIndex: p.levelIndex !== undefined ? p.levelIndex : (p.levelId ? levelMap[p.levelId.toString()] : 0),
                positionXcm: p.positionXcm || 0,
                facings: p.facings
            }))
        };

        const currentPlanogram = {
            placements: comparison
                .filter(c => c.detected > 0) // Only items actually present on the shelf
                .map(c => ({
                    sku: c.sku,
                    fixtureId: fixtureId,
                    levelIndex: c.levelIndex,
                    positionXcm: 0, // 2D Vision doesn't provide precise X for now
                    facings: c.detected
                }))
        };

        let pythonResult = null;
        try {
            const pyRes = await axios.post(`http://localhost:8002/analyze`, {
                current_planogram: currentPlanogram,
                optimized_planogram: optimizedPlanogram
            });
            pythonResult = pyRes.data;
        } catch (error) {
            console.warn("[ShelfCompliance] Python Service unavailable, falling back to simplified JS metrics.");
        }

        const finalReport = {
            metadata: {
                optimizationRunId,
                fixtureId,
                timestamp: new Date().toISOString()
            },
            vision_raw: visionResult,
            comparison: comparison,
            metrics: {
                pas: pythonResult ? Math.round(pythonResult.score) : Math.round(pas),
                deviationPct: Math.round(deviationPercentage),
                oosCount: oosCount,
                revenueRecovery: Math.max(0, pythonResult ? Math.round(pythonResult.total_revenue_opportunity) : Math.round(revenueRecovery)),
                stockoutRisks: stockoutRisks,
                isAcademic: !!pythonResult
            },
            suggestions: suggestions.slice(0, 5), 
            audit_insight: visionResult.audit_insight
        };

        res.json(finalReport);

    } catch (error) {
        console.error("Shelf Compliance Analysis Error:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};
