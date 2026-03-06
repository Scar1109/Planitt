import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

// Force use of Google DNS to bypass local SRV lookup issues on certain networks
dns.setServers(['8.8.8.8', '8.8.4.4']);

import fs from 'fs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env');



dotenv.config({ path: envPath });

const port = process.env.PORT;
const mongoUri = process.env.MONGO_URI;

if (!port) {
    throw new Error('PORT is missing in .env');
}

if (!mongoUri) {
    throw new Error('MONGO_URI is missing in .env');
}

mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000, family: 4 })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection failed:', err);
        process.exit(1);
    });

app.listen(port, () => {
    console.log(`Planogram Platform Backend listening on port ${port}`);
});
