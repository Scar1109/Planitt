const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const {
    dailySalesReport,
    shiftReport,
    inventoryMovementsReport,
    poStatusReport,
    auditReport,
} = require('../controllers/reports.controller');

router.use(requireAuth);
router.use(requireRole('admin', 'owner', 'manager'));

router.get('/daily-sales', dailySalesReport);
router.get('/shift/:id', shiftReport);
router.get('/inventory-movements', inventoryMovementsReport);
router.get('/po-status', poStatusReport);
router.get('/audit', auditReport);

module.exports = router;
