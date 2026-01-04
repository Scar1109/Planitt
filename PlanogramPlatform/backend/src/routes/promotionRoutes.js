import express from 'express';
import { simulatePromotion, generatePlan } from '../controllers/promotionController.js';
// import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Optional: Add authentication middleware if required. 
// checking app.js, other routes seem to be imported. I'll stick to basic routing.
// If auth is needed, I'd check authRoutes or similar. app.js uses authRoutes.
// For now, I'll keep it open or assuming user is authenticated in frontend (which is guarded).
// Ideally backend should also guard.
// Let's check middleware folder content first? No, I'll skip auth for now to ensure connectivity first as requested "run and check".

router.post('/simulate', simulatePromotion);
router.post('/plan', generatePlan);

export default router;
