const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
    listProducts,
    createProduct,
    updateProduct,
    toggleProductStatus,
} = require('../controllers/products.controller');
const { productCreateSchema } = require('../validation/schemas');

router.use(requireAuth);

router.get('/', listProducts);
router.post('/', requireRole('admin', 'owner', 'manager'), validate(productCreateSchema), createProduct);
router.put('/:id', requireRole('admin', 'owner', 'manager'), validate(productCreateSchema), updateProduct);
router.patch('/:id/status', requireRole('admin', 'owner'), toggleProductStatus);

module.exports = router;
