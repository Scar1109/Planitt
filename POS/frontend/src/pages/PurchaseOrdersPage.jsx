import { useEffect, useState } from 'react';
import api from '../services/api';
import Panel from '../components/ui/Panel';

const emptyLine = { sku: '', orderedQty: 1, unitCostLKR: 0 };

export default function PurchaseOrdersPage() {
    const [rows, setRows] = useState([]);
    const [supplier, setSupplier] = useState('');
    const [lines, setLines] = useState([emptyLine]);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    async function load() {
        try {
            const { data } = await api.get('/purchase-orders?limit=200');
            setRows(data.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load purchase orders');
        }
    }

    useEffect(() => {
        load();
    }, []);

    function updateLine(index, field, value) {
        setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
    }

    function addLine() {
        setLines((prev) => [...prev, { ...emptyLine }]);
    }

    async function createPO(event) {
        event.preventDefault();
        try {
            await api.post('/purchase-orders', {
                supplier,
                lines: lines.map((line) => ({
                    sku: line.sku,
                    orderedQty: Number(line.orderedQty),
                    unitCostLKR: Number(line.unitCostLKR),
                })),
            });
            setSupplier('');
            setLines([emptyLine]);
            setMessage('Purchase order created');
            await load();
        } catch (err) {
            setError(err.response?.data?.message || 'PO creation failed');
        }
    }

    async function action(id, actionName) {
        try {
            await api.post(`/purchase-orders/${id}/${actionName}`);
            setMessage(`PO ${actionName} successful`);
            await load();
        } catch (err) {
            setError(err.response?.data?.message || `PO ${actionName} failed`);
        }
    }

    async function receiveRemaining(po) {
        const linesToReceive = (po.lines || [])
            .map((line) => ({
                sku: line.sku,
                receivedQty: Math.max(Number(line.orderedQty || 0) - Number(line.receivedQty || 0), 0),
            }))
            .filter((line) => line.receivedQty > 0);
        if (!linesToReceive.length) return;
        try {
            await api.post(`/purchase-orders/${po._id}/receive`, {
                lines: linesToReceive,
                note: 'Received from POS',
            });
            setMessage('PO received');
            await load();
        } catch (err) {
            setError(err.response?.data?.message || 'PO receive failed');
        }
    }

    return (
        <div className="grid gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
                <Panel title="Purchase Orders">
                    {error ? <p className="mb-2 text-sm text-rose-600">{error}</p> : null}
                    {message ? <p className="mb-2 text-sm text-emerald-700">{message}</p> : null}
                    <div className="space-y-2">
                        {rows.length ? rows.map((row) => (
                            <div key={row._id} className="rounded-md border border-slate-200 p-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">{row.poNo}</p>
                                        <p className="text-xs text-slate-500">{row.supplier} - {row.status}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => action(row._id, 'approve')} className="rounded bg-brand-600 px-2 py-1 text-xs text-white">Approve</button>
                                        <button type="button" onClick={() => action(row._id, 'place')} className="rounded bg-slate-800 px-2 py-1 text-xs text-white">Place</button>
                                        <button type="button" onClick={() => receiveRemaining(row)} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white">Receive</button>
                                    </div>
                                </div>
                            </div>
                        )) : <p className="text-sm text-slate-500">No purchase orders.</p>}
                    </div>
                </Panel>
            </div>
            <div>
                <Panel title="Create Purchase Order">
                    <form className="space-y-2" onSubmit={createPO}>
                        <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier" className="w-full rounded-md border border-slate-300 px-3 py-2" required />
                        {lines.map((line, index) => (
                            <div key={`line-${index}`} className="space-y-1 rounded-md border border-slate-200 p-2">
                                <input value={line.sku} onChange={(e) => updateLine(index, 'sku', e.target.value)} placeholder="SKU" className="w-full rounded-md border border-slate-300 px-2 py-1" required />
                                <input type="number" value={line.orderedQty} onChange={(e) => updateLine(index, 'orderedQty', e.target.value)} placeholder="Ordered Qty" className="w-full rounded-md border border-slate-300 px-2 py-1" required />
                                <input type="number" value={line.unitCostLKR} onChange={(e) => updateLine(index, 'unitCostLKR', e.target.value)} placeholder="Unit Cost" className="w-full rounded-md border border-slate-300 px-2 py-1" />
                            </div>
                        ))}
                        <button type="button" className="w-full rounded-md bg-slate-100 px-3 py-2 text-sm" onClick={addLine}>Add Line</button>
                        <button type="submit" className="w-full rounded-md bg-brand-600 px-3 py-2 text-white">Create PO</button>
                    </form>
                </Panel>
            </div>
        </div>
    );
}
