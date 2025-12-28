const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/health', require('./routes/health.routes'));
app.use('/api/sales', require('./routes/sales.routes'));
app.use('/api/products', require('./routes/products.routes'));
app.use('/api/inventory', require('./routes/inventory.routes'));

module.exports = app;
