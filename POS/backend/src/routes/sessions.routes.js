const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { openSession, currentSession, closeSession } = require('../controllers/sessions.controller');
const { openSessionSchema, closeSessionSchema } = require('../validation/schemas');

router.use(requireAuth);

router.get('/current', currentSession);
router.post('/open', validate(openSessionSchema), openSession);
router.post('/:id/close', validate(closeSessionSchema), closeSession);

module.exports = router;
