
import Planogram from '../models/Planogram.js';
import PlanogramPlacement from '../models/PlanogramPlacement.js';
// Import referenced models to ensure Schema registration
import '../models/ShelfLevel.js';
import '../models/ShelfFixture.js';
import planogramAgent from '../agents/planogramAgent.js';
import ShelfFixture from '../models/ShelfFixture.js';
import ShelfLevel from '../models/ShelfLevel.js';
import OptimizationRun from '../models/OptimizationRun.js';

export const getAllPlanograms = async (req, res) => {
    try {
        // Fetch all planograms, sorted by newest first
        const planograms = await Planogram.find()
            .select('name status validFrom validTo updatedAt')
            .sort({ updatedAt: -1 });

        res.status(200).json({
            status: 'success',
            results: planograms.length,
            data: {
                planograms
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getPlanogramById = async (req, res) => {
    try {
        const { id } = req.params;

        const planogram = await Planogram.findById(id);

        if (!planogram) {
            return res.status(404).json({ message: 'Planogram not found' });
        }

        // Fetch placements and populate level info to get levelIndex
        const placements = await PlanogramPlacement.find({ planogramId: id })
            .populate({
                path: 'levelId',
                select: 'levelIndex'
            })
            .populate({
                path: 'fixtureId',
                select: 'name'
            });

        // Transform to the format expected by the Python Compliance Engine
        const formattedPlacements = placements.map(p => ({
            sku: p.sku,
            fixtureId: p.fixtureId?._id || "unknown", // Use ID or Name depending on consistency needs
            levelIndex: p.levelId?.levelIndex || 0,   // Crucial for Shelf Level enforcement
            facings: p.facings
        }));

        res.status(200).json({
            status: 'success',
            data: {
                planogram,
                placements: formattedPlacements
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const runOptimization = async (req, res) => {
    try {
        let { planogramId, config } = req.body;
        const userId = req.user._id;

        // Temp: If no planogramId, use a dummy one for now or create one
        if (!planogramId) {
            const timestamp = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
            planogramId = "Planogram_" + timestamp;
        }

        const result = await planogramAgent.orchestrateOptimization(userId, planogramId, config);
        res.json(result);

    } catch (error) {
        console.error("Optimization Error:", error);
        res.status(500).json({ error: "Failed to start optimization" });
    }
};

export const getOptimizationRuns = async (req, res) => {
    try {
        // More permissive for prototype/compliance audit
        // Show successful runs for the user OR all successful runs if user is admin/missing role
        // More defensive query for prototype/compliance audit
        const userRole = req.user?.role || 'guest';
        const userId = req.user?._id;

        const query = (userRole === 'admin' || !userId) ? { status: "success" } : { 
            $or: [
                { ownerUserId: userId, status: "success" },
                { status: "success" } 
            ]
        };

        const runs = await OptimizationRun.find(query)
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(runs);
    } catch (error) {
        console.error("Get Optimization Runs Error:", error);
        res.status(500).json({ error: "Failed to fetch runs" });
    }
};

// --- Shelf Management ---

export const getShelves = async (req, res) => {
    try {
        let storeId = req.user.store;

        // Fallback for prototype/dev if user has no store assigned
        if (!storeId) {
            console.log("No store on user, using fallback store.");
            storeId = "6956357610ec0ab348888893";
        }

        const fixtures = await ShelfFixture.find({ storeId: storeId, isActive: true });

        // For each fixture, get levels
        const fixturesWithLevels = await Promise.all(fixtures.map(async (fixture) => {
            const levels = await ShelfLevel.find({ fixtureId: fixture._id }).sort({ levelIndex: 1 });
            return { ...fixture.toObject(), levels };
        }));

        res.json(fixturesWithLevels);
    } catch (error) {
        console.error("Get Shelves Error:", error);
        res.status(500).json({ error: "Failed to fetch shelves" });
    }
};

export const createShelf = async (req, res) => {
    try {
        const { aisleBaySide, fixtureType, totalWidthCm, totalHeightCm, totalDepthCm, levels, tags } = req.body;

        let storeId = req.user.store;
        if (!storeId) {
            console.log("[createShelf] No store on user, using fallback store.");
            storeId = "6956357610ec0ab348888893";
        }

        const newFixture = new ShelfFixture({
            storeId: storeId,
            aisleBaySide,
            fixtureType,
            totalWidthCm,
            totalHeightCm,
            totalDepthCm,
            tags: tags || [] // Save tags
        });
        await newFixture.save();

        if (levels && Array.isArray(levels)) {
            const levelDocs = levels.map((lvl, index) => ({
                storeId: storeId,
                fixtureId: newFixture._id,
                levelIndex: index,
                heightFromFloorCm: lvl.heightFromFloorCm || (index * 40),
                usableWidthCm: lvl.usableWidthCm || totalWidthCm,
                usableHeightCm: lvl.usableHeightCm || 40,
                usableDepthCm: lvl.usableDepthCm || totalDepthCm,
                tags: lvl.tags || [] // Save level tags
            }));

            await ShelfLevel.insertMany(levelDocs);
        }

        res.status(201).json(newFixture);

    } catch (error) {
        console.error("Create Shelf Error:", error);
        res.status(500).json({ error: "Failed to create shelf" });
    }
};

export const deleteShelf = async (req, res) => {
    try {
        const { id } = req.params;
        let storeId = req.user.store;
        if (!storeId) storeId = "6956357610ec0ab348888893";

        await ShelfFixture.findOneAndDelete({ _id: id, storeId: storeId });
        res.json({ message: "Shelf deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete shelf" });
    }
};

export const deleteOptimizationRun = async (req, res) => {
    try {
        const { id } = req.params;
        // Ensure user owns the run
        const deleted = await OptimizationRun.findOneAndDelete({ _id: id, ownerUserId: req.user._id });
        if (!deleted) {
            return res.status(404).json({ error: "Run not found or unauthorized" });
        }
        res.json({ message: "Optimization run deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete run" });
    }
};
