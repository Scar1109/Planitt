import { useEffect, useState } from 'react';
import api from '../services/api';
import Panel from '../components/ui/Panel';

export default function InventoryPage() {
    const [rows, setRows] = useState([]);
    const [form, setForm] = useState({ sku: '', quantityDelta: 0, reason: '' });
    const [receive, setReceive] = useState({ sku: '', receivedQty: 0, reason: '' });
    const [snapshotDate, setSnapshotDate] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    async function load() {
        try {
            const { data } = await api.get('/inventory/current');
            setRows(data.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load inventory');
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function submitAdjustment(event) {
        event.preventDefault();
        try {
            await api.post('/inventory/adjustments', {
                sku: form.sku,
                quantityDelta: Number(form.quantityDelta),
                reason: form.reason,
            });
            setForm({ sku: '', quantityDelta: 0, reason: '' });
            setMessage('Inventory adjusted');
            await load();
        } catch (err) {
            setError(err.response?.data?.message || 'Adjustment failed');
        }
    }

    async function submitReceive(event) {
        event.preventDefault();
        try {
            await api.post('/inventory/receipts', {
                sku: receive.sku,
                receivedQty: Number(receive.receivedQty),
                reason: receive.reason,
            });
            setReceive({ sku: '', receivedQty: 0, reason: '' });
            setMessage('Stock received');
            await load();
        } catch (err) {
            setError(err.response?.data?.message || 'Receive failed');
        }
    }

    async function runSnapshot() {
        try {
            await api.post('/inventory/snapshots/run', { date: snapshotDate || undefined });
            setMessage('Snapshot generated');
        } catch (err) {
            setError(err.response?.data?.message || 'Snapshot run failed');
        }
    }

    return (
        <div className="space-y-4">
            {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
            {error ? <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

            <div className="grid gap-4 lg:grid-cols-3">
                <Panel title="Adjust Stock">
                    <form className="space-y-2" onSubmit={submitAdjustment}>
                        <input value={form.sku} onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))} placeholder="SKU" className="w-full rounded-md border border-slate-300 px-3 py-2" />
                        <input type="number" value={form.quantityDelta} onChange={(e) => setForm((prev) => ({ ...prev, quantityDelta: e.target.value }))} placeholder="Quantity Delta" className="w-full rounded-md border border-slate-300 px-3 py-2" />
                        <input value={form.reason} onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Reason" className="w-full rounded-md border border-slate-300 px-3 py-2" />
                        <button type="submit" className="w-full rounded-md bg-brand-600 px-3 py-2 text-white">Apply</button>
                    </form>
                </Panel>
                <Panel title="Receive Stock">
                    <form className="space-y-2" onSubmit={submitReceive}>
                        <input value={receive.sku} onChange={(e) => setReceive((prev) => ({ ...prev, sku: e.target.value }))} placeholder="SKU" className="w-full rounded-md border border-slate-300 px-3 py-2" />
                        <input type="number" value={receive.receivedQty} onChange={(e) => setReceive((prev) => ({ ...prev, receivedQty: e.target.value }))} placeholder="Received Qty" className="w-full rounded-md border border-slate-300 px-3 py-2" />
                        <input value={receive.reason} onChange={(e) => setReceive((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Reason (optional)" className="w-full rounded-md border border-slate-300 px-3 py-2" />
                        <button type="submit" className="w-full rounded-md bg-accent px-3 py-2 text-white">Receive</button>
                    </form>
                </Panel>
                <Panel title="Snapshot">
                    <div className="space-y-2">
                        <input type="date" value={snapshotDate} onChange={(e) => setSnapshotDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                        <button type="button" onClick={runSnapshot} className="w-full rounded-md bg-slate-800 px-3 py-2 text-white">Run Snapshot</button>
                    </div>
                </Panel>
            </div>

            <Panel title="Current Inventory">
                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                                <th className="py-2 pr-3">SKU</th>
                                <th className="py-2 pr-3">Name</th>
                                <th className="py-2 pr-3">Category</th>
                                <th className="py-2 pr-3">Quantity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row._id} className="border-b border-slate-100">
                                    <td className="py-2 pr-3">{row.sku}</td>
                                    <td className="py-2 pr-3">{row.productName}</td>
                                    <td className="py-2 pr-3">{row.category}</td>
                                    <td className="py-2 pr-3 font-semibold">{row.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Panel>
        </div>
    );
}
