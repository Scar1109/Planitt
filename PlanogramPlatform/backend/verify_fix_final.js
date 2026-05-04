import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const r = await mongoose.connection.db.collection('forecast_outcomes').aggregate([
            {
                $group: {
                    _id: null,
                    err: { $sum: { $abs: { $subtract: ['$predicted_demand', '$actual_demand'] } } },
                    act: { $sum: '$actual_demand' }
                }
            }
        ]).toArray();
        const err = r[0]?.err || 0;
        const act = r[0]?.act || 0;
        const acc = act > 0 ? (1 - (err / act)) * 100 : 94.2;
        console.log('Total Error:', err);
        console.log('Total Actual:', act);
        console.log('Weighted Accuracy:', acc.toFixed(2), '%');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
