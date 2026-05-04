import { useEffect, useState } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../components/ui/dialog';
import { Box, Plus, Pencil, Power, PowerOff, CheckCircle2, Ban } from 'lucide-react';

const defaultForm = {
    sku: '',
    barcode: '',
    productName: '',
    category: '',
    brand: '',
    unitSize: '',
    baseUnitPriceLKR: '',
    unitCostLKR: '',
    taxRate: '',
    supplier: '',
    reorderLevel: '',
    reorderQty: '',
    typicalShelfLifeDays: '',
    caseSize: '',
    maxShelfCapacityUnits: '',
    widthCm: '',
    heightCm: '',
    depthCm: '',
    minFacings: '',
    maxFacings: '',
};

function money(value) {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(value || 0);
}

export default function ProductsPage() {
    const [rows, setRows] = useState([]);
    const [form, setForm] = useState(defaultForm);
    const [editingId, setEditingId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    async function load() {
        setIsLoading(true);
        try {
            const { data } = await api.get('/products?limit=500');
            setRows(data.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load products');
        } finally {
            setIsLoading(false);
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
        setError('');
        try {
            const payload = {
                ...form,
                baseUnitPriceLKR: Number(form.baseUnitPriceLKR),
                unitCostLKR: Number(form.unitCostLKR),
                taxRate: Number(form.taxRate),
                reorderLevel: Number(form.reorderLevel),
                reorderQty: Number(form.reorderQty),
                typicalShelfLifeDays: Number(form.typicalShelfLifeDays),
                caseSize: Number(form.caseSize),
                maxShelfCapacityUnits: Number(form.maxShelfCapacityUnits),
                widthCm: Number(form.widthCm),
                heightCm: Number(form.heightCm),
                depthCm: Number(form.depthCm),
                minFacings: Number(form.minFacings),
                maxFacings: Number(form.maxFacings),
            };
            if (editingId) {
                await api.put(`/products/${editingId}`, payload);
                setMessage('Product updated successfully!');
            } else {
                await api.post('/products', payload);
                setMessage('Product created successfully!');
            }
            closeModal();
            await load();
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save product');
        }
    }

    function startEdit(product) {
        setEditingId(product._id);
        setError('');
        setForm({
            sku: product.sku,
            barcode: product.barcode || '',
            productName: product.productName,
            category: product.category || '',
            brand: product.brand || '',
            unitSize: product.unitSize || '',
            baseUnitPriceLKR: product.baseUnitPriceLKR || '',
            unitCostLKR: product.unitCostLKR || '',
            taxRate: product.taxRate || '',
            supplier: product.supplier || '',
            reorderLevel: product.reorderLevel || '',
            reorderQty: product.reorderQty || '',
            typicalShelfLifeDays: product.typicalShelfLifeDays || '',
            caseSize: product.caseSize || '',
            maxShelfCapacityUnits: product.maxShelfCapacityUnits || '',
            widthCm: product.widthCm || '',
            heightCm: product.heightCm || '',
            depthCm: product.depthCm || '',
            minFacings: product.minFacings || '',
            maxFacings: product.maxFacings || '',
        });
        setIsModalOpen(true);
    }

    function openNewModal() {
        setEditingId(null);
        setError('');
        setForm(defaultForm);
        setIsModalOpen(true);
    }

    function closeModal() {
        setIsModalOpen(false);
        setEditingId(null);
        setForm(defaultForm);
        setError('');
    }

    async function toggleStatus(id) {
        try {
            await api.patch(`/products/${id}/status`);
            await load();
            setMessage('Product status toggled');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError('Failed to toggle status');
        }
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 lg:p-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Products Catalog</h2>
                    <p className="text-sm text-slate-500">Manage your store's items, pricing, and details.</p>
                </div>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 font-semibold shadow-sm" onClick={openNewModal}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Product
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <Box className="h-5 w-5 text-indigo-600" />
                                {editingId ? 'Edit Product' : 'Create New Product'}
                            </DialogTitle>
                        </DialogHeader>

                        {error && (
                            <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-700 font-medium flex items-center gap-2">
                                <Ban className="h-4 w-4" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-6 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-100 pb-6">
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-semibold text-slate-700">Product Name *</label>
                                    <Input
                                        required
                                        value={form.productName}
                                        onChange={(e) => patchField('productName', e.target.value)}
                                        placeholder="e.g. Vanilla Ice Cream"
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">SKU Code *</label>
                                    <Input
                                        required
                                        disabled={!!editingId} // Cannot edit SKU once created
                                        value={form.sku}
                                        onChange={(e) => patchField('sku', e.target.value)}
                                        placeholder="e.g. ICE-001"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Barcode</label>
                                    <Input
                                        value={form.barcode}
                                        onChange={(e) => patchField('barcode', e.target.value)}
                                        placeholder="Scan barcode"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Category</label>
                                    <Input
                                        value={form.category}
                                        onChange={(e) => patchField('category', e.target.value)}
                                        placeholder="e.g. Frozen"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Brand</label>
                                    <Input
                                        value={form.brand}
                                        onChange={(e) => patchField('brand', e.target.value)}
                                        placeholder="e.g. Nestle"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-100 pb-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Selling Price (LKR) *</label>
                                    <Input
                                        required
                                        type="number" step="0.01" min="0"
                                        value={form.baseUnitPriceLKR}
                                        onChange={(e) => patchField('baseUnitPriceLKR', e.target.value)}
                                        className="text-lg font-medium text-indigo-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Unit Cost (LKR)</label>
                                    <Input
                                        type="number" step="0.01" min="0"
                                        value={form.unitCostLKR}
                                        onChange={(e) => patchField('unitCostLKR', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Tax Rate (%)</label>
                                    <Input
                                        type="number" step="0.01" min="0"
                                        value={form.taxRate}
                                        onChange={(e) => patchField('taxRate', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Supplier</label>
                                    <Input
                                        value={form.supplier}
                                        onChange={(e) => patchField('supplier', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-100 pb-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Width (cm) *</label>
                                    <Input
                                        required type="number" step="0.01" min="0" value={form.widthCm}
                                        onChange={(e) => patchField('widthCm', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Height (cm) *</label>
                                    <Input
                                        required type="number" step="0.01" min="0" value={form.heightCm}
                                        onChange={(e) => patchField('heightCm', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Depth (cm) *</label>
                                    <Input
                                        required type="number" step="0.01" min="0" value={form.depthCm}
                                        onChange={(e) => patchField('depthCm', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Reorder Level</label>
                                    <Input
                                        type="number" min="0" value={form.reorderLevel}
                                        onChange={(e) => patchField('reorderLevel', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Reorder Qty</label>
                                    <Input
                                        type="number" min="0" value={form.reorderQty}
                                        onChange={(e) => patchField('reorderQty', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Shelf Life (Days)</label>
                                    <Input
                                        type="number" min="0" value={form.typicalShelfLifeDays}
                                        onChange={(e) => patchField('typicalShelfLifeDays', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Case Size</label>
                                    <Input
                                        type="number" min="1" value={form.caseSize}
                                        onChange={(e) => patchField('caseSize', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Max Cap.</label>
                                    <Input
                                        type="number" min="0" value={form.maxShelfCapacityUnits}
                                        onChange={(e) => patchField('maxShelfCapacityUnits', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Min Facings</label>
                                    <Input
                                        type="number" min="1" value={form.minFacings}
                                        onChange={(e) => patchField('minFacings', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Max Facings</label>
                                    <Input
                                        type="number" min="1" value={form.maxFacings}
                                        onChange={(e) => patchField('maxFacings', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                                    {editingId ? 'Save Changes' : 'Create Product'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {message && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-emerald-800 border border-emerald-200 animate-in slide-in-from-top-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="text-sm font-medium">{message}</p>
                </div>
            )
            }

            {
                error && !isModalOpen && (
                    <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-rose-800 border border-rose-200 animate-in slide-in-from-top-2">
                        <Ban className="h-5 w-5" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )
            }

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-sm font-semibold text-slate-600">All Products Directory</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50">
                                <TableHead className="w-[120px] font-semibold">SKU</TableHead>
                                <TableHead className="font-semibold">Product Name</TableHead>
                                <TableHead className="font-semibold">Category</TableHead>
                                <TableHead className="text-right font-semibold">Selling Price</TableHead>
                                <TableHead className="text-center font-semibold w-[120px]">Status</TableHead>
                                <TableHead className="text-right font-semibold w-[150px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><div className="h-5 w-16 animate-pulse rounded bg-slate-200"></div></TableCell>
                                        <TableCell><div className="h-5 w-48 animate-pulse rounded bg-slate-200"></div></TableCell>
                                        <TableCell><div className="h-5 w-24 animate-pulse rounded bg-slate-200"></div></TableCell>
                                        <TableCell><div className="h-5 w-16 animate-pulse rounded bg-slate-200 ml-auto"></div></TableCell>
                                        <TableCell><div className="h-5 w-16 animate-pulse rounded bg-slate-200 mx-auto"></div></TableCell>
                                        <TableCell><div className="h-8 w-20 animate-pulse rounded bg-slate-200 ml-auto"></div></TableCell>
                                    </TableRow>
                                ))
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                        No products found in the database.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((row) => (
                                    <TableRow key={row._id} className={!row.isActive ? "opacity-60 bg-slate-50" : ""}>
                                        <TableCell className="font-medium font-mono text-xs">{row.sku}</TableCell>
                                        <TableCell className="font-semibold text-slate-800">{row.productName}</TableCell>
                                        <TableCell className="text-slate-500 text-sm">{row.category || '-'}</TableCell>
                                        <TableCell className="text-right font-medium text-slate-900">{money(row.baseUnitPriceLKR)}</TableCell>
                                        <TableCell className="text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${row.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                                {row.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                                                    onClick={() => startEdit(row)}
                                                    title="Edit Product"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className={`h-8 w-8 border-slate-200 ${row.isActive ? 'text-rose-600 hover:bg-rose-50 hover:border-rose-200' : 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200'}`}
                                                    onClick={() => toggleStatus(row._id)}
                                                    title={row.isActive ? 'Deactivate' : 'Activate'}
                                                >
                                                    {row.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div >
    );
}
