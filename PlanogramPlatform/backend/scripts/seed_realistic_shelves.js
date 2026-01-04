
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ShelfFixture from '../src/models/ShelfFixture.js';
import ShelfLevel from '../src/models/ShelfLevel.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const seedShelves = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");

        // HARD RESET: Clear all fixtures and levels
        await ShelfFixture.deleteMany({});
        await ShelfLevel.deleteMany({});
        console.log("Cleared existing shelves.");

        const storeId = "6956357610ec0ab348888893"; // Fallback Dev Store ID

        // --- Definitions ---
        const fixtures = [
            // --- COOLERS (Beverages) ---
            {
                aisleBaySide: "Cooler A (Soft Drinks)",
                fixtureType: "Cooler",
                totalWidthCm: 120, totalHeightCm: 200, totalDepthCm: 60,
                tags: ["cooler", "beverages", "cold_drinks", "soda"],
                levels: 5
            },
            {
                aisleBaySide: "Cooler B (Juices & Energy)",
                fixtureType: "Cooler",
                totalWidthCm: 120, totalHeightCm: 200, totalDepthCm: 60,
                tags: ["cooler", "beverages", "juice", "energy_drinks"],
                levels: 5
            },
            // --- SNACKS (Chips, Nuts) ---
            {
                aisleBaySide: "Aisle 1 - Bay 1 (Chips)",
                fixtureType: "Standard",
                totalWidthCm: 100, totalHeightCm: 180, totalDepthCm: 45,
                tags: ["snacks", "chips"],
                levels: 4
            },
            {
                aisleBaySide: "Aisle 1 - Bay 2 (Nuts & Seeds)",
                fixtureType: "Standard",
                totalWidthCm: 100, totalHeightCm: 180, totalDepthCm: 45,
                tags: ["snacks", "nuts", "seeds"],
                levels: 4
            },
            {
                aisleBaySide: "Aisle 1 - Bay 3 (Mixed Snacks)",
                fixtureType: "Standard",
                totalWidthCm: 100, totalHeightCm: 180, totalDepthCm: 45,
                tags: ["snacks", "mix"],
                levels: 4
            },
            // --- BISCUITS ---
            {
                aisleBaySide: "Aisle 2 - Bay 1 (Sweet Biscuits)",
                fixtureType: "Standard",
                totalWidthCm: 100, totalHeightCm: 180, totalDepthCm: 40,
                tags: ["biscuits", "sweet", "cookies"],
                levels: 5
            },
            {
                aisleBaySide: "Aisle 2 - Bay 2 (Savory Biscuits)",
                fixtureType: "Standard",
                totalWidthCm: 100, totalHeightCm: 180, totalDepthCm: 40,
                tags: ["biscuits", "savory", "crackers"],
                levels: 5
            },
            {
                aisleBaySide: "Aisle 2 - Bay 3 (Premium Cookies)",
                fixtureType: "Standard",
                totalWidthCm: 100, totalHeightCm: 180, totalDepthCm: 40,
                tags: ["biscuits", "premium"],
                levels: 5
            },
            // --- NOODLES & PASTA ---
            {
                aisleBaySide: "Aisle 3 - Bay 1 (Instant Noodles)",
                fixtureType: "Standard",
                totalWidthCm: 100, totalHeightCm: 180, totalDepthCm: 40,
                tags: ["noodles", "instant"],
                levels: 4
            },
            {
                aisleBaySide: "Aisle 3 - Bay 2 (Pasta)",
                fixtureType: "Standard",
                totalWidthCm: 100, totalHeightCm: 180, totalDepthCm: 40,
                tags: ["pasta", "italian"],
                levels: 4
            },
            {
                aisleBaySide: "Aisle 3 - Bay 3 (Asian Noodles)",
                fixtureType: "Standard",
                totalWidthCm: 100, totalHeightCm: 180, totalDepthCm: 40,
                tags: ["noodles", "asian", "ramen"],
                levels: 4
            },
            // --- GENERAL / MISC (Fallback) ---
            {
                aisleBaySide: "Aisle 4 - Bay 1 (General)",
                fixtureType: "Standard",
                totalWidthCm: 100, totalHeightCm: 180, totalDepthCm: 45,
                tags: ["general", "misc", "household"], // Open tags
                levels: 5
            }
        ];

        for (const f of fixtures) {
            const newFixture = new ShelfFixture({
                storeId,
                aisleBaySide: f.aisleBaySide,
                fixtureType: f.fixtureType,
                totalWidthCm: f.totalWidthCm,
                totalHeightCm: f.totalHeightCm,
                totalDepthCm: f.totalDepthCm,
                tags: f.tags,
                isActive: true
            });
            await newFixture.save();

            // Create Levels
            const levelsArr = [];
            const levelHeight = Math.floor(f.totalHeightCm / f.levels);

            for (let i = 0; i < f.levels; i++) {
                // Inherit tags from fixture for now, plus maybe "top", "bottom"
                const levelTags = [...f.tags];
                if (i === f.levels - 1) levelTags.push("top_shelf");
                if (i === 0) levelTags.push("bottom_shelf");
                if (i === 2 || i === 3) levelTags.push("eye_level");

                levelsArr.push({
                    storeId,
                    fixtureId: newFixture._id,
                    levelIndex: i,
                    heightFromFloorCm: i * levelHeight,
                    usableWidthCm: f.totalWidthCm - 2, // Slight margin
                    usableHeightCm: levelHeight - 2,
                    usableDepthCm: f.totalDepthCm - 2,
                    tags: levelTags
                });
            }
            await ShelfLevel.insertMany(levelsArr);
            console.log(`Created ${f.aisleBaySide} with ${f.levels} levels.`);
        }

        console.log("Seeding Complete!");
        process.exit();

    } catch (error) {
        console.error("Seeding Failed:", error);
        process.exit(1);
    }
};

seedShelves();
