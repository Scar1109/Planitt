import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ShelfFixture from '../src/models/ShelfFixture.js';
import ShelfLevel from '../src/models/ShelfLevel.js';
import Product from '../src/models/Product.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const seedShelves = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");

        // 1. Clear existing shelves
        await ShelfFixture.deleteMany({});
        await ShelfLevel.deleteMany({});
        console.log("Cleared existing fixtures and levels.");

        // 2. Analyze Products
        const categories = await Product.find().distinct('category');
        console.log("Found Categories:", categories);

        const storeId = "6956357610ec0ab348888893"; // Dev Store ID

        // 3. Define 13 Realistic Fixture Templates
        // Strategy: Map categories to these slots. If a category is missing, the shelf remains generic.
        // If multiple categories fit, they combine.

        // Helper to find category fuzzy match
        const findCat = (keyword) => categories.find(c => c && c.toLowerCase().includes(keyword.toLowerCase()));

        const blueprints = [
            // --- ENTRANCE ROI ---
            {
                name: "Aisle 1 - Bay 1", type: "Cooler", w: 120, h: 200, d: 60, levels: 5,
                tags: [findCat('Beverage') || "Beverages", "cold", "soda"]
            },
            {
                name: "Aisle 1 - Bay 2", type: "Cooler", w: 120, h: 200, d: 60, levels: 5,
                tags: [findCat('Beverage') || "Beverages", "juice", "energy"]
            },

            // --- AISLE 2 ---
            {
                name: "Aisle 2 - Bay 1", type: "Standard", w: 100, h: 180, d: 45, levels: 5,
                tags: [findCat('Snack') || "Snacks & Confectionery", "chips"]
            },
            {
                name: "Aisle 2 - Bay 2", type: "Standard", w: 100, h: 180, d: 45, levels: 5,
                tags: [findCat('Snack') || "Snacks & Confectionery", "chocolate", "sweet"]
            },
            {
                name: "Aisle 2 - Bay 3", type: "Standard", w: 100, h: 180, d: 45, levels: 5,
                tags: [findCat('Bakery') || "Packaged Bakery", "biscuits"]
            },

            // --- AISLE 3 ---
            {
                name: "Aisle 3 - Bay 1", type: "Standard", w: 120, h: 180, d: 60, levels: 4,
                tags: [findCat('Rice') || "Rice & Grains", "bulk"]
            },
            {
                name: "Aisle 3 - Bay 2", type: "Standard", w: 120, h: 180, d: 50, levels: 5,
                tags: [findCat('Dry') || "Dry Rations", "dhal", "pulses"]
            },
            {
                name: "Aisle 3 - Bay 3", type: "Standard", w: 100, h: 180, d: 40, levels: 6,
                tags: [findCat('Dry') || "Dry Rations", "spices", "condiments"]
            },

            // --- AISLE 4 ---
            {
                name: "Aisle 4 - Bay 1", type: "Standard", w: 100, h: 180, d: 45, levels: 5,
                tags: [findCat('Instant') || "Instant Foods", "noodles"]
            },
            {
                name: "Aisle 4 - Bay 2", type: "Standard", w: 100, h: 180, d: 40, levels: 5,
                tags: [findCat('Tea') || "Tea & Coffee", "morning"]
            },

            // --- AISLE 5 ---
            {
                name: "Aisle 5 - Bay 1", type: "Standard", w: 120, h: 180, d: 50, levels: 4,
                tags: [findCat('Household') || "Household & Cleaning", "detergent"]
            },
            {
                name: "Aisle 5 - Bay 2", type: "Standard", w: 100, h: 180, d: 40, levels: 5,
                tags: [findCat('Personal') || "Personal Care", findCat('Baby') || "Baby Products"]
            },

            // --- END ---
            {
                name: "Aisle 6 - Bay 1", type: "Cooler", w: 120, h: 100, d: 80, levels: 1, // Chest freezer style or upright
                tags: [findCat('Frozen') || "Frozen (Non-Meat)", "ice cream"]
            }
        ];

        // 4. Create Fixtures in DB
        for (const bp of blueprints) {
            // Clean tags (remove nulls/undefined)
            const validTags = bp.tags.filter(t => t);

            const newFixture = new ShelfFixture({
                storeId,
                aisleBaySide: bp.name,
                fixtureType: bp.type,
                totalWidthCm: bp.w,
                totalHeightCm: bp.h,
                totalDepthCm: bp.d,
                tags: validTags,
                isActive: true
            });
            await newFixture.save();

            // Create Levels
            const levelHeight = Math.floor(bp.h / bp.levels);
            const levelsArr = [];

            for (let i = 0; i < bp.levels; i++) {
                const levelTags = [...validTags];
                // Spatial tags
                if (i === bp.levels - 1) levelTags.push("top");
                if (i === 0) levelTags.push("bottom");

                // Eye level assumption (approx 120-160cm range)
                const hStart = i * levelHeight;
                const hEnd = (i + 1) * levelHeight;
                if (hEnd > 110 && hStart < 160) levelTags.push("eye_level");

                levelsArr.push({
                    storeId,
                    fixtureId: newFixture._id,
                    levelIndex: i,
                    heightFromFloorCm: hStart,
                    usableWidthCm: bp.w - 4, // Walls
                    usableHeightCm: levelHeight - 2, // Shelf thickness
                    usableDepthCm: bp.d - 2,
                    tags: levelTags
                });
            }
            await ShelfLevel.insertMany(levelsArr);
            console.log(`Created ${bp.name}`);
        }

        console.log("Seeding Complete: 13 Realistic Fixtures.");
        process.exit(0);

    } catch (error) {
        console.error("Seeding Failed:", error);
        process.exit(1);
    }
};

seedShelves();
