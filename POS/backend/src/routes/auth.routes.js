const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { login, me, logout } = require('../controllers/auth.controller');
const { loginSchema } = require('../validation/schemas');

router.post('/login', validate(loginSchema), login);
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);

module.exports = router;
