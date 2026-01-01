import app from './app.js';
// Restart trigger
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

process.env.JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI || "mongodb+srv://admin_db_user:3pPsCiANzsuiI6B9@cluster0.8ovat0j.mongodb.net/";

console.log('Loading environment variables...');
console.log('MONGO_URI Length:', mongoUri ? mongoUri.length : 'undefined');

mongoose.connect(mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

app.listen(port, () => {
    console.log(`Planogram Platform Backend listening on port ${port}`);
});
