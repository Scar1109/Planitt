const InventoryBalance = require('../models/InventoryBalance');
const InventoryMovement = require('../models/InventoryMovement');
const HttpError = require('../utils/httpError');

async function applyInventoryDelta({
    storeId,
    sku,
    delta,
    movementType,
    userId,
    reason = '',
    billId = null,
    purchaseOrderId = null,
    session = null,
}) {
    const balance = await InventoryBalance.findOneAndUpdate(
        { storeId, sku },
        {
            $inc: { quantity: delta },
            $set: { lastMovementAt: new Date() },
            $setOnInsert: { storeId, sku, quantity: 0 },
        },
        { new: true, upsert: true, session },
    );

    if (balance.quantity < 0) {
        throw new HttpError(400, `Insufficient stock for SKU ${sku}`);
    }

    await InventoryMovement.create([{
        storeId,
        sku,
        movementType,
        quantityDelta: delta,
        billId,
        purchaseOrderId,
        reason,
        userId,
        occurredAt: new Date(),
    }], { session });

    return balance;
}

module.exports = {
    applyInventoryDelta,
};
