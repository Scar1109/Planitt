const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { printBillReceipt, reprintBillReceipt, openDrawer } = require('../controllers/printing.controller');
const { printerActionSchema } = require('../validation/schemas');

router.use(requireAuth);

router.post('/receipt/:billId', validate(printerActionSchema), printBillReceipt);
router.post('/reprint/:billId', validate(printerActionSchema), reprintBillReceipt);
router.post('/drawer/open', requireRole('admin', 'owner', 'manager'), validate(printerActionSchema), openDrawer);

module.exports = router;
