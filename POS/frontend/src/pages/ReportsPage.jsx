import { useEffect, useState } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, FileText, ClipboardList, Activity, Package, ArrowRightLeft } from 'lucide-react';
function money(value) {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(value || 0);
}

export default function ReportsPage() {
    const [daily, setDaily] = useState(null);
    const [movements, setMovements] = useState([]);
    const [poStatus, setPoStatus] = useState([]);
    const [audit, setAudit] = useState([]);
    const [error, setError] = useState('');

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setIsLoading(true);
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
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, []);

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 lg:p-10">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-indigo-600" />
                    Reports & Analytics
                </h2>
                <p className="text-sm text-slate-500 mt-1">Overview of today's sales, inventory movements, and system audits.</p>
            </div>

            {error ? (
                <div className="rounded-lg bg-rose-50 p-4 border border-rose-200 text-sm font-medium text-rose-800 flex items-center gap-2">
                    <Activity className="h-4 w-4" /> {error}
                </div>
            ) : null}

            {isLoading ? (
                <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="h-28 animate-pulse rounded-xl bg-slate-200"></div>
                        <div className="h-28 animate-pulse rounded-xl bg-slate-200"></div>
                        <div className="h-28 animate-pulse rounded-xl bg-slate-200"></div>
                        <div className="h-28 animate-pulse rounded-xl bg-slate-200"></div>
                    </div>
                    <div className="h-28 animate-pulse rounded-xl bg-slate-200"></div>
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="h-96 animate-pulse rounded-xl bg-slate-200"></div>
                        <div className="h-96 animate-pulse rounded-xl bg-slate-200"></div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Daily KPI Metrics */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card className="shadow-sm border-slate-200">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between space-y-0 pb-2">
                                    <p className="text-sm font-medium text-slate-500">Gross Sales Today</p>
                                    <DollarSign className="h-4 w-4 text-emerald-600" />
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{money(daily?.grossSales || 0)}</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-slate-200">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between space-y-0 pb-2">
                                    <p className="text-sm font-medium text-slate-500">Total Discounts</p>
                                    <TrendingDown className="h-4 w-4 text-rose-500" />
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{money(daily?.discount || 0)}</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-slate-200">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between space-y-0 pb-2">
                                    <p className="text-sm font-medium text-slate-500">Tax Collected</p>
                                    <Activity className="h-4 w-4 text-blue-500" />
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{money(daily?.tax || 0)}</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-slate-200">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between space-y-0 pb-2">
                                    <p className="text-sm font-medium text-slate-500">Total Bills</p>
                                    <FileText className="h-4 w-4 text-indigo-500" />
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{daily?.totalBills || 0}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* PO Status Banner */}
                    <Card className="shadow-sm border-slate-200 bg-indigo-50/50">
                        <CardHeader className="py-4 pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-800">
                                <Package className="h-4 w-4" /> Purchase Order Status Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
                                {poStatus.map((status) => (
                                    <div key={status._id} className="rounded-lg bg-white border border-indigo-100 p-3 text-center shadow-sm">
                                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 truncate">{status._id}</p>
                                        <p className="text-xl font-black text-indigo-700">{status.count}</p>
                                    </div>
                                ))}
                                {poStatus.length === 0 && <p className="text-sm text-slate-500 col-span-full">No active purchase orders.</p>}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Inventory Movements */}
                        <Card className="shadow-sm border-slate-200 overflow-hidden flex flex-col">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                                    <ArrowRightLeft className="h-4 w-4 text-amber-500" />
                                    Inventory Movements
                                </CardTitle>
                                <CardDescription>Recent stock adjustments and sales drops.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-auto max-h-[400px]">
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0 shadow-sm z-10">
                                        <TableRow>
                                            <TableHead className="w-[130px] font-semibold text-xs">Time</TableHead>
                                            <TableHead className="font-semibold text-xs">SKU</TableHead>
                                            <TableHead className="font-semibold text-xs">Type</TableHead>
                                            <TableHead className="text-right font-semibold text-xs">Delta</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {movements.length === 0 ? (
                                            <TableRow><TableCell colSpan={4} className="text-center text-slate-500 py-8">No recent movements.</TableCell></TableRow>
                                        ) : (
                                            movements.map((row) => (
                                                <TableRow key={row._id}>
                                                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">{new Date(row.occurredAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                                                    <TableCell className="font-medium font-mono text-xs text-slate-700">{row.sku}</TableCell>
                                                    <TableCell>
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 truncate max-w-[100px]">
                                                            {row.movementType}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className={`text-right font-bold text-xs ${row.quantityDelta > 0 ? 'text-emerald-600' : row.quantityDelta < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                                                        {row.quantityDelta > 0 ? '+' : ''}{row.quantityDelta}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Audit Trail */}
                        <Card className="shadow-sm border-slate-200 overflow-hidden flex flex-col">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                                    <ClipboardList className="h-4 w-4 text-emerald-500" />
                                    System Audit Trail
                                </CardTitle>
                                <CardDescription>Record of critical actions performed.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-auto max-h-[400px]">
                                <div className="divide-y divide-slate-100">
                                    {audit.length === 0 ? (
                                        <div className="text-center text-slate-500 py-8 text-sm">No audit logs found.</div>
                                    ) : (
                                        audit.map((entry) => (
                                            <div key={entry._id} className="p-4 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-semibold text-slate-800 leading-tight">
                                                            {entry.action}
                                                        </p>
                                                        <p className="text-xs text-slate-500 font-medium">
                                                            {entry.entityType} <span className="text-slate-400">#</span>
                                                            <span className="font-mono text-slate-600">{entry.entityId?.slice(-8) || entry.entityId}</span>
                                                        </p>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap pt-0.5">
                                                        {new Date(entry.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                    </p>
                                                </div>
                                                {/* If we had extra details we could render them conditionally here */}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
