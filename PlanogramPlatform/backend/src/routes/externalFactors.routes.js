import express from 'express';
import { getExternalFactorsAnalysis } from '../controllers/externalFactors.controller.js';

const router = express.Router();

// GET /api/external-factors - Get comprehensive external factors analysis
router.get('/', getExternalFactorsAnalysis);

export default router;
