import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
    runOptimization,
    getOptimizationRuns,
    getShelves,
    createShelf,
    deleteShelf,
    deleteOptimizationRun
} from '../controllers/planogramController.js';

const router = express.Router();

router.use(protect);

// Optimization
// Optimization
router.post('/optimize', runOptimization);
router.get('/optimization/runs', getOptimizationRuns);
router.delete('/optimization/runs/:id', deleteOptimizationRun);

// Shelves
router.get('/shelves', getShelves);
router.post('/shelves', createShelf);
router.delete('/shelves/:id', deleteShelf);

export default router;
