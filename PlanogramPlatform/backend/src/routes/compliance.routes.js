import express from 'express';
import { analyzeCompliance, triggerTraining, getSystemMetadata, getAllRuns, deleteRun, rerunCompliance } from '../controllers/complianceController.js';
import { analyzeShelfScan } from '../controllers/shelfComplianceController.js';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router.post('/check', analyzeCompliance);
router.get('/runs', getAllRuns);
router.delete('/runs/:id', deleteRun);
router.post('/runs/:id/rerun', rerunCompliance);
router.post('/train', triggerTraining);
router.get('/metadata', getSystemMetadata);

// New Shelf-Level Compliance Route
router.post('/shelf-scan', upload.single('image'), analyzeShelfScan);

export default router;
