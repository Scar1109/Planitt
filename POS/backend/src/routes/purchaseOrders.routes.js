const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
    listPurchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    updatePurchaseOrder,
    approvePurchaseOrder,
    placePurchaseOrder,
    cancelPurchaseOrder,
    receivePurchaseOrder,
} = require('../controllers/purchaseOrders.controller');
const { purchaseOrderCreateSchema, purchaseOrderReceiveSchema } = require('../validation/schemas');

router.use(requireAuth);
router.use(requireRole('admin', 'owner', 'manager'));

router.get('/', listPurchaseOrders);
router.get('/:id', getPurchaseOrderById);
router.post('/', validate(purchaseOrderCreateSchema), createPurchaseOrder);
router.put('/:id', updatePurchaseOrder);
router.post('/:id/approve', approvePurchaseOrder);
router.post('/:id/place', placePurchaseOrder);
router.post('/:id/cancel', cancelPurchaseOrder);
router.post('/:id/receive', validate(purchaseOrderReceiveSchema), receivePurchaseOrder);

module.exports = router;
