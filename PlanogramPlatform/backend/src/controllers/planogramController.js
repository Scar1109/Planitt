import Planogram from '../models/Planogram.js';
import PlanogramPlacement from '../models/PlanogramPlacement.js';
// Import referenced models to ensure Schema registration
import '../models/ShelfLevel.js';
import '../models/ShelfFixture.js';

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
