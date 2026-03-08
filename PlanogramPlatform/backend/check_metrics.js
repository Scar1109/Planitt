import mongoose from 'mongoose';
import ComplianceRun from './src/models/ComplianceRun.js';
import OptimizationRun from './src/models/OptimizationRun.js';
import Promotion from './src/models/Promotion.js';
import ForecastOutcome from './src/models/ForecastOutcome.js';
import SavedSimulation from './src/models/SavedSimulation.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const opt = await OptimizationRun.findOne().sort({ finishedAt: -1 });
        const comp = await ComplianceRun.findOne().sort({ run_date: -1 });
        const promoCount = await Promotion.countDocuments({ isActive: true });
        const forecast = await ForecastOutcome.aggregate([{ $group: { _id: null, avgAccuracy: { $avg: { $subtract: [100, "$error_pct"] } } } }]);
        const sims = await SavedSimulation.countDocuments();
        const avgLift = await SavedSimulation.aggregate([{ $group: { _id: null, avg: { $avg: "$uplift" } } }]);

        console.log('--- METRICS CHECK ---');
        console.log('Opt Score:', opt?.bestScore);
        console.log('Opt Last Run:', opt?.finishedAt);
        console.log('Comp Score:', comp?.compliance_score);
        console.log('Comp Last Run:', comp?.run_date);
        console.log('Comp Details Keys:', Object.keys(comp?.details || {}));
        console.log('Active Promos:', promoCount);
        console.log('Forecast Accuracy:', forecast[0]?.avgAccuracy);
        console.log('Total Sims:', sims);
        console.log('Avg Lift:', avgLift[0]?.avg);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
