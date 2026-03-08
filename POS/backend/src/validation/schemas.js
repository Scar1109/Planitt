const { z } = require('zod');

const objectId = z.string().min(1);

const loginSchema = {
    body: z.object({
        email: z.string().email(),
        password: z.string().min(4),
    }),
};

const openSessionSchema = {
    body: z.object({
        terminalId: z.string().min(1),
        openingFloatLKR: z.number().min(0).default(0),
    }),
};

const closeSessionSchema = {
    body: z.object({
        closingCashLKR: z.number().min(0),
        note: z.string().max(300).optional(),
    }),
};

const createBillSchema = {
    body: z.object({
        sessionId: objectId,
    }),
};

const addItemSchema = {
    body: z.object({
        sku: z.string().min(1),
        quantity: z.number().int().min(1).default(1),
        unitPriceLKR: z.number().min(0).optional(),
        lineDiscountLKR: z.number().min(0).optional(),
    }),
};

const updateLineSchema = {
    body: z.object({
        quantity: z.number().int().min(1).optional(),
        lineDiscountLKR: z.number().min(0).optional(),
    }),
};

const checkoutSchema = {
    body: z.object({
        paymentMethod: z.enum(['cash', 'card', 'digital']),
        paidAmountLKR: z.number().min(0),
        paymentReference: z.string().max(80).optional(),
        billDiscountLKR: z.number().min(0).optional(),
        terminalId: z.string().min(1),
    }),
};

const voidBillSchema = {
    body: z.object({
        reason: z.string().min(3),
    }),
};

const returnSchema = {
    body: z.object({
        items: z.array(z.object({
            lineId: z.string().min(1),
            quantity: z.number().int().min(1),
            reason: z.string().min(3),
        })).min(1),
    }),
};

const productCreateSchema = {
    body: z.object({
        sku: z.string().min(1),
        barcode: z.string().optional(),
        productName: z.string().min(2),
        category: z.string().optional(),
        brand: z.string().optional(),
        unitSize: z.string().optional(),
        baseUnitPriceLKR: z.number().min(0),
        unitCostLKR: z.number().min(0).optional(),
        taxRate: z.number().min(0).max(100).optional(),
        supplier: z.string().optional(),
        reorderLevel: z.number().min(0).optional(),
        reorderQty: z.number().min(0).optional(),
        isActive: z.boolean().optional(),
    }),
};

const inventoryAdjustmentSchema = {
    body: z.object({
        sku: z.string().min(1),
        quantityDelta: z.number(),
        reason: z.string().min(3),
    }),
};

const inventoryReceiveSchema = {
    body: z.object({
        sku: z.string().min(1),
        receivedQty: z.number().int().positive(),
        reason: z.string().optional(),
    }),
};

const runSnapshotSchema = {
    body: z.object({
        date: z.string().optional(),
    }),
};

const purchaseOrderCreateSchema = {
    body: z.object({
        supplier: z.string().min(2),
        notes: z.string().optional(),
        lines: z.array(z.object({
            sku: z.string().min(1),
            orderedQty: z.number().int().min(1),
            unitCostLKR: z.number().min(0).optional(),
        })).min(1),
    }),
};

const purchaseOrderReceiveSchema = {
    body: z.object({
        lines: z.array(z.object({
            sku: z.string().min(1),
            receivedQty: z.number().int().min(1),
        })).min(1),
        note: z.string().optional(),
    }),
};

const printerActionSchema = {
    body: z.object({
        terminalId: z.string().min(1),
    }),
};

module.exports = {
    loginSchema,
    openSessionSchema,
    closeSessionSchema,
    createBillSchema,
    addItemSchema,
    updateLineSchema,
    checkoutSchema,
    voidBillSchema,
    returnSchema,
    productCreateSchema,
    inventoryAdjustmentSchema,
    inventoryReceiveSchema,
    runSnapshotSchema,
    purchaseOrderCreateSchema,
    purchaseOrderReceiveSchema,
    printerActionSchema,
};
