import { useEffect, useState } from 'react';
import api from '../services/api';
import Panel from '../components/ui/Panel';

export default function SuspendedOrdersPage() {
    const [bills, setBills] = useState([]);
    const [error, setError] = useState('');

    async function load() {
        try {
            const { data } = await api.get('/bills/suspended');
            setBills(data.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load suspended bills');
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function resumeBill(id) {
        try {
            await api.post(`/bills/${id}/resume`);
            await load();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resume bill');
        }
    }

    return (
        <Panel title="Suspended Bills">
            {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
            <div className="space-y-2">
                {bills.length ? bills.map((bill) => (
                    <div key={bill._id} className="flex items-center justify-between rounded-md border border-slate-200 p-3">
                        <div>
                            <p className="font-medium">{bill.billNo || bill._id.slice(-6)}</p>
                            <p className="text-xs text-slate-500">{bill.items.length} items</p>
                        </div>
                        <button type="button" onClick={() => resumeBill(bill._id)} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white">
                            Resume
                        </button>
                    </div>
                )) : <p className="text-sm text-slate-500">No suspended bills.</p>}
            </div>
        </Panel>
    );
}
