import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();

// Middleware
const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5174'], // Allow both default and fallback Vite ports
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

import planogramRoutes from './routes/planogramRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import productRoutes from './routes/productRoutes.js';

app.use('/api/stores', storeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', planogramRoutes);
app.use('/api/products', productRoutes);

app.get('/health', (req, res) => {
    res.json({ status: "ok", service: "planogram-platform-backend" });
});

export default app;
