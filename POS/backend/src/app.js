const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5174,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

// Middleware
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Routes
app.use('/health', require('./routes/health.routes'));
app.use('/ready', require('./routes/ready.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/sessions', require('./routes/sessions.routes'));
app.use('/api/bills', require('./routes/bills.routes'));
app.use('/api/printing', require('./routes/printing.routes'));
app.use('/api/sales', require('./routes/sales.routes'));
app.use('/api/products', require('./routes/products.routes'));
app.use('/api/inventory', require('./routes/inventory.routes'));
app.use('/api/purchase-orders', require('./routes/purchaseOrders.routes'));
app.use('/api/reports', require('./routes/reports.routes'));
app.use('/api/returns-voids', require('./routes/returnsVoids.routes'));

app.use(require('./middleware/notFound'));
app.use(require('./middleware/errorHandler'));

module.exports = app;
