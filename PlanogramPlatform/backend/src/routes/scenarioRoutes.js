import express from 'express';
import { simulateQuickWhatIf, comparePlanograms, getFutureTrend } from '../controllers/scenarioController.js';

const router = express.Router();

router.post('/quick-what-if', simulateQuickWhatIf);
router.post('/planogram-promo', comparePlanograms);
router.post('/future-trend', getFutureTrend);

export default router;
