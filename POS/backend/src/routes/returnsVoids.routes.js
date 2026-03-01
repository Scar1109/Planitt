const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listReturnsAndVoids } = require('../controllers/returnsVoids.controller');

router.use(requireAuth);
router.get('/', listReturnsAndVoids);

module.exports = router;
