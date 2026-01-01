import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';
import Store from './src/models/Store.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });
const mongoUri = process.env.MONGO_URI || "mongodb+srv://admin_db_user:3pPsCiANzsuiI6B9@cluster0.8ovat0j.mongodb.net/";

const seedAdmin = async () => {
    try {
        await mongoose.connect(mongoUri);
        console.log('MongoDB Connected');

        // 1. Create Default Store
        const storeData = {
            name: 'Planitt HQ',
            address: '123 Tech Blvd',
            location: {
                city: 'Headquarters',
                latitude: 0,
                longitude: 0
            }
        };

        let adminStore = await Store.findOne({ name: storeData.name });
        if (!adminStore) {
            adminStore = await Store.create(storeData);
            console.log('Default Store Created:', adminStore.name);
        } else {
            console.log('Default Store exists:', adminStore.name);
        }

        // 2. Create Admin User
        const adminEmail = 'admin@planitt.com';
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            // Update existing to link to store if missing or update logic to new schema
            if (!existingAdmin.store) {
                existingAdmin.store = adminStore._id;
                await existingAdmin.save();
                console.log('Updated existing Admin with Store ID');
            }
            console.log('Admin user already exists');
            process.exit();
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('admin123', salt);

        await User.create({
            fullName: 'System Admin',
            email: adminEmail,
            passwordHash,
            role: 'admin',
            isActive: true,
            store: adminStore._id
        });

        console.log('Admin user created successfully');
        console.log('Email: admin@planitt.com');
        console.log('Password: admin123');
        process.exit();
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
