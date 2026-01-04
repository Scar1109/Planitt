import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import ProductDrawer from './ProductDrawer';
import { FaSearch, FaPlus, FaFileUpload, FaFilter, FaBoxOpen, FaExclamationCircle, FaCheckCircle } from 'react-icons/fa';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [brandFilter, setBrandFilter] = useState('');

    // Metadata for filters
    const [metadata, setMetadata] = useState({ categories: [], brands: [] });

    // Fetch Data
    const fetchProducts = async () => {
        try {
            setLoading(true);
            const res = await api.get('/products', {
                params: {
                    search: searchTerm,
                    category: categoryFilter,
                    brand: brandFilter,
                    isActive: true
                }
            });
            setProducts(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch products:", error);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchMetadata = async () => {
        try {
            const res = await api.get('/products/metadata');
            setMetadata(res.data);
        } catch (error) {
            console.error("Metadata fetch failed", error);
        }
    };

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchProducts();
        }, 300); // Debounce search
        return () => clearTimeout(timeout);
    }, [searchTerm, categoryFilter, brandFilter]);

    // Actions
    const handleRowClick = (product) => {
        setSelectedProduct(product);
        setIsDrawerOpen(true);
    };

    const handleAdd = () => {
        setSelectedProduct(null); // New Product
        setIsDrawerOpen(true);
    };

    const handleSave = async (productData) => {
        try {
            if (productData._id) {
                await api.put(`/products/${productData._id}`, productData);
            } else {
                await api.post('/products', productData);
            }
            setIsDrawerOpen(false);
            fetchProducts(); // Refresh
            fetchMetadata(); // Refresh filters if new cat/brand added
        } catch (error) {
            console.error("Save failed:", error);
            alert("Failed to save product.");
        }
    };

    const handleDeactivate = async (id) => {
        if (!id) return;
        if (window.confirm("Are you sure you want to deactivate this product?")) {
            try {
                await api.delete(`/products/${id}`);
                setIsDrawerOpen(false);
                fetchProducts();
            } catch (error) {
                console.error("Deactivate failed:", error);
            }
        }
    };

    // Helper: Shelf Fit Logic (Mock implementation based on product width and shelf depth heuristic)
    const getShelfFitStatus = (p) => {
        if (p.depthCm > 60) return { text: "Too Deep", color: "text-red-500" };
        if (p.heightCm > 50) return { text: "Tall Item", color: "text-orange-500" };
        return { text: "Fits All", color: "text-green-600" };
    };

    // Helper: Status Badge
    const getStatusBadge = (p) => {
        if (!p.widthCm || !p.heightCm || !p.depthCm) return <span className="flex items-center gap-1 text-red-500 font-bold text-xs"><FaExclamationCircle /> Missing Dims</span>;
        if (p.minFacings > p.maxFacings) return <span className="flex items-center gap-1 text-orange-500 font-bold text-xs"><FaExclamationCircle /> Bad Config</span>;
        return <span className="flex items-center gap-1 text-green-600 font-bold text-xs"><FaCheckCircle /> Ready</span>;
    };

    return (
        <div className="flex h-full bg-slate-50 overscroll-none overflow-hidden">
            {/* Main Content (Product List) */}
            <div className="flex-1 flex flex-col h-full transition-all duration-300">

                {/* Top Bar */}
                <div className="bg-white border-b border-slate-200 p-4 shadow-sm z-10">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">

                        {/* Search & Filters */}
                        <div className="flex gap-2 flex-1 w-full md:w-auto">
                            <div className="relative flex-1 max-w-md">
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                                    placeholder="Search by SKU or Name..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <select
                                className="border border-slate-200 rounded-lg px-3 py-2 text-sm max-w-[150px] outline-none"
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                            >
                                <option value="">All Categories</option>
                                {metadata.categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>

                            <select
                                className="border border-slate-200 rounded-lg px-3 py-2 text-sm max-w-[150px] outline-none"
                                value={brandFilter}
                                onChange={e => setBrandFilter(e.target.value)}
                            >
                                <option value="">All Brands</option>
                                {metadata.brands.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button className="text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-slate-200 bg-white">
                                <FaFileUpload /> Import CSV
                            </button>
                            <button
                                onClick={handleAdd}
                                className="bg-slate-800 text-white hover:bg-slate-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-slate-200 transition-all"
                            >
                                <FaPlus /> Add Product
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table Container */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64 text-slate-400">Loading products...</div>
                    ) : products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                            <FaBoxOpen size={32} className="mb-2 opacity-50" />
                            <p>No products found.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3 border-b">SKU</th>
                                        <th className="px-6 py-3 border-b">Name</th>
                                        <th className="px-6 py-3 border-b">Category</th>
                                        <th className="px-6 py-3 border-b">Brand</th>
                                        <th className="px-6 py-3 border-b text-center">Dims (cm)</th>
                                        <th className="px-6 py-3 border-b">Facings</th>
                                        <th className="px-6 py-3 border-b">Shelf Fit</th>
                                        <th className="px-6 py-3 border-b text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-100">
                                    {products.map(p => {
                                        const fit = getShelfFitStatus(p);
                                        return (
                                            <tr
                                                key={p._id}
                                                onClick={() => handleRowClick(p)}
                                                className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                                            >
                                                <td className="px-6 py-3 font-mono text-slate-600">{p.sku}</td>
                                                <td className="px-6 py-3 font-medium text-slate-800 group-hover:text-indigo-600">{p.productName}</td>
                                                <td className="px-6 py-3 text-slate-600">
                                                    <span className="px-2 py-1 bg-slate-100 rounded text-xs">{p.category}</span>
                                                </td>
                                                <td className="px-6 py-3 text-slate-600">{p.brand}</td>
                                                <td className="px-6 py-3 text-center text-slate-500 text-xs">
                                                    {p.widthCm}x{p.heightCm}x{p.depthCm}
                                                </td>
                                                <td className="px-6 py-3 text-slate-600 text-xs">
                                                    {p.minFacings} - {p.maxFacings}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className={`text-xs font-medium ${fit.color}`}>{fit.text}</span>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    {getStatusBadge(p)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel Drawer */}
            <ProductDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                product={selectedProduct}
                onSave={handleSave}
                onDeactivate={handleDeactivate}
            />
        </div>
    );
};

export default Products;
