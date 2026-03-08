const net = require('net');
const PrinterConfig = require('../../models/PrinterConfig');
const HttpError = require('../../utils/httpError');

function buildReceiptBuffer({ storeName, billNo, cashierName, paymentMethod, items, totals, printedAt }) {
    const lines = [];
    lines.push(storeName);
    lines.push(`Bill: ${billNo}`);
    lines.push(`Cashier: ${cashierName}`);
    lines.push(`Time: ${printedAt.toISOString()}`);
    lines.push('--------------------------------');
    for (const item of items) {
        lines.push(`${item.productName}`);
        lines.push(`${item.quantity} x ${item.unitPriceLKR.toFixed(2)} = ${item.lineTotalLKR.toFixed(2)}`);
    }
    lines.push('--------------------------------');
    lines.push(`Subtotal: ${totals.subtotalLKR.toFixed(2)}`);
    lines.push(`Tax: ${totals.taxLKR.toFixed(2)}`);
    lines.push(`Discount: ${totals.billDiscountLKR.toFixed(2)}`);
    lines.push(`Total: ${totals.grandTotalLKR.toFixed(2)}`);
    lines.push(`Payment: ${paymentMethod.toUpperCase()}`);
    lines.push('Thank you!');
    lines.push('\n\n');

    const content = lines.join('\n');
    const init = Buffer.from([0x1b, 0x40]);
    const text = Buffer.from(content, 'ascii');
    const cut = Buffer.from([0x1d, 0x56, 0x00]);
    return Buffer.concat([init, text, cut]);
}

function networkPrint(buffer, host, port, timeoutMs) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(timeoutMs);

        socket.on('connect', () => socket.write(buffer, () => socket.end()));
        socket.on('timeout', () => reject(new Error('Printer timeout')));
        socket.on('error', (error) => reject(error));
        socket.on('close', () => resolve());

        socket.connect(port, host);
    });
}

async function getPrinterConfig(storeId, terminalId) {
    const config = await PrinterConfig.findOne({ storeId, terminalId, isActive: true }).lean();
    if (config) {
        return config;
    }
    if (!process.env.PRINTER_HOST) {
        throw new HttpError(400, 'No active printer config for terminal');
    }
    return {
        connectionType: 'network',
        network: {
            host: process.env.PRINTER_HOST,
            port: Number(process.env.PRINTER_PORT || 9100),
            timeoutMs: Number(process.env.PRINTER_TIMEOUT_MS || 2000),
        },
        drawerPulseOnCash: true,
    };
}

async function printReceipt({ storeId, terminalId, payload }) {
    const config = await getPrinterConfig(storeId, terminalId);
    const buffer = buildReceiptBuffer(payload);
    if (config.connectionType !== 'network') {
        throw new HttpError(400, 'USB printer mode is not enabled in this build');
    }
    await networkPrint(
        buffer,
        config.network.host,
        Number(config.network.port || 9100),
        Number(config.network.timeoutMs || 2000),
    );
    return { ok: true, drawerPulseOnCash: Boolean(config.drawerPulseOnCash) };
}

async function openCashDrawer({ storeId, terminalId }) {
    const config = await getPrinterConfig(storeId, terminalId);
    if (config.connectionType !== 'network') {
        throw new HttpError(400, 'USB drawer mode is not enabled in this build');
    }
    const drawerKick = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
    await networkPrint(
        drawerKick,
        config.network.host,
        Number(config.network.port || 9100),
        Number(config.network.timeoutMs || 2000),
    );
    return { ok: true };
}

module.exports = {
    printReceipt,
    openCashDrawer,
};
