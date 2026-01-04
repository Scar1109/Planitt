import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
    runOptimization,
    getOptimizationRuns,
    getShelves,
    createShelf,
    deleteShelf,
    deleteOptimizationRun,
    getAllPlanograms,
    getPlanogramById
} from '../controllers/planogramController.js';

const router = express.Router();

// Specific Routes FIRST
// Shelves
router.use(protect); // Protect specific routes if needed, or move protection logic per route
router.get('/shelves', getShelves);
router.post('/shelves', createShelf);
router.delete('/shelves/:id', deleteShelf);

// Optimization
router.post('/optimize', runOptimization);
router.get('/optimization/runs', getOptimizationRuns);
router.delete('/optimization/runs/:id', deleteOptimizationRun);

// Planogram CRUD (Generic routes LAST)
router.get('/', getAllPlanograms);
router.get('/:id', getPlanogramById); // This catches everything else

export default router;
