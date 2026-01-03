import express from 'express';
import { getAllPlanograms, getPlanogramById } from '../controllers/planogramController.js';

const router = express.Router();

router.get('/', getAllPlanograms);
router.get('/:id', getPlanogramById);

export default router;
