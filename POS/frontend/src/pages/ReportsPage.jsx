import { useEffect, useState } from 'react';
import api from '../services/api';
import Panel from '../components/ui/Panel';

function money(value) {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(value || 0);
}

export default function ReportsPage() {
    const [daily, setDaily] = useState(null);
    const [movements, setMovements] = useState([]);
    const [poStatus, setPoStatus] = useState([]);
    const [audit, setAudit] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        async function load() {
            try {
                const [dailyRes, moveRes, poRes, auditRes] = await Promise.all([
                    api.get('/reports/daily-sales'),
                    api.get('/reports/inventory-movements?limit=100'),
                    api.get('/reports/po-status'),
                    api.get('/reports/audit?limit=100'),
                ]);
                setDaily(dailyRes.data);
                setMovements(moveRes.data.data || []);
                setPoStatus(poRes.data.data || []);
                setAudit(auditRes.data.data || []);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load reports');
            }
        }
        load();
    }, []);

    return (
        <div className="space-y-4">
            {error ? <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
            <div className="grid gap-4 md:grid-cols-4">
                <Panel title="Gross Sales"><p className="text-xl font-semibold">{money(daily?.grossSales || 0)}</p></Panel>
                <Panel title="Discount"><p className="text-xl font-semibold">{money(daily?.discount || 0)}</p></Panel>
                <Panel title="Tax"><p className="text-xl font-semibold">{money(daily?.tax || 0)}</p></Panel>
                <Panel title="Bills"><p className="text-xl font-semibold">{daily?.totalBills || 0}</p></Panel>
            </div>

            <Panel title="PO Status">
                <div className="grid gap-2 md:grid-cols-3">
                    {poStatus.map((status) => (
                        <div key={status._id} className="rounded-md border border-slate-200 p-3 text-center">
                            <p className="text-xs uppercase text-slate-500">{status._id}</p>
                            <p className="text-lg font-bold">{status.count}</p>
                        </div>
                    ))}
                </div>
            </Panel>

            <Panel title="Inventory Movements">
                <div className="max-h-72 overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                                <th className="py-2 pr-2">Time</th>
                                <th className="py-2 pr-2">SKU</th>
                                <th className="py-2 pr-2">Type</th>
                                <th className="py-2 pr-2">Delta</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movements.map((row) => (
                                <tr key={row._id} className="border-b border-slate-100">
                                    <td className="py-2 pr-2">{new Date(row.occurredAt).toLocaleString()}</td>
                                    <td className="py-2 pr-2">{row.sku}</td>
                                    <td className="py-2 pr-2">{row.movementType}</td>
                                    <td className="py-2 pr-2">{row.quantityDelta}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Panel>

            <Panel title="Audit Trail">
                <div className="max-h-72 space-y-2 overflow-auto">
                    {audit.map((entry) => (
                        <div key={entry._id} className="rounded-md border border-slate-200 p-2 text-sm">
                            <p className="font-semibold">{entry.action}</p>
                            <p className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()} - {entry.entityType} #{entry.entityId}</p>
                        </div>
                    ))}
                </div>
            </Panel>
        </div>
    );
}
