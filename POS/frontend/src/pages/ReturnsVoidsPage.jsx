import { useEffect, useState } from 'react';
import api from '../services/api';
import Panel from '../components/ui/Panel';

function money(value) {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(value || 0);
}

export default function ReturnsVoidsPage() {
    const [rows, setRows] = useState([]);
    const [actionReason, setActionReason] = useState('');
    const [error, setError] = useState('');

    async function load() {
        try {
            const { data } = await api.get('/returns-voids?limit=200');
            setRows(data.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load return/void records');
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function voidBill(id) {
        if (!actionReason) return;
        try {
            await api.post(`/bills/${id}/void`, { reason: actionReason });
            setActionReason('');
            await load();
        } catch (err) {
            setError(err.response?.data?.message || 'Void failed');
        }
    }

    async function returnAll(bill) {
        if (!actionReason) return;
        const items = (bill.items || [])
            .filter((line) => Number(line.returnableQty || 0) > 0)
            .map((line) => ({
                lineId: line._id,
                quantity: Number(line.returnableQty),
                reason: actionReason,
            }));
        if (items.length === 0) return;
        try {
            await api.post(`/bills/${bill._id}/returns`, { items });
            setActionReason('');
            await load();
        } catch (err) {
            setError(err.response?.data?.message || 'Return failed');
        }
    }

    return (
        <Panel title="Returns and Voids">
            {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
            <div className="mb-3 flex gap-2">
                <input value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder="Reason for void/return action" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div className="space-y-2">
                {rows.length ? rows.map((bill) => (
                    <div key={bill._id} className="rounded-md border border-slate-200 p-3 text-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold">{bill.billNo || bill._id.slice(-6)} <span className="text-xs text-slate-500">({bill.status})</span></p>
                                <p className="text-xs text-slate-500">Returned: {money(bill.returnSummary?.returnedAmountLKR || 0)}</p>
                            </div>
                            <div className="flex gap-2">
                                {bill.status !== 'voided' ? (
                                    <button type="button" onClick={() => voidBill(bill._id)} className="rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white">
                                        Void Bill
                                    </button>
                                ) : null}
                                {(bill.status === 'paid' || bill.status === 'partially_returned') ? (
                                    <button type="button" onClick={() => returnAll(bill)} className="rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold text-white">
                                        Return Remaining
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )) : <p className="text-sm text-slate-500">No return/void records available.</p>}
            </div>
        </Panel>
    );
}
