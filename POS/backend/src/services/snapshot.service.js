const InventoryBalance = require('../models/InventoryBalance');
const InventoryMovement = require('../models/InventoryMovement');
const InventorySnapshot = require('../models/InventorySnapshot');

async function runInventorySnapshot({ storeId, date }) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const balances = await InventoryBalance.find({ storeId }).lean();
    const movements = await InventoryMovement.aggregate([
        {
            $match: {
                storeId,
                occurredAt: { $gte: start, $lt: end },
            },
        },
        {
            $group: {
                _id: '$sku',
                soldQty: {
                    $sum: {
                        $cond: [{ $eq: ['$movementType', 'SALE'] }, { $abs: '$quantityDelta' }, 0],
                    },
                },
                receivedQty: {
                    $sum: {
                        $cond: [{ $eq: ['$movementType', 'RECEIVE'] }, '$quantityDelta', 0],
                    },
                },
                discardedQty: {
                    $sum: {
                        $cond: [{ $eq: ['$movementType', 'ADJUSTMENT'] }, { $abs: '$quantityDelta' }, 0],
                    },
                },
            },
        },
    ]);

    const movementMap = new Map(movements.map((entry) => [entry._id, entry]));
    const writes = [];

    for (const balance of balances) {
        const aggregate = movementMap.get(balance.sku) || {};
        const soldQty = Number(aggregate.soldQty || 0);
        const receivedQty = Number(aggregate.receivedQty || 0);
        const discardedQty = Number(aggregate.discardedQty || 0);
        const closingStock = Number(balance.quantity || 0);
        const openingStock = closingStock - receivedQty + soldQty + discardedQty;

        writes.push({
            updateOne: {
                filter: { storeId, sku: balance.sku, date: start },
                update: {
                    $set: {
                        date: start,
                        storeId,
                        sku: balance.sku,
                        openingStock,
                        receivedQty,
                        soldQty,
                        discardedQty,
                        closingStock,
                    },
                },
                upsert: true,
            },
        });
    }

    if (writes.length > 0) {
        await InventorySnapshot.bulkWrite(writes, { ordered: false });
    }

    return {
        date: start,
        snapshotCount: writes.length,
    };
}

module.exports = {
    runInventorySnapshot,
};
