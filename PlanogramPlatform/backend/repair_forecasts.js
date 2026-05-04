import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function repair() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;
        const outcomes = await db.collection('forecast_outcomes').find().sort({ forecast_date: -1 }).limit(500).toArray();
        console.log(`Repairing ${outcomes.length} outcomes...`);

        let count = 0;
        for (const out of outcomes) {
            const fdate = new Date(out.forecast_date);
            const dayStart = new Date(Date.UTC(fdate.getUTCFullYear(), fdate.getUTCMonth(), fdate.getUTCDate()));
            const dayEnd = new Date(dayStart);
            dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

            const sales = await db.collection('sales').find({
                sku: out.sku,
                date: { $gte: dayStart, $lt: dayEnd }
            }).toArray();

            let actualDemand = 0;
            sales.forEach(s => {
                actualDemand += s.UnitsSold || s.unitsSold || 0;
            });

            const errorPct = ((out.predicted_demand - actualDemand) / Math.max(actualDemand, 1)) * 100;

            await db.collection('forecast_outcomes').updateOne(
                { _id: out._id },
                {
                    $set: {
                        actual_demand: actualDemand,
                        error_pct: parseFloat(errorPct.toFixed(2))
                    }
                }
            );
            count++;
            if (count % 10 === 0) console.log(`Processed ${count}... last actual: ${actualDemand}`);
        }
        console.log('Repair complete.');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
repair();
