import { useEffect, useState } from 'react';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import { Search, ShoppingCart, Plus, CheckCircle2, UserCircle2, Ban, Printer, FileText, Package, Box, CreditCard, Users, DollarSign, Wallet } from 'lucide-react';

function money(value) {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(value || 0);
}

export default function CashierPage() {
    const [session, setSession] = useState(null);
    const [terminalId, setTerminalId] = useState('T1');
    const [openingFloat, setOpeningFloat] = useState(0);
    const [bill, setBill] = useState(null);
    const [search, setSearch] = useState('');
    const [products, setProducts] = useState([]);

    // Checkout Modal State
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [paidAmount, setPaidAmount] = useState('');
    const [billDiscountPercent, setBillDiscountPercent] = useState(0);

    // Customer Search State
    const [customerQuery, setCustomerQuery] = useState('');
    const [customerResults, setCustomerResults] = useState([]);
    const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);

    // Till Management State
    const [isTillModalOpen, setIsTillModalOpen] = useState(false);
    const [tillEventType, setTillEventType] = useState('DROP');
    const [tillAmount, setTillAmount] = useState('');
    const [tillReason, setTillReason] = useState('');

    // Close Shift State
    const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);
    const [actualClosingCash, setActualClosingCash] = useState('');

    const [lastBillId, setLastBillId] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    async function loadCurrentSession() {
        try {
            const { data } = await api.get('/sessions/current');
            setSession(data.session);
        } catch (err) {
            // No active session is fine
        }
    }

    useEffect(() => {
        loadCurrentSession();
    }, []);

    async function openSession(event) {
        if (event) event.preventDefault();
        try {
            const { data } = await api.post('/sessions/open', {
                terminalId,
                openingFloatLKR: Number(openingFloat),
            });
            setSession(data);
            setMessage('Shift opened successfully.');
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to open shift');
        }
    }

    async function createDraftBill() {
        if (!session) return;
        try {
            const { data } = await api.post('/bills', { sessionId: session._id });
            setBill(data);
            setPaidAmount('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create draft');
        }
    }

    async function searchProducts(value) {
        setSearch(value);
        if (!value || value.length < 2) {
            setProducts([]);
            return;
        }
        try {
            const { data } = await api.get(`/products?search=${encodeURIComponent(value)}&isActive=true&limit=20`);
            setProducts(data.data || []);
        } catch (err) {
            console.error('Failed to search products', err);
        }
    }

    async function addItem(product) {
        if (!bill) {
            // Auto-create bill if not exists
            try {
                const draft = await api.post('/bills', { sessionId: session._id });
                setBill(draft.data);
                await addItemToBill(draft.data._id, product);
            } catch (err) {
                setError('Failed to create draft bill before adding item');
            }
        } else {
            await addItemToBill(bill._id, product);
        }
    }

    async function addItemToBill(billId, product) {
        try {
            const { data } = await api.post(`/bills/${billId}/items`, {
                sku: product.sku,
                quantity: 1,
            });
            setBill(data);
            setPaidAmount(data.grandTotalLKR.toString());
            setSearch('');
            setProducts([]);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add item');
        }
    }

    async function applyLineDiscount(lineId, discountLKR) {
        if (!bill) return;
        try {
            const { data } = await api.put(`/bills/${bill._id}/items/${lineId}`, {
                lineDiscountLKR: Number(discountLKR)
            });
            setBill(data);
            setPaidAmount(data.grandTotalLKR.toString());
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to apply discount');
        }
    }

    async function handleCustomerSearch(query) {
        setCustomerQuery(query);
        if (query.length < 3) {
            setCustomerResults([]);
            return;
        }
        try {
            const { data } = await api.get(`/customers/search?query=${encodeURIComponent(query)}`);
            setCustomerResults(data.data || []);
        } catch (err) {
            console.error('Failed to search customers', err);
        }
    }

    async function assignCustomerToBill(customerId) {
        if (!bill) return;
        try {
            const { data } = await api.post(`/bills/${bill._id}/customer`, { customerId });
            setBill(data);
            setIsCustomerSearchOpen(false);
            setCustomerQuery('');
            setCustomerResults([]);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to assign customer');
        }
    }

    async function submitTillEvent(e) {
        if (e) e.preventDefault();
        try {
            await api.post(`/sessions/events`, {
                eventType: tillEventType,
                amountLKR: Number(tillAmount),
                reason: tillReason
            });
            setIsTillModalOpen(false);
            setTillAmount('');
            setTillReason('');
            setMessage(`${tillEventType} recorded successfully`);
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to record event');
        }
    }

    async function closeShift(e) {
        if (e) e.preventDefault();
        if (!session) return;
        try {
            const { data } = await api.post(`/sessions/${session._id}/close`, {
                actualClosingCashLKR: Number(actualClosingCash)
            });
            setSession(null);
            setIsCloseShiftOpen(false);
            setActualClosingCash('');
            setMessage(`Shift closed with variance of ${money(data.varianceLKR)}`);
            setTimeout(() => setMessage(''), 5000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to close shift');
        }
    }

    async function checkout(e) {
        if (e) e.preventDefault();
        if (!bill) return;

        let billDiscountLKR = 0;
        if (billDiscountPercent > 0) {
            billDiscountLKR = bill.subtotalLKR * (billDiscountPercent / 100);
        }

        try {
            const { data } = await api.post(`/bills/${bill._id}/checkout`, {
                paymentMethod,
                paidAmountLKR: Number(paidAmount),
                billDiscountLKR,
                terminalId,
            });
            setMessage(data.printResult?.ok ? 'Checkout complete and printed' : `Checkout complete. Print issue: ${data.printResult?.message || 'unknown'}`);
            setLastBillId(data.bill?._id || '');
            setBill(null);
            setPaidAmount('');
            setIsCheckoutOpen(false);
            setBillDiscountPercent(0);

            setTimeout(() => setMessage(''), 5000);
        } catch (err) {
            setError(err.response?.data?.message || 'Checkout failed');
        }
    }

    async function reprintLastBill() {
        if (!lastBillId) return;
        try {
            await api.post(`/printing/reprint/${lastBillId}`, { terminalId });
            setMessage('Receipt reprinted');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Reprint failed');
        }
    }

    async function suspend() {
        if (!bill) return;
        try {
            await api.post(`/bills/${bill._id}/suspend`);
            setBill(null);
            setMessage('Bill suspended');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Suspend failed');
        }
    }

    if (!session) {
        return (
            <div className="flex h-full items-center justify-center">
                <Card className="w-full max-w-md shadow-lg border-slate-200">
                    <CardHeader className="text-center pb-4">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
                            <UserCircle2 className="h-8 w-8 text-indigo-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Open Register</CardTitle>
                        <p className="text-sm text-slate-500">You must open a shift before you can access the cashier.</p>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={openSession}>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Terminal ID</label>
                                <Input value={terminalId} onChange={(e) => setTerminalId(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Opening Float (LKR)</label>
                                <Input type="number" min="0" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} required />
                            </div>
                            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                            <Button type="submit" className="w-full py-6 text-lg" size="lg">Open Shift</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col lg:flex-row gap-4 lg:gap-8 p-4 md:p-6 lg:p-8 max-w-[1920px] mx-auto">

            {/* Left Side: Product Search & Grid */}
            <div className="flex flex-1 flex-col space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Terminal: {session.terminalId}</h2>
                        <p className="text-sm text-slate-500">Business Date: {new Date(session.businessDate).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Dialog open={isTillModalOpen} onOpenChange={setIsTillModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100">
                                    <Wallet className="mr-2 h-4 w-4" />
                                    Till Event
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Record Till Event</DialogTitle>
                                    <DialogDescription>
                                        Record cash drops or payouts without closing the shift.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={submitTillEvent} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Event Type</label>
                                        <Select value={tillEventType} onValueChange={setTillEventType}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DROP">Cash Drop</SelectItem>
                                                <SelectItem value="PAYOUT">Payout</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Amount (LKR)</label>
                                        <Input type="number" min="1" value={tillAmount} onChange={e => setTillAmount(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Reason</label>
                                        <Input value={tillReason} onChange={e => setTillReason(e.target.value)} required />
                                    </div>
                                    <Button type="submit" className="w-full">Record {tillEventType}</Button>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isCloseShiftOpen} onOpenChange={setIsCloseShiftOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700">
                                    Close Shift
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Close Shift</DialogTitle>
                                    <DialogDescription>
                                        Enter the actual cash amount currently in the drawer.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={closeShift} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Actual Cash in Drawer (LKR)</label>
                                        <Input type="number" min="0" value={actualClosingCash} onChange={e => setActualClosingCash(e.target.value)} required />
                                        <p className="text-xs text-slate-500">The system variance will be calculated automatically.</p>
                                    </div>
                                    <Button type="submit" variant="destructive" className="w-full">Confirm Close Shift</Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <Card className="border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                    <div className="border-b border-slate-200 p-4 bg-slate-50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(e) => searchProducts(e.target.value)}
                                placeholder="Scan barcode or type to search products..."
                                className="pl-12 h-14 md:h-16 text-lg md:text-xl md:pl-14 bg-white border-slate-300 shadow-sm rounded-xl"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto p-4 md:p-6">
                        {products.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                                {products.map((product) => (
                                    <div
                                        key={product._id}
                                        onClick={() => addItem(product)}
                                        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-indigo-600 hover:shadow-md hover:ring-1 hover:ring-indigo-600"
                                    >
                                        <div className="mb-2 flex h-20 items-center justify-center rounded-lg bg-slate-50 group-hover:bg-indigo-50 transition-colors">
                                            <Package className="h-8 w-8 text-slate-400 group-hover:text-indigo-500" />
                                        </div>
                                        <div className="space-y-1 md:space-y-2 mt-2">
                                            <h3 className="font-semibold text-slate-900 md:text-lg line-clamp-2 leading-tight">{product.productName}</h3>
                                            <p className="text-xs md:text-sm text-slate-500 family-mono">{product.sku}</p>
                                            <p className="font-bold text-indigo-700 md:text-xl mt-2">{money(product.baseUnitPriceLKR)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : search.length > 1 ? (
                            <div className="flex h-full flex-col items-center justify-center text-slate-500 space-y-4">
                                <Search className="h-12 w-12 text-slate-300" />
                                <p className="text-lg">No products found matching "{search}"</p>
                            </div>
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center text-slate-400 space-y-4">
                                <Box className="h-16 w-16 text-slate-200" />
                                <p className="text-lg font-medium text-slate-500">Scan or search to add items</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Right Side: Cart / Checkout Window */}
            <div className="w-full lg:w-[450px] xl:w-[500px] flex flex-col space-y-4">

                {/* Status Messages */}
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
                {lastBillId && !bill && !error && !message && (
                    <Button variant="outline" className="w-full" onClick={reprintLastBill}>
                        <Printer className="mr-2 h-4 w-4" />
                        Reprint Last Receipt
                    </Button>
                )}

                <Card className="flex-1 flex flex-col shadow-lg border-slate-200 overflow-hidden bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
                            <ShoppingCart className="h-5 w-5 text-indigo-600" />
                            Current Order
                        </div>
                        {bill && (
                            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                                {bill.status}
                            </span>
                        )}
                    </div>

                    {bill && (
                        <div className="border-b border-slate-100 bg-white p-3">
                            {bill.customerId ? (
                                <div className="flex items-center justify-between rounded-lg bg-indigo-50 p-3 border border-indigo-100">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                            <Users className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{bill.customerId.name}</p>
                                            <p className="text-xs text-indigo-700 font-medium">{bill.customerId.loyaltyPoints} Points</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => assignCustomerToBill(null)} className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                                        Remove
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            placeholder="Search customer by name or phone..."
                                            value={customerQuery}
                                            onChange={(e) => handleCustomerSearch(e.target.value)}
                                            onFocus={() => setIsCustomerSearchOpen(true)}
                                            className="pl-9 h-10 text-sm bg-slate-50"
                                        />
                                    </div>
                                    {isCustomerSearchOpen && customerResults.length > 0 && (
                                        <div className="absolute z-10 w-full lg:w-[450px] xl:w-[500px] mt-1 rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden">
                                            {customerResults.map(customer => (
                                                <div
                                                    key={customer._id}
                                                    onClick={() => assignCustomerToBill(customer._id)}
                                                    className="px-4 py-3 hover:bg-indigo-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0"
                                                >
                                                    <div>
                                                        <p className="font-medium text-sm text-slate-900">{customer.name}</p>
                                                        <p className="text-xs text-slate-500">{customer.phone}</p>
                                                    </div>
                                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">{customer.loyaltyPoints} pts</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex-1 overflow-auto p-2 bg-slate-50/50 relative">
                        {!bill || bill.items.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-slate-400 space-y-3">
                                <ShoppingCart className="h-12 w-12 text-slate-200" />
                                <p>Cart is empty</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {bill.items.map((item) => (
                                    <div key={item._id} className="flex flex-col rounded-xl mb-3 bg-white p-4 shadow-sm border border-slate-100 touch-manipulation">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className="truncate font-bold text-slate-900 md:text-lg text-base">{item.productName}</p>
                                                <p className="text-sm md:text-base text-slate-500 mt-1">{money(item.unitPriceLKR)} × {item.quantity}</p>
                                            </div>
                                            <div className="text-right font-black text-slate-900 md:text-xl text-lg">
                                                {money(item.unitPriceLKR * item.quantity)}
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2 border-t border-slate-50 pt-3">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Discount (LKR):</label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max={item.unitPriceLKR * item.quantity}
                                                value={item.lineDiscountLKR || ''}
                                                onChange={(e) => applyLineDiscount(item._id, e.target.value)}
                                                className="h-8 w-24 text-sm text-right"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-200 bg-white p-6 space-y-5">
                        <div className="space-y-3 text-base md:text-lg">
                            <div className="flex justify-between font-medium text-slate-600">
                                <span>Subtotal</span>
                                <span>{money(bill?.subtotalLKR || 0)}</span>
                            </div>
                            <div className="flex justify-between font-medium text-slate-600">
                                <span>Tax</span>
                                <span>{money(bill?.taxLKR || 0)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-100 pt-4 text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                                <span>Total</span>
                                <span className="text-indigo-600">{money(bill?.grandTotalLKR || 0)}</span>
                            </div>
                        </div>

                        {bill && bill.items.length > 0 && (
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <Button variant="outline" size="lg" className="w-full hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200" onClick={suspend}>
                                    Suspend
                                </Button>

                                <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="lg" className="w-full h-14 md:h-16 md:text-xl text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md active:scale-95 transition-transform touch-none">
                                            Charge {money(bill.grandTotalLKR)}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-xl md:p-8">
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl md:text-3xl font-black flex items-center gap-3">
                                                <CreditCard className="h-6 w-6 text-indigo-600" />
                                                Checkout
                                            </DialogTitle>
                                            <DialogDescription>
                                                Complete payment to finalize the transaction.
                                            </DialogDescription>
                                        </DialogHeader>

                                        <form onSubmit={checkout} className="space-y-6 py-4">
                                            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200">
                                                    <span className="font-semibold text-slate-600">Bill Discount (%)</span>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={billDiscountPercent}
                                                        onChange={(e) => setBillDiscountPercent(Number(e.target.value))}
                                                        className="w-24 text-right font-bold text-lg"
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center text-lg pt-2 border-t border-slate-200">
                                                    <span className="font-bold text-slate-700">Final Amount Due</span>
                                                    <span className="text-3xl font-black text-indigo-700">
                                                        {money(Math.max(0, bill.grandTotalLKR - (bill.subtotalLKR * (billDiscountPercent / 100))))}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-base md:text-lg font-bold text-slate-700">Payment Method</label>
                                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                                    <SelectTrigger className="h-14 md:h-16 text-lg md:text-xl font-medium border-slate-300 rounded-xl">
                                                        <SelectValue placeholder="Select method" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="cash">Cash</SelectItem>
                                                        <SelectItem value="card">Credit / Debit Card</SelectItem>
                                                        <SelectItem value="digital">Mobile Payment / QR</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {paymentMethod === 'cash' && (
                                                <div className="space-y-3 pt-2">
                                                    <label className="text-base md:text-lg font-bold text-slate-700">Tendered Amount (LKR)</label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min={Math.max(0, bill.grandTotalLKR - (bill.subtotalLKR * (billDiscountPercent / 100)))}
                                                        value={paidAmount}
                                                        onChange={(e) => setPaidAmount(e.target.value)}
                                                        className="h-16 md:h-20 text-3xl md:text-4xl rounded-xl font-black border-slate-300 placeholder:text-slate-300 text-center"
                                                        placeholder="0.00"
                                                        required
                                                    />
                                                    {Number(paidAmount) > (bill.grandTotalLKR - (bill.subtotalLKR * (billDiscountPercent / 100))) && (
                                                        <div className="flex justify-between items-center pt-2 text-rose-600 font-semibold px-1">
                                                            <span>Change Due</span>
                                                            <span className="text-xl">{money(Number(paidAmount) - (bill.grandTotalLKR - (bill.subtotalLKR * (billDiscountPercent / 100))))}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <Button type="submit" size="lg" className="w-full h-16 md:h-20 text-xl font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-transform touch-none mt-4">
                                                <CheckCircle2 className="mr-3 h-6 w-6" />
                                                Confirm Payment
                                            </Button>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        )}
                        {(!bill || bill.items.length === 0) && (
                            <Button size="lg" className="w-full h-16 md:h-20 text-xl font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white active:scale-95 transition-transform touch-none" onClick={createDraftBill}>
                                <FileText className="mr-3 h-6 w-6" />
                                Start New Order
                            </Button>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
