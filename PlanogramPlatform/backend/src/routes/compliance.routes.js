import express from 'express';
import { analyzeCompliance, triggerTraining } from '../controllers/complianceController.js';

const router = express.Router();

router.post('/check', analyzeCompliance);
router.post('/train', triggerTraining);

export default router;
