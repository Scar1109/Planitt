import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const r = await mongoose.connection.db.collection('forecast_outcomes').aggregate([
            { $group: { _id: null, avgErr: { $avg: { $abs: '$error_pct' } } } }
        ]).toArray();
        const avgErr = r[0]?.avgErr || 0;
        console.log('Current Avg Abs Error:', avgErr);
        console.log('Calculated Accuracy:', Math.max(0, 100 - avgErr).toFixed(2), '%');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
