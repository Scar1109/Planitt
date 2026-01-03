import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
    runOptimization,
    getOptimizationRuns,
    getShelves,
    createShelf,
    deleteShelf
} from '../controllers/planogramController.js';

const router = express.Router();

router.use(protect);

// Optimization
router.post('/optimization/run', runOptimization);
router.get('/optimization/runs', getOptimizationRuns);

// Shelves
router.get('/shelves', getShelves);
router.post('/shelves', createShelf);
router.delete('/shelves/:id', deleteShelf);

export default router;
