const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/', (req, res) => {
    const connected = mongoose.connection.readyState === 1;
    res.status(connected ? 200 : 503).json({
        status: connected ? 'ready' : 'not_ready',
        database: connected ? 'connected' : 'disconnected',
    });
});

module.exports = router;
