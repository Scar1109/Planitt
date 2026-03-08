const PosAuditLog = require('../models/PosAuditLog');

async function writeAuditLog({
    storeId,
    userId,
    action,
    entityType,
    entityId,
    reason = '',
    payload = null,
    session = null,
}) {
    await PosAuditLog.create([{
        storeId,
        userId,
        action,
        entityType,
        entityId: String(entityId),
        reason,
        payload,
    }], { session });
}

module.exports = {
    writeAuditLog,
};
