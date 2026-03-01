import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import { RefreshCw, ShoppingCart, Activity, ArrowLeftRight, TrendingUp, Package, Tag, Wallet, AlertTriangle, HandCoins, ArrowDownToLine, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

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
    const [isLoading, setIsLoading] = useState(false);

    // Till Management State
    const [drawerModal, setDrawerModal] = useState({ isOpen: false, type: 'DROP' });
    const [drawerAmount, setDrawerAmount] = useState('');
    const [drawerReason, setDrawerReason] = useState('');
    const [drawerError, setDrawerError] = useState('');
    const [drawerSuccess, setDrawerSuccess] = useState('');

    async function load() {
        setIsLoading(true);
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
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load dashboard');
        } finally {
            setIsLoading(false);
        }
    }

    async function submitDrawerEvent() {
        if (!drawerAmount || isNaN(drawerAmount) || Number(drawerAmount) <= 0) {
            setDrawerError('Please enter a valid amount.');
            return;
        }
        if (!drawerReason.trim()) {
            setDrawerError('Please enter a reason.');
            return;
        }

        try {
            setDrawerError('');
            await api.post('/sessions/events', {
                eventType: drawerModal.type,
                amountLKR: Number(drawerAmount),
                reason: drawerReason
            });
            setDrawerSuccess(`${drawerModal.type === 'DROP' ? 'Cash Drop' : 'Payout'} recorded successfully.`);
            setDrawerAmount('');
            setDrawerReason('');
            setTimeout(() => {
                setDrawerModal(prev => ({ ...prev, isOpen: false }));
                setDrawerSuccess('');
                load();
            }, 1500);
        } catch (err) {
            setDrawerError(err.response?.data?.message || 'Failed to record drawer event. Ensure you have an open session.');
        }
    }

    useEffect(() => {
        load();
        const id = window.setInterval(load, 45000);
        return () => window.clearInterval(id);
    }, []);

    const paymentData = useMemo(() => paymentSplit.map((item) => ({ name: item.method || 'unknown', value: item.amount || 0 })), [paymentSplit]);



    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 lg:p-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Operations Dashboard</h2>
                    <p className="text-sm text-slate-500">Overview of today's store performance and alerts.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={load} disabled={isLoading} className="gap-2">
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        Refresh Data
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg bg-rose-50 p-4 border border-rose-200 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-rose-600" />
                    <p className="text-sm font-medium text-rose-800">{error}</p>
                </div>
            )}

            <Card className="shadow-sm border-slate-200 bg-slate-900 text-slate-50">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <h3 className="font-semibold text-lg">Quick Actions</h3>
                            <p className="text-slate-400 text-sm">Common tasks for store operations</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Button asChild variant="secondary" className="hover:bg-slate-200">
                                <Link to="/cashier">New Bill</Link>
                            </Button>
                            <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white">
                                <Link to="/orders/suspended">Resume Bill</Link>
                            </Button>
                            <Button
                                variant="outline"
                                className="border-indigo-400/30 text-indigo-300 hover:bg-indigo-950/50 hover:text-indigo-200"
                                onClick={() => { setDrawerModal({ isOpen: true, type: 'DROP' }); setDrawerError(''); setDrawerSuccess(''); setDrawerAmount(''); setDrawerReason(''); }}
                            >
                                <ArrowDownToLine className="w-4 h-4 mr-2" /> Cash Drop
                            </Button>
                            <Button
                                variant="outline"
                                className="border-amber-400/30 text-amber-300 hover:bg-amber-950/50 hover:text-amber-200"
                                onClick={() => { setDrawerModal({ isOpen: true, type: 'PAYOUT' }); setDrawerError(''); setDrawerSuccess(''); setDrawerAmount(''); setDrawerReason(''); }}
                            >
                                <HandCoins className="w-4 h-4 mr-2" /> Payout
                            </Button>
                            <Button asChild variant="outline" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white">
                                <Link to="/inventory">Stock Adjust</Link>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
            {isLoading && !summary ? (
                <div className="space-y-6">
                    <div className="h-[120px] w-full animate-pulse rounded-xl bg-slate-200"></div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                        <div className="col-span-1 lg:col-span-4 h-[350px] animate-pulse rounded-xl bg-slate-200"></div>
                        <div className="col-span-1 lg:col-span-3 h-[350px] animate-pulse rounded-xl bg-slate-200"></div>
                    </div>
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="h-[280px] animate-pulse rounded-xl bg-slate-200"></div>
                        <div className="h-[280px] animate-pulse rounded-xl bg-slate-200"></div>
                        <div className="h-[280px] animate-pulse rounded-xl bg-slate-200"></div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-1 lg:col-span-4 shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-indigo-500" />
                                    Hourly Sales Trend
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pl-0">
                                <div className="h-[300px] w-full mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={hourly} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis
                                                dataKey="hour"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 12 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 12 }}
                                                tickFormatter={(value) => `Rs${value / 1000}k`}
                                            />
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="sales"
                                                stroke="#4f46e5"
                                                strokeWidth={3}
                                                dot={{ r: 4, fill: '#4f46e5', strokeWidth: 0 }}
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="col-span-1 lg:col-span-3 shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Payment Split</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] w-full flex items-center justify-center">
                                    {paymentData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={paymentData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={90}
                                                    fill="#4f46e5"
                                                    paddingAngle={2}
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                    labelLine={false}
                                                />
                                                <RechartsTooltip
                                                    formatter={(value) => money(value)}
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <p className="text-slate-500 text-sm">No payment data yet.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="col-span-1 shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Top Products (by Volume)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[250px] w-full pt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topProducts.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="_id"
                                                type="category"
                                                axisLine={false}
                                                tickLine={false}
                                                width={100}
                                                tick={{ fill: '#334155', fontSize: 12 }}
                                            />
                                            <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="sales" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="col-span-1 shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    Operational Alerts
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg bg-orange-50 p-3 border border-orange-100">
                                        <p className="text-xs text-orange-600 font-semibold uppercase tracking-wider mb-1">Pending Pos</p>
                                        <p className="text-2xl font-bold text-orange-700">{alerts.pendingPO || 0}</p>
                                    </div>
                                    <div className="rounded-lg bg-indigo-50 p-3 border border-indigo-100">
                                        <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-1">Suspended</p>
                                        <p className="text-2xl font-bold text-indigo-700">{alerts.suspendedBills || 0}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-semibold text-slate-700 mb-2">Low Stock Items</p>
                                    <div className="space-y-1">
                                        {alerts.lowStock?.length ? alerts.lowStock.slice(0, 4).map((item) => (
                                            <div key={item.sku} className="flex justify-between items-center bg-slate-50 rounded p-2">
                                                <span className="text-sm text-slate-700 truncate mr-2">{item.productName}</span>
                                                <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">{item.quantity}</span>
                                            </div>
                                        )) : <p className="text-sm text-slate-500 italic">No low stock alerts</p>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="col-span-1 shadow-sm border-slate-200">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-base font-semibold">Recent Bills</CardTitle>
                                <Link to="/reports" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">View All</Link>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {recentBills.length ? recentBills.slice(0, 5).map((bill) => (
                                        <div key={bill._id} className="flex items-center justify-between group">
                                            <div>
                                                <p className="font-medium text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">#{bill.billNo || bill._id.slice(-6)}</p>
                                                <p className="text-xs text-slate-500 capitalize">{bill.paymentMethod}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-sm text-slate-900">{money(bill.grandTotalLKR)}</p>
                                                <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{bill.status}</span>
                                            </div>
                                        </div>
                                    )) : <p className="text-sm text-slate-500 italic">No recent bills</p>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}

            <Dialog open={drawerModal.isOpen} onOpenChange={(val) => setDrawerModal(prev => ({ ...prev, isOpen: val }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{drawerModal.type === 'DROP' ? 'Record Cash Drop' : 'Record Payout'}</DialogTitle>
                        <DialogDescription>
                            {drawerModal.type === 'DROP'
                                ? 'Record cash being securely removed from the drawer and dropped into the safe.'
                                : 'Record cash being taken out of the drawer for an external expense.'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {drawerSuccess && (
                        <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <p className="text-sm font-medium">{drawerSuccess}</p>
                        </div>
                    )}

                    {drawerError && (
                        <div className="flex items-center gap-2 rounded-md bg-rose-50 p-3 text-rose-800 border border-rose-200">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <p className="text-sm font-medium">{drawerError}</p>
                        </div>
                    )}

                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Amount (LKR)</label>
                            <Input
                                type="number"
                                value={drawerAmount}
                                onChange={(e) => setDrawerAmount(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Reason / Reference</label>
                            <Input
                                value={drawerReason}
                                onChange={(e) => setDrawerReason(e.target.value)}
                                placeholder={drawerModal.type === 'DROP' ? 'E.g. Safe Drop #1' : 'E.g. Vendor Payment / Supplies'}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDrawerModal(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
                        <Button
                            className={drawerModal.type === 'DROP' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}
                            onClick={submitDrawerEvent}
                            disabled={!!drawerSuccess}
                        >
                            Confirm {drawerModal.type === 'DROP' ? 'Drop' : 'Payout'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
