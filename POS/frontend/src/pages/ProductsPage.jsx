import { useEffect, useState } from 'react';
import api from '../services/api';
import Panel from '../components/ui/Panel';

const defaultForm = {
    sku: '',
    barcode: '',
    productName: '',
    category: '',
    brand: '',
    unitSize: '',
    baseUnitPriceLKR: 0,
    unitCostLKR: 0,
    taxRate: 0,
    supplier: '',
    reorderLevel: 0,
    reorderQty: 0,
};

export default function ProductsPage() {
    const [rows, setRows] = useState([]);
    const [form, setForm] = useState(defaultForm);
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    async function load() {
        try {
            const { data } = await api.get('/products?limit=500');
            setRows(data.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load products');
        }
    }

    useEffect(() => {
        load();
    }, []);

    function patchField(name, value) {
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    async function submit(event) {
        event.preventDefault();
        try {
            const payload = {
                ...form,
                baseUnitPriceLKR: Number(form.baseUnitPriceLKR),
                unitCostLKR: Number(form.unitCostLKR),
                taxRate: Number(form.taxRate),
                reorderLevel: Number(form.reorderLevel),
                reorderQty: Number(form.reorderQty),
            };
            if (editingId) {
                await api.put(`/products/${editingId}`, payload);
                setMessage('Product updated');
            } else {
                await api.post('/products', payload);
                setMessage('Product created');
            }
            setForm(defaultForm);
            setEditingId(null);
            await load();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save product');
        }
    }

    function startEdit(product) {
        setEditingId(product._id);
        setForm({
            sku: product.sku,
            barcode: product.barcode || '',
            productName: product.productName,
            category: product.category || '',
            brand: product.brand || '',
            unitSize: product.unitSize || '',
            baseUnitPriceLKR: product.baseUnitPriceLKR || 0,
            unitCostLKR: product.unitCostLKR || 0,
            taxRate: product.taxRate || 0,
            supplier: product.supplier || '',
            reorderLevel: product.reorderLevel || 0,
            reorderQty: product.reorderQty || 0,
        });
    }

    async function toggleStatus(id) {
        await api.patch(`/products/${id}/status`);
        await load();
    }

    return (
        <div className="grid gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
                <Panel title="Product Catalog">
                    {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
                    {message ? <p className="mb-3 text-sm text-emerald-700">{message}</p> : null}
                    <div className="overflow-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                                    <th className="py-2 pr-2">SKU</th>
                                    <th className="py-2 pr-2">Product</th>
                                    <th className="py-2 pr-2">Price</th>
                                    <th className="py-2 pr-2">Status</th>
                                    <th className="py-2 pr-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row._id} className="border-b border-slate-100">
                                        <td className="py-2 pr-2">{row.sku}</td>
                                        <td className="py-2 pr-2">{row.productName}</td>
                                        <td className="py-2 pr-2">{row.baseUnitPriceLKR}</td>
                                        <td className="py-2 pr-2">{row.isActive ? 'Active' : 'Inactive'}</td>
                                        <td className="py-2 pr-2">
                                            <div className="flex gap-2">
                                                <button type="button" className="rounded bg-slate-800 px-2 py-1 text-xs text-white" onClick={() => startEdit(row)}>
                                                    Edit
                                                </button>
                                                <button type="button" className="rounded bg-rose-600 px-2 py-1 text-xs text-white" onClick={() => toggleStatus(row._id)}>
                                                    Toggle
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            </div>
            <div>
                <Panel title={editingId ? 'Edit Product' : 'Add Product'}>
                    <form className="space-y-2" onSubmit={submit}>
                        {Object.keys(defaultForm).map((key) => (
                            <input
                                key={key}
                                type={typeof defaultForm[key] === 'number' ? 'number' : 'text'}
                                step={typeof defaultForm[key] === 'number' ? '0.01' : undefined}
                                disabled={editingId && key === 'sku'}
                                value={form[key]}
                                onChange={(e) => patchField(key, e.target.value)}
                                placeholder={key}
                                className="w-full rounded-md border border-slate-300 px-3 py-2"
                            />
                        ))}
                        <button type="submit" className="w-full rounded-md bg-brand-600 px-3 py-2 text-white">
                            {editingId ? 'Update Product' : 'Create Product'}
                        </button>
                    </form>
                </Panel>
            </div>
        </div>
    );
}
