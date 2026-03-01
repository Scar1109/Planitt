import { useEffect, useState } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import { PackageOpen, ArrowDownToLine, ArrowRightLeft, Camera, CheckCircle2, Ban } from 'lucide-react';

export default function InventoryPage() {
    const [rows, setRows] = useState([]);
    const [form, setForm] = useState({ sku: '', quantityDelta: '', reason: '' });
    const [receive, setReceive] = useState({ sku: '', receivedQty: '', reason: '' });
    const [snapshotDate, setSnapshotDate] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    async function load() {
        setIsLoading(true);
        try {
            const { data } = await api.get('/inventory/current');
            setRows(data.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load inventory');
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function submitAdjustment(event) {
        event.preventDefault();
        setError('');
        try {
            await api.post('/inventory/adjustments', {
                sku: form.sku,
                quantityDelta: Number(form.quantityDelta),
                reason: form.reason || 'Manual Adjustment',
            });
            setForm({ sku: '', quantityDelta: '', reason: '' });
            setMessage('Inventory adjusted successfully');
            await load();
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Adjustment failed');
        }
    }

    async function submitReceive(event) {
        event.preventDefault();
        setError('');
        try {
            await api.post('/inventory/receipts', {
                sku: receive.sku,
                receivedQty: Number(receive.receivedQty),
                reason: receive.reason || 'Manual Receipt',
            });
            setReceive({ sku: '', receivedQty: '', reason: '' });
            setMessage('Stock received successfully');
            await load();
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Receive failed');
        }
    }

    async function runSnapshot(event) {
        event.preventDefault();
        setError('');
        try {
            await api.post('/inventory/snapshots/run', { date: snapshotDate || undefined });
            setMessage('Snapshot generated successfully');
            setSnapshotDate('');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Snapshot run failed');
        }
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 lg:p-10">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Inventory Management</h2>
                <p className="text-sm text-slate-500">Monitor stock levels, receive shipments, and process adjustments.</p>
            </div>

            {message && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-emerald-800 border border-emerald-200 animate-in slide-in-from-top-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="text-sm font-medium">{message}</p>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-rose-800 border border-rose-200 animate-in slide-in-from-top-2">
                    <Ban className="h-5 w-5" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-indigo-700">
                            <ArrowRightLeft className="h-4 w-4" />
                            Adjust Stock
                        </CardTitle>
                        <CardDescription>Correct discrepancies or damages.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form className="space-y-4" onSubmit={submitAdjustment}>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">SKU</label>
                                <Input required value={form.sku} onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))} placeholder="e.g. ITEM-001" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Quantity Delta</label>
                                <Input required type="number" value={form.quantityDelta} onChange={(e) => setForm((prev) => ({ ...prev, quantityDelta: e.target.value }))} placeholder="-5 or 10" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Reason</label>
                                <Input value={form.reason} onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="e.g. Damaged" />
                            </div>
                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">Apply Adjustment</Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-emerald-700">
                            <ArrowDownToLine className="h-4 w-4" />
                            Receive Stock
                        </CardTitle>
                        <CardDescription>Log new shipments into inventory.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form className="space-y-4" onSubmit={submitReceive}>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">SKU</label>
                                <Input required value={receive.sku} onChange={(e) => setReceive((prev) => ({ ...prev, sku: e.target.value }))} placeholder="e.g. ITEM-002" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Received Qty</label>
                                <Input required type="number" min="1" value={receive.receivedQty} onChange={(e) => setReceive((prev) => ({ ...prev, receivedQty: e.target.value }))} placeholder="50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Reason / Po Ref</label>
                                <Input value={receive.reason} onChange={(e) => setReceive((prev) => ({ ...prev, reason: e.target.value }))} placeholder="e.g. PO-1025" />
                            </div>
                            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">Receive Stock</Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-700">
                            <Camera className="h-4 w-4" />
                            Inventory Snapshot
                        </CardTitle>
                        <CardDescription>Record stock levels for EOD reporting.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form className="space-y-4" onSubmit={runSnapshot}>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Effective Date</label>
                                <Input type="date" value={snapshotDate} onChange={(e) => setSnapshotDate(e.target.value)} />
                                <p className="text-xs text-slate-400 mt-1">Leave blank to use current date</p>
                            </div>
                            <div className="pt-3">
                                <Button type="submit" variant="outline" className="w-full border-slate-300 text-slate-700 hover:bg-slate-100">Take Snapshot</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <PackageOpen className="h-5 w-5 text-indigo-500" />
                        Current Stock Levels
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50">
                                <TableHead className="w-[150px] font-semibold">SKU</TableHead>
                                <TableHead className="font-semibold">Product Name</TableHead>
                                <TableHead className="font-semibold">Category</TableHead>
                                <TableHead className="text-right font-semibold">In Stock</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><div className="h-5 w-20 animate-pulse rounded bg-slate-200"></div></TableCell>
                                        <TableCell><div className="h-5 w-64 animate-pulse rounded bg-slate-200"></div></TableCell>
                                        <TableCell><div className="h-5 w-24 animate-pulse rounded bg-slate-200"></div></TableCell>
                                        <TableCell><div className="h-6 w-16 animate-pulse rounded-full bg-slate-200 ml-auto"></div></TableCell>
                                    </TableRow>
                                ))
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                                        No active inventory found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((row) => (
                                    <TableRow key={row._id}>
                                        <TableCell className="font-medium font-mono text-xs">{row.sku}</TableCell>
                                        <TableCell className="font-semibold text-slate-800">{row.productName || 'Unknown Product'}</TableCell>
                                        <TableCell className="text-slate-500 text-sm">{row.category || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${row.quantity <= 0 ? 'bg-rose-100 text-rose-700' :
                                                row.quantity < 10 ? 'bg-amber-100 text-amber-700' :
                                                    'bg-indigo-50 text-indigo-700'
                                                }`}>
                                                {row.quantity} units
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
