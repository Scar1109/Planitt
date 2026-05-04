const PosBillCounter = require('../models/PosBillCounter');

function recalculateBillTotals(bill) {
    let subtotal = 0;
    let tax = 0;

    bill.items = bill.items.map((line) => {
        const qty = Number(line.quantity || 0);
        const unitPrice = Number(line.unitPriceLKR || 0);
        const discount = Number(line.lineDiscountLKR || 0);
        const base = qty * unitPrice;
        const afterDiscount = Math.max(base - discount, 0);
        const lineTax = afterDiscount * (Number(line.taxRate || 0) / 100);
        const lineTotal = afterDiscount + lineTax;

        subtotal += afterDiscount;
        tax += lineTax;

        return {
            ...line.toObject?.() || line,
            lineSubtotalLKR: Number(afterDiscount.toFixed(2)),
            lineTaxLKR: Number(lineTax.toFixed(2)),
            lineTotalLKR: Number(lineTotal.toFixed(2)),
            returnableQty: qty,
        };
    });

    const billDiscountLKR = Number(bill.billDiscountLKR || 0);
    const grandTotal = Math.max(subtotal + tax - billDiscountLKR, 0);

    bill.subtotalLKR = Number(subtotal.toFixed(2));
    bill.taxLKR = Number(tax.toFixed(2));
    bill.grandTotalLKR = Number(grandTotal.toFixed(2));
}

async function generateBillNo({ storeId, businessDate, session }) {
    const counter = await PosBillCounter.findOneAndUpdate(
        { storeId, businessDate },
        { $inc: { seq: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true, session },
    );

    const cleanDate = businessDate.replace(/-/g, '');
    return `B${cleanDate}-${String(counter.seq).padStart(5, '0')}`;
}

module.exports = {
    recalculateBillTotals,
    generateBillNo,
};
