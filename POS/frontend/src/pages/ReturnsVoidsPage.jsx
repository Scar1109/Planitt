import { useEffect, useState } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { RotateCcw, Ban, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
function money(value) {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(value || 0);
}

export default function ReturnsVoidsPage() {
    const [rows, setRows] = useState([]);
    const [actionReason, setActionReason] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    async function load() {
        setIsLoading(true);
        try {
            const { data } = await api.get('/returns-voids?limit=200');
            setRows(data.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load return/void records');
        } finally {
            setIsLoading(false);
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
        <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 lg:p-10">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Returns and Voids</h2>
                <p className="text-sm text-slate-500">Manage order cancellations and product returns.</p>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-rose-800 border border-rose-200 animate-in slide-in-from-top-2">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-indigo-700">
                        <RotateCcw className="h-5 w-5" />
                        Return or Void Bills
                    </CardTitle>
                    <CardDescription>Enter a reason below before performing any return or void action.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-6">
                    <div className="flex gap-3">
                        <Input
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            placeholder="Required: Reason for void/return action"
                            className="max-w-md h-10"
                        />
                    </div>

                    <div className="grid gap-3">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex h-20 w-full animate-pulse rounded-lg bg-slate-200 my-2"></div>
                            ))
                        ) : rows.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <FileText className="h-12 w-12 text-slate-200 mb-3" />
                                <p className="text-sm font-medium">No return/void records available.</p>
                            </div>
                        ) : (
                            rows.map((bill) => (
                                <div key={bill._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 shrink-0">
                                            <FileText className="h-5 w-5 text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900 flex items-center gap-2">
                                                Bill #{bill.billNo || bill._id.slice(-6)}
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${bill.status === 'voided' ? 'bg-rose-100 text-rose-700' :
                                                    bill.status === 'returned' || bill.status === 'partially_returned' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {bill.status}
                                                </span>
                                            </p>
                                            <p className="text-sm text-slate-500 font-medium mt-1">
                                                Returned: <span className="text-slate-700 font-semibold">{money(bill.returnSummary?.returnedAmountLKR || 0)}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {bill.status !== 'voided' && (
                                            <Button
                                                variant="outline"
                                                onClick={() => voidBill(bill._id)}
                                                className="border-rose-200 text-rose-600 hover:bg-rose-50 h-9"
                                                disabled={!actionReason}
                                            >
                                                <Ban className="w-4 h-4 mr-2" />
                                                Void Bill
                                            </Button>
                                        )}
                                        {(bill.status === 'paid' || bill.status === 'partially_returned') && (
                                            <Button
                                                onClick={() => returnAll(bill)}
                                                className="bg-amber-600 hover:bg-amber-700 text-white h-9"
                                                disabled={!actionReason}
                                            >
                                                <RotateCcw className="w-4 h-4 mr-2" />
                                                Return Remaining
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
