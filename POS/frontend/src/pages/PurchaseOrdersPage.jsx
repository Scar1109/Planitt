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
import { ShoppingCart, Plus, CheckCircle2, Ban, Package, ArrowDownToLine, Trash2, Send } from 'lucide-react';

const emptyLine = { sku: '', orderedQty: 1, unitCostLKR: 0 };

export default function PurchaseOrdersPage() {
    const [rows, setRows] = useState([]);
    const [supplier, setSupplier] = useState('');
    const [lines, setLines] = useState([emptyLine]);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    async function load() {
        setIsLoading(true);
        try {
            const { data } = await api.get('/purchase-orders?limit=200');
            setRows(data.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load purchase orders');
        } finally {
            setIsLoading(false);
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
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 lg:p-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Purchase Orders</h2>
                    <p className="text-sm text-slate-500">Manage supplier orders and receive inventory.</p>
                </div>
            </div>

            {message && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-emerald-800 border border-emerald-200 animate-in slide-in-from-top-2">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{message}</p>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-rose-800 border border-rose-200 animate-in slide-in-from-top-2">
                    <Ban className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2 space-y-6">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                            <CardTitle className="text-base font-semibold flex items-center gap-2 text-indigo-700">
                                <ShoppingCart className="h-5 w-5" />
                                Active Orders
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                                        <TableHead className="w-[100px] font-semibold">PO #</TableHead>
                                        <TableHead className="font-semibold">Supplier</TableHead>
                                        <TableHead className="text-center font-semibold">Status</TableHead>
                                        <TableHead className="text-right font-semibold">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell><div className="h-5 w-16 animate-pulse rounded bg-slate-200"></div></TableCell>
                                                <TableCell><div className="h-5 w-48 animate-pulse rounded bg-slate-200"></div></TableCell>
                                                <TableCell><div className="h-5 w-24 animate-pulse rounded bg-slate-200 mx-auto"></div></TableCell>
                                                <TableCell><div className="h-8 w-24 animate-pulse rounded bg-slate-200 ml-auto"></div></TableCell>
                                            </TableRow>
                                        ))
                                    ) : rows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                                                No purchase orders found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        rows.map((row) => (
                                            <TableRow key={row._id}>
                                                <TableCell className="font-medium font-mono text-xs">{row.poNo}</TableCell>
                                                <TableCell className="font-semibold text-slate-800">{row.supplier}</TableCell>
                                                <TableCell className="text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${row.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                                                        row.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                                            row.status === 'placed' ? 'bg-amber-100 text-amber-700' :
                                                                row.status === 'received' ? 'bg-emerald-100 text-emerald-700' :
                                                                    'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {row.status}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {row.status === 'draft' && (
                                                            <Button size="sm" variant="outline" className="h-8 text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => action(row._id, 'approve')}>
                                                                Approve
                                                            </Button>
                                                        )}
                                                        {row.status === 'approved' && (
                                                            <Button size="sm" variant="outline" className="h-8 text-xs font-semibold text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => action(row._id, 'place')}>
                                                                <Send className="w-3 h-3 mr-1" /> Place
                                                            </Button>
                                                        )}
                                                        {(row.status === 'placed' || row.status === 'partially_received') && (
                                                            <Button size="sm" className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700" onClick={() => receiveRemaining(row)}>
                                                                <ArrowDownToLine className="w-3 h-3 mr-1" /> Receive
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div>
                    <Card className="shadow-sm border-slate-200 sticky top-6">
                        <CardHeader className="border-b border-slate-100 pb-4">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Plus className="h-4 w-4 text-indigo-600" />
                                Create New PO
                            </CardTitle>
                            <CardDescription>Draft a new order to a supplier</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                            <form className="space-y-4" onSubmit={createPO}>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Supplier Name</label>
                                    <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Acme Corp" required />
                                </div>

                                <div className="space-y-3 pt-2">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Order Lines</label>
                                    {lines.map((line, index) => (
                                        <div key={`line-${index}`} className="relative space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 pt-4 group">
                                            {lines.length > 1 && (
                                                <button type="button" onClick={() => setLines(lines.filter((_, i) => i !== index))} className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 transition-colors">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                            <div className="grid gap-2">
                                                <Input className="h-9 bg-white" value={line.sku} onChange={(e) => updateLine(index, 'sku', e.target.value)} placeholder="SKU Code" required />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Input className="h-9 bg-white" type="number" min="1" value={line.orderedQty} onChange={(e) => updateLine(index, 'orderedQty', e.target.value)} placeholder="Qty" required />
                                                    <Input className="h-9 bg-white" type="number" min="0" step="0.01" value={line.unitCostLKR} onChange={(e) => updateLine(index, 'unitCostLKR', e.target.value)} placeholder="Unit Cost" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <Button type="button" variant="outline" className="border-slate-300 text-slate-700" onClick={addLine}>
                                        <Plus className="w-4 h-4 mr-1" /> Add Line
                                    </Button>
                                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 font-semibold" disabled={!supplier || lines.some(l => !l.sku || !l.orderedQty)}>
                                        Create Draft
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
