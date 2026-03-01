const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { searchCustomers, createCustomer } = require('../controllers/customers.controller');

router.use(requireAuth);

router.get('/search', searchCustomers);
router.post('/', createCustomer);

module.exports = router;
