import express from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct, getProductMetadata } from '../controllers/productController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // protect all routes

router.get('/', getProducts);
router.get('/metadata', getProductMetadata);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;
