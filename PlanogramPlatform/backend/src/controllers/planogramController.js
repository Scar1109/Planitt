import planogramAgent from '../agents/planogramAgent.js';
import ShelfFixture from '../models/ShelfFixture.js';
import ShelfLevel from '../models/ShelfLevel.js';
import OptimizationRun from '../models/OptimizationRun.js';

export const runOptimization = async (req, res) => {
    try {
        const { planogramId } = req.body;
        const userId = req.user._id;

        if (!planogramId) {
            return res.status(400).json({ error: "planogramId is required" });
        }

        const result = await planogramAgent.orchestrateOptimization(userId, planogramId);
        res.json(result);

    } catch (error) {
        console.error("Optimization Error:", error);
        res.status(500).json({ error: "Failed to start optimization" });
    }
};

export const getOptimizationRuns = async (req, res) => {
    try {
        const runs = await OptimizationRun.find({ ownerUserId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(10);
        res.json(runs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch runs" });
    }
};

// --- Shelf Management ---

export const getShelves = async (req, res) => {
    try {
        if (!req.user.store) {
            return res.json([]);
        }

        const fixtures = await ShelfFixture.find({ storeId: req.user.store, isActive: true });

        // For each fixture, get levels
        const fixturesWithLevels = await Promise.all(fixtures.map(async (fixture) => {
            const levels = await ShelfLevel.find({ fixtureId: fixture._id }).sort({ levelIndex: 1 });
            return { ...fixture.toObject(), levels };
        }));

        res.json(fixturesWithLevels);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch shelves" });
    }
};

export const createShelf = async (req, res) => {
    try {
        const { aisleBaySide, fixtureType, totalWidthCm, totalHeightCm, totalDepthCm, levels, tags } = req.body;

        if (!req.user.store) {
            return res.status(400).json({ error: "User is not assigned to a store." });
        }

        const newFixture = new ShelfFixture({
            storeId: req.user.store,
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
                storeId: req.user.store,
                fixtureId: newFixture._id,
                levelIndex: index,
                heightFromFloorCm: lvl.heightFromFloorCm || (index * 40),
                usableWidthCm: lvl.usableWidthCm || totalWidthCm,
                usableHeightCm: lvl.usableHeightCm || 40,
                usableDepthCm: lvl.usableDepthCm || totalDepthCm
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
        await ShelfFixture.findOneAndUpdate({ _id: id, storeId: req.user.store }, { isActive: false });
        res.json({ message: "Shelf deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete shelf" });
    }
};
