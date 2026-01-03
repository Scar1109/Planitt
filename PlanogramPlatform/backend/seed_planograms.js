import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './src/models/User.js';
import ShelfFixture from './src/models/ShelfFixture.js';
import ShelfLevel from './src/models/ShelfLevel.js';
import Planogram from './src/models/Planogram.js';
import PlanogramPlacement from './src/models/PlanogramPlacement.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Get or Create Owner
        let owner = await User.findOne({ email: 'admin@planitt.com' });
        if (!owner) {
            console.log('Admin user not found, please create one first via signup.');
            process.exit(1);
        }

        // 2. Create Fixture (Gondola)
        await ShelfFixture.deleteMany({});
        await ShelfLevel.deleteMany({});
        
        const fixture = await ShelfFixture.create({
            ownerUserId: owner._id,
            name: "Main Gondola G1",
            aisleBaySide: "Aisle 1 - Bay 1",
            totalWidthCm: 100,
            totalHeightCm: 200,
            totalDepthCm: 50,
            isActive: true
        });

        // 3. Create Levels (1 = Bottom, 5 = Eye Level)
        const levels = [];
        for (let i = 1; i <= 5; i++) {
            levels.push(await ShelfLevel.create({
                ownerUserId: owner._id,
                fixtureId: fixture._id,
                levelIndex: i,
                heightFromFloorCm: i * 40,
                usableWidthCm: 100,
                usableHeightCm: 35,
                usableDepthCm: 45
            }));
        }

        // 4. Create Planograms (Current vs Optimized)
        await Planogram.deleteMany({});
        await PlanogramPlacement.deleteMany({});

        // --- Current (Floor Scan) ---
        const currentPlog = await Planogram.create({
            ownerUserId: owner._id,
            name: "Current Floor Scan (Jan 2026)",
            status: "deployed",
            fixtureIds: [fixture._id],
            validFrom: new Date()
        });

        // --- Optimized (Target) ---
        const optimizedPlog = await Planogram.create({
            ownerUserId: owner._id,
            name: "Optimized Model v2 (High Yield)",
            status: "approved",
            fixtureIds: [fixture._id],
            validFrom: new Date()
        });

        // 5. Create Placements
        // Scenario: High margin item (LOC-COCO-500ML) is moved from Level 1 (Bottom) to Level 4 (Eye)
        
        // --- Current Placements ---
        await PlanogramPlacement.create({
            ownerUserId: owner._id,
            planogramId: currentPlog._id,
            fixtureId: fixture._id,
            levelId: levels[0]._id, // Level 1 (Bad)
            sku: "LOC-COCO-500ML",
            facings: 1,
            positionXcm: 10,
            widthUsedCm: 10
        });
        await PlanogramPlacement.create({
            ownerUserId: owner._id,
            planogramId: currentPlog._id,
            fixtureId: fixture._id,
            levelId: levels[0]._id,
            sku: "LOC-SOAP-BAR",
            facings: 2,
            positionXcm: 30,
            widthUsedCm: 10
        });

        // --- Optimized Placements ---
        await PlanogramPlacement.create({
            ownerUserId: owner._id,
            planogramId: optimizedPlog._id,
            fixtureId: fixture._id,
            levelId: levels[3]._id, // Level 4 (Good!)
            sku: "LOC-COCO-500ML",
            facings: 2, // More facings!
            positionXcm: 10,
            widthUsedCm: 20
        });
        await PlanogramPlacement.create({
            ownerUserId: owner._id,
            planogramId: optimizedPlog._id,
            fixtureId: fixture._id,
            levelId: levels[0]._id,
            sku: "LOC-SOAP-BAR",
            facings: 2,
            positionXcm: 30,
            widthUsedCm: 10
        });

        console.log("✅ Database seeded with Test Planograms!");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedData();
