import express from 'express';
import { createStore, getMyStore, updateStore, getAllStores } from '../controllers/storeController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // All routes protected

// Get All Stores (Admin)
router.get('/', restrictTo('admin'), getAllStores);

// Get My Store
router.get('/my-store', getMyStore);

// Create Store (Admin only for now, or during complex signup)
router.post('/', restrictTo('admin'), createStore);

// Update Store (Owner/Admin)
router.put('/:id', restrictTo('admin', 'owner'), updateStore);

export default router;
