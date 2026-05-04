const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
    listCurrentInventory,
    adjustInventory,
    receiveInventory,
    runSnapshot,
    listSnapshots,
} = require('../controllers/inventory.controller');
const {
    inventoryAdjustmentSchema,
    inventoryReceiveSchema,
    runSnapshotSchema,
} = require('../validation/schemas');

router.use(requireAuth);

router.get('/current', listCurrentInventory);
router.post('/adjustments', requireRole('admin', 'owner', 'manager'), validate(inventoryAdjustmentSchema), adjustInventory);
router.post('/receipts', requireRole('admin', 'owner', 'manager'), validate(inventoryReceiveSchema), receiveInventory);
router.post('/snapshots/run', requireRole('admin', 'owner', 'manager'), validate(runSnapshotSchema), runSnapshot);
router.get('/snapshots', listSnapshots);

module.exports = router;
