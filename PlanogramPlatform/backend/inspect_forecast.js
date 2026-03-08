import mongoose from 'mongoose';
import ForecastOutcome from './src/models/ForecastOutcome.js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

async function inspect() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const stats = await ForecastOutcome.aggregate([
            {
                $group: {
                    _id: null,
                    avgError: { $avg: "$error_pct" },
                    avgActual: { $avg: "$actual_demand" },
                    avgPred: { $avg: "$predicted_demand" },
                    count: { $sum: 1 }
                }
            }
        ]);
        const data = JSON.stringify(stats, null, 2);
        fs.writeFileSync('inspect_results.json', data);
    } catch (e) {
        fs.writeFileSync('inspect_results.json', e.stack);
    } finally {
        process.exit();
    }
}
inspect();
