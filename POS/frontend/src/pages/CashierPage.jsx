import { useEffect, useState } from 'react';
import api from '../services/api';
import Panel from '../components/ui/Panel';

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
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [paidAmount, setPaidAmount] = useState(0);
    const [lastBillId, setLastBillId] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    async function loadCurrentSession() {
        const { data } = await api.get('/sessions/current');
        setSession(data.session);
    }

    useEffect(() => {
        loadCurrentSession().catch((err) => setError(err.response?.data?.message || 'Failed to load session'));
    }, []);

    async function openSession(event) {
        event.preventDefault();
        try {
            const { data } = await api.post('/sessions/open', {
                terminalId,
                openingFloatLKR: Number(openingFloat),
            });
            setSession(data);
            setMessage('Shift opened');
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
            setPaidAmount(0);
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
        const { data } = await api.get(`/products?search=${encodeURIComponent(value)}&isActive=true&limit=20`);
        setProducts(data.data || []);
    }

    async function addItem(product) {
        if (!bill) return;
        try {
            const { data } = await api.post(`/bills/${bill._id}/items`, {
                sku: product.sku,
                quantity: 1,
            });
            setBill(data);
            setPaidAmount(data.grandTotalLKR || 0);
            setSearch('');
            setProducts([]);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add item');
        }
    }

    async function checkout() {
        if (!bill) return;
        try {
            const { data } = await api.post(`/bills/${bill._id}/checkout`, {
                paymentMethod,
                paidAmountLKR: Number(paidAmount),
                terminalId,
            });
            setMessage(data.printResult?.ok ? 'Checkout complete and printed' : `Checkout complete. Print issue: ${data.printResult?.message || 'unknown'}`);
            setLastBillId(data.bill?._id || '');
            setBill(null);
            setPaidAmount(0);
        } catch (err) {
            setError(err.response?.data?.message || 'Checkout failed');
        }
    }

    async function reprintLastBill() {
        if (!lastBillId) return;
        try {
            await api.post(`/printing/reprint/${lastBillId}`, { terminalId });
            setMessage('Receipt reprinted');
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
        } catch (err) {
            setError(err.response?.data?.message || 'Suspend failed');
        }
    }

    return (
        <div className="grid gap-4 xl:grid-cols-3">
            <div className="space-y-4 xl:col-span-2">
                {!session ? (
                    <Panel title="Open Shift">
                        <form className="grid gap-3 md:grid-cols-3" onSubmit={openSession}>
                            <input value={terminalId} onChange={(e) => setTerminalId(e.target.value)} placeholder="Terminal ID" className="rounded-md border border-slate-300 px-3 py-2" />
                            <input value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} type="number" placeholder="Opening Float" className="rounded-md border border-slate-300 px-3 py-2" />
                            <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-white">Open Shift</button>
                        </form>
                    </Panel>
                ) : (
                    <Panel title={`Shift Open (${session.terminalId})`}>
                        <div className="flex flex-wrap gap-3">
                            <button type="button" onClick={createDraftBill} className="rounded-md bg-brand-600 px-4 py-2 text-white">
                                Start New Bill
                            </button>
                            <p className="text-sm text-slate-600">Business Date: {session.businessDate}</p>
                        </div>
                    </Panel>
                )}

                <Panel title="Product Search">
                    <input
                        value={search}
                        onChange={(e) => searchProducts(e.target.value)}
                        placeholder="Scan barcode or search product"
                        className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                    <div className="max-h-56 space-y-2 overflow-auto">
                        {products.map((product) => (
                            <button
                                key={product._id}
                                type="button"
                                onClick={() => addItem(product)}
                                className="flex w-full items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
                            >
                                <span>
                                    <span className="block font-medium">{product.productName}</span>
                                    <span className="text-xs text-slate-500">{product.sku}</span>
                                </span>
                                <span>{money(product.baseUnitPriceLKR)}</span>
                            </button>
                        ))}
                    </div>
                </Panel>
            </div>

            <div className="space-y-4">
                <Panel title="Current Bill">
                    {!bill ? (
                        <p className="text-sm text-slate-500">Create a bill to begin checkout.</p>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-500">Status: {bill.status}</p>
                            <div className="max-h-52 space-y-2 overflow-auto">
                                {bill.items.map((item) => (
                                    <div key={item._id} className="rounded-md border border-slate-200 p-2 text-sm">
                                        <p className="font-medium">{item.productName}</p>
                                        <p className="text-xs text-slate-500">{item.quantity} x {money(item.unitPriceLKR)}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="text-sm">
                                <p>Subtotal: {money(bill.subtotalLKR)}</p>
                                <p>Tax: {money(bill.taxLKR)}</p>
                                <p className="font-semibold">Total: {money(bill.grandTotalLKR)}</p>
                            </div>
                            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="digital">Digital</option>
                            </select>
                            <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Paid Amount" />
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={checkout} className="rounded-md bg-brand-600 px-3 py-2 text-white">Checkout</button>
                                <button type="button" onClick={suspend} className="rounded-md bg-slate-700 px-3 py-2 text-white">Suspend</button>
                            </div>
                        </div>
                    )}
                </Panel>
                {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
                {error ? <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
                {lastBillId ? (
                    <button type="button" onClick={reprintLastBill} className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                        Reprint Last Receipt
                    </button>
                ) : null}
            </div>
        </div>
    );
}
