const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
    createDraftBill,
    addBillItem,
    updateBillItem,
    suspendBill,
    resumeBill,
    listSuspendedBills,
    getBillById,
    checkoutBill,
    voidBill,
    returnBillItems,
} = require('../controllers/bills.controller');
const {
    createBillSchema,
    addItemSchema,
    updateLineSchema,
    checkoutSchema,
    voidBillSchema,
    returnSchema,
} = require('../validation/schemas');

router.use(requireAuth);

router.get('/suspended', listSuspendedBills);
router.post('/', validate(createBillSchema), createDraftBill);
router.get('/:id', getBillById);
router.post('/:id/items', validate(addItemSchema), addBillItem);
router.patch('/:id/items/:lineId', validate(updateLineSchema), updateBillItem);
router.post('/:id/suspend', suspendBill);
router.post('/:id/resume', resumeBill);
router.post('/:id/checkout', validate(checkoutSchema), checkoutBill);
router.post('/:id/void', requireRole('admin', 'owner', 'manager'), validate(voidBillSchema), voidBill);
router.post('/:id/returns', validate(returnSchema), returnBillItems);

module.exports = router;
