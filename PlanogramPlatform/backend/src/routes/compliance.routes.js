import express from 'express';
import { analyzeCompliance, triggerTraining, getSystemMetadata, getAllRuns, deleteRun, rerunCompliance } from '../controllers/complianceController.js';

const router = express.Router();

router.post('/check', analyzeCompliance);
router.get('/runs', getAllRuns);
router.delete('/runs/:id', deleteRun);
router.post('/runs/:id/rerun', rerunCompliance);
router.post('/train', triggerTraining);
router.get('/metadata', getSystemMetadata);

export default router;
