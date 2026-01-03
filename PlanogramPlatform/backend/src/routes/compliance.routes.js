import express from 'express';
import { analyzeCompliance, triggerTraining, getSystemMetadata } from '../controllers/complianceController.js';

const router = express.Router();

router.post('/check', analyzeCompliance);
router.post('/train', triggerTraining);
router.get('/metadata', getSystemMetadata);

export default router;
