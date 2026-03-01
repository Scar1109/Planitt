import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../services/api';
import KpiCard from '../components/ui/KpiCard';
import Panel from '../components/ui/Panel';

function money(value) {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(value || 0);
}

export default function DashboardPage() {
    const [summary, setSummary] = useState(null);
    const [hourly, setHourly] = useState([]);
    const [paymentSplit, setPaymentSplit] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [alerts, setAlerts] = useState({ lowStock: [], pendingPO: 0, suspendedBills: 0 });
    const [recentBills, setRecentBills] = useState([]);
    const [error, setError] = useState('');

    async function load() {
        try {
            const [summaryRes, hourlyRes, paymentRes, topRes, alertsRes, recentRes] = await Promise.all([
                api.get('/dashboard/summary'),
                api.get('/dashboard/hourly-sales'),
                api.get('/dashboard/payment-split'),
                api.get('/dashboard/top-products?limit=10'),
                api.get('/dashboard/alerts'),
                api.get('/dashboard/recent-bills?limit=8'),
            ]);
            setSummary(summaryRes.data);
            setHourly(hourlyRes.data.data || []);
            setPaymentSplit(paymentRes.data.data || []);
            setTopProducts(topRes.data.data || []);
            setAlerts(alertsRes.data || { lowStock: [], pendingPO: 0, suspendedBills: 0 });
            setRecentBills(recentRes.data.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load dashboard');
        }
    }

    useEffect(() => {
        load();
        const id = window.setInterval(load, 45000);
        return () => window.clearInterval(id);
    }, []);

    const paymentData = useMemo(() => paymentSplit.map((item) => ({ name: item.method || 'unknown', value: item.amount || 0 })), [paymentSplit]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Operations Dashboard</h2>
                <button type="button" onClick={load} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
                    Refresh
                </button>
            </div>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                <KpiCard title="Gross Sales" value={money(summary?.grossSales || 0)} />
                <KpiCard title="Net Sales" value={money(summary?.netSales || 0)} />
                <KpiCard title="Bills" value={summary?.billCount || 0} />
                <KpiCard title="Items Sold" value={summary?.itemsSold || 0} />
                <KpiCard title="Avg Basket" value={money(summary?.avgBasket || 0)} />
                <KpiCard title="Returns" value={money(summary?.returnAmount || 0)} />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
                <Panel title="Hourly Sales">
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={hourly}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="hour" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="sales" stroke="#4338ca" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>
                <Panel title="Payment Split">
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={paymentData} dataKey="value" nameKey="name" outerRadius={90} fill="#0ea5a6" />
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>
                <Panel title="Top Products">
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProducts.slice(0, 6)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="_id" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="sales" fill="#4f46e5" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="Operational Alerts">
                    <div className="space-y-2 text-sm">
                        <p className="text-slate-700">Pending Purchase Orders: <strong>{alerts.pendingPO || 0}</strong></p>
                        <p className="text-slate-700">Suspended Bills: <strong>{alerts.suspendedBills || 0}</strong></p>
                        <div className="rounded-lg border border-slate-200 p-3">
                            <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Low Stock Items</p>
                            {alerts.lowStock?.length ? alerts.lowStock.slice(0, 6).map((item) => (
                                <div key={item.sku} className="flex justify-between border-b border-slate-100 py-1 last:border-b-0">
                                    <span>{item.productName}</span>
                                    <span className="font-semibold text-rose-600">{item.quantity}</span>
                                </div>
                            )) : <p className="text-slate-500">No low stock alerts</p>}
                        </div>
                    </div>
                </Panel>
                <Panel title="Recent Bills">
                    <div className="space-y-2 text-sm">
                        {recentBills.length ? recentBills.map((bill) => (
                            <div key={bill._id} className="flex items-center justify-between rounded-md border border-slate-200 p-2">
                                <div>
                                    <p className="font-semibold">{bill.billNo || bill._id.slice(-6)}</p>
                                    <p className="text-xs text-slate-500">{bill.paymentMethod}</p>
                                </div>
                                <p className="font-semibold">{money(bill.grandTotalLKR)}</p>
                            </div>
                        )) : <p className="text-slate-500">No recent bills</p>}
                    </div>
                </Panel>
            </div>

            <Panel title="Quick Actions">
                <div className="flex flex-wrap gap-3">
                    <Link className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white" to="/cashier">New Bill</Link>
                    <Link className="rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white" to="/orders/suspended">Resume Bill</Link>
                    <Link className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white" to="/inventory">Stock Adjust</Link>
                    <Link className="rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-white" to="/purchase-orders">Create PO</Link>
                </div>
            </Panel>
        </div>
    );
}
