import express from 'express';
import { getProducts, getProductBySku } from '../controllers/product.controller.js';

const router = express.Router();

// Get all products (with optional query params: category, limit, storeId)
router.get('/', getProducts);

// Get product by SKU (keep this for specific product lookup)
router.get('/:sku', getProductBySku);

export default router;
