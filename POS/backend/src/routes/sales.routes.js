const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const Sale = require('../models/Sale');
const asyncHandler = require('../utils/asyncHandler');

router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
    const data = await Sale.find({ storeId: req.storeId })
        .sort({ date: -1 })
        .limit(Number(req.query.limit || 200));
    res.json({ data });
}));

router.get('/export', requireRole('admin', 'owner', 'manager'), asyncHandler(async (req, res) => {
    const data = await Sale.find({ storeId: req.storeId })
        .sort({ date: -1 })
        .limit(Number(req.query.limit || 2000))
        .lean();
    res.json({ data });
}));

module.exports = router;
