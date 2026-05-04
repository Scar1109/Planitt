const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
    getSummary,
    getHourlySales,
    getPaymentSplit,
    getTopProducts,
    getAlerts,
    getRecentBills,
} = require('../controllers/dashboard.controller');

router.use(requireAuth);

router.get('/summary', getSummary);
router.get('/hourly-sales', getHourlySales);
router.get('/payment-split', getPaymentSplit);
router.get('/top-products', getTopProducts);
router.get('/alerts', getAlerts);
router.get('/recent-bills', getRecentBills);

module.exports = router;
