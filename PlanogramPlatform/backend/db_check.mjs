import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/planogram-platform';
await mongoose.connect(uri);
const db = mongoose.connection.db;

const results = {};

const sample = await db.collection('inventorysnapshots').findOne({});
results.sampleKeys = Object.keys(sample);
results.sampleValues = {
    daysToExpiry: sample.daysToExpiry,
    discardedQty: sample.discardedQty,
    closingStock: sample.closingStock,
    expiryRiskScore: sample.expiryRiskScore,
    nearExpiryFlag: sample.nearExpiryFlag,
    sku: sample.sku,
    date: sample.date,
    soldQty: sample.soldQty,
    openingStock: sample.openingStock,
};

results.totalSnapshots = await db.collection('inventorysnapshots').countDocuments({});
results.withDaysToExpiry = await db.collection('inventorysnapshots').countDocuments({ daysToExpiry: { $exists: true } });
results.daysToExpiryGt0 = await db.collection('inventorysnapshots').countDocuments({ daysToExpiry: { $gt: 0 } });
results.daysToExpiry0to7 = await db.collection('inventorysnapshots').countDocuments({ daysToExpiry: { $gte: 0, $lte: 7 } });
results.nearExpiryTrue = await db.collection('inventorysnapshots').countDocuments({ nearExpiryFlag: true });
results.discardedGt0 = await db.collection('inventorysnapshots').countDocuments({ discardedQty: { $gt: 0 } });
results.closingStockGt0 = await db.collection('inventorysnapshots').countDocuments({ closingStock: { $gt: 0 } });

const marchStart = new Date(2026, 2, 1);
results.marchDiscarded = await db.collection('inventorysnapshots').countDocuments({
    date: { $gte: marchStart }, discardedQty: { $gt: 0 }
});

results.expiryValueDist = await db.collection('inventorysnapshots').aggregate([
    { $match: { daysToExpiry: { $exists: true } } },
    { $group: { _id: '$daysToExpiry', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $limit: 20 }
]).toArray();

const latest = await db.collection('inventorysnapshots').find({}).sort({ date: -1 }).limit(1).toArray();
results.latestDate = latest[0]?.date;

results.expiryRiskGt05 = await db.collection('inventorysnapshots').countDocuments({ expiryRiskScore: { $gt: 0.5 } });

// Products check
results.totalProducts = await db.collection('products').countDocuments({});
const prodSample = await db.collection('products').findOne({});
results.productSampleKeys = prodSample ? Object.keys(prodSample) : [];
results.productSampleValues = prodSample ? { sku: prodSample.sku, productName: prodSample.productName, category: prodSample.category, baseUnitPriceLKR: prodSample.baseUnitPriceLKR } : {};

fs.writeFileSync('C:/tmp/db_results.json', JSON.stringify(results, null, 2), 'utf8');
process.exit(0);
