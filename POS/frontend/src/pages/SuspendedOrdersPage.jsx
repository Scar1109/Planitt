import { useEffect, useState } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Clock, PlayCircle, AlertTriangle, FileText } from 'lucide-react';

export default function SuspendedOrdersPage() {
    const [bills, setBills] = useState([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    async function load() {
        setIsLoading(true);
        try {
            const { data } = await api.get('/bills/suspended');
            setBills(data.data || []);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load suspended bills');
        } finally {
            setIsLoading(false);
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
        <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 lg:p-10">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Suspended Bills</h2>
                <p className="text-sm text-slate-500">Manage and resume on-hold transactions.</p>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-rose-800 border border-rose-200 animate-in slide-in-from-top-2">
                    <AlertTriangle className="h-5 w-5" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-indigo-700">
                        <Clock className="h-5 w-5" />
                        On-Hold Transactions
                    </CardTitle>
                    <CardDescription>Click resume to load the bill back into the cashier terminal.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex h-20 w-full animate-pulse rounded-lg bg-slate-200 my-2"></div>
                            ))
                        ) : bills.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <FileText className="h-12 w-12 text-slate-200 mb-3" />
                                <p className="text-sm font-medium">No suspended bills found.</p>
                            </div>
                        ) : (
                            bills.map((bill) => (
                                <div key={bill._id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
                                            <FileText className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">Bill #{bill.billNo || bill._id.slice(-6)}</p>
                                            <p className="text-sm text-slate-500 font-medium">
                                                {bill.items.length} {bill.items.length === 1 ? 'item' : 'items'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right hidden sm:block">
                                            <p className="font-bold text-slate-900">
                                                Rs {bill.grandTotalLKR.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => resumeBill(bill._id)}
                                            className="bg-indigo-600 hover:bg-indigo-700 font-semibold shadow-sm"
                                        >
                                            <PlayCircle className="mr-2 h-4 w-4" />
                                            Resume
                                        </Button>
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
