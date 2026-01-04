import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaTrash, FaExclamationTriangle } from 'react-icons/fa';

const ProductDrawer = ({ isOpen, onClose, product, onSave, onDeactivate }) => {
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});

    // Initialize form
    useEffect(() => {
        if (product) {
            setFormData({ ...product });
        } else {
            setFormData({
                productName: '',
                sku: '',
                category: 'General',
                brand: '',
                widthCm: 0,
                heightCm: 0,
                depthCm: 0,
                minFacings: 1,
                maxFacings: 10,
                baseUnitPriceLKR: 0,
                unitCostLKR: 0,
                allowedTags: [],
                priorityScore: 0,
                isActive: true
            });
        }
    }, [product, isOpen]);

    // --- Validation Logic ---
    useEffect(() => {
        const newErrors = {};
        if (formData.minFacings > formData.maxFacings) newErrors.facings = "Min Facings cannot exceed Max Facings";

        setErrors(newErrors);
    }, [formData.minFacings, formData.maxFacings, formData.widthCm]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value
        }));
    };

    const handleTagChange = (e) => {
        const val = e.target.value;
        if (val && !formData.allowedTags?.includes(val)) {
            setFormData(prev => ({ ...prev, allowedTags: [...(prev.allowedTags || []), val] }));
        }
    };

    const removeTag = (tag) => {
        setFormData(prev => ({ ...prev, allowedTags: prev.allowedTags.filter(t => t !== tag) }));
    };

    // --- Computed ---
    const margin = formData.baseUnitPriceLKR && formData.unitCostLKR
        ? ((formData.baseUnitPriceLKR - formData.unitCostLKR) / formData.baseUnitPriceLKR * 100).toFixed(1)
        : 0;

    let marginClass = 'bg-slate-100 text-slate-600';
    if (margin > 30) marginClass = 'bg-green-100 text-green-700';
    else if (margin < 10) marginClass = 'bg-red-100 text-red-700'; // Low margin warning
    else marginClass = 'bg-amber-100 text-amber-700';

    // Visual Scaling - Increased for larger modal
    const pxScale = 5; // 1cm = 5px (was 3)
    const prodWidthPx = (formData.widthCm || 5) * pxScale;
    const prodHeightPx = (formData.heightCm || 10) * pxScale;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-bold text-slate-800">{formData.productName || "New Product"}</h2>
                            <div className="flex gap-2">
                                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded uppercase tracking-wider">
                                    {formData.category || "Uncategorized"}
                                </span>
                                {formData.brand && (
                                    <span className="px-2 py-1 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded">
                                        {formData.brand}
                                    </span>
                                )}
                            </div>
                        </div>
                        <span className="text-sm font-mono text-slate-500">{formData.sku || "NO SKU"}</span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <FaTimes className="text-slate-500 text-xl hover:text-red-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-row">

                    {/* LEFT COLUMN: Form Inputs */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 border-r border-slate-100">
                        {/* Section 1: Dimensions */}
                        <section>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 border-b pb-2">
                                Dimensions & Configuration
                            </h3>

                            <div className="grid grid-cols-3 gap-6 mb-6">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Width (products)</label>
                                    <div className="flex items-center gap-2">
                                        <input type="number" name="widthCm" value={formData.widthCm} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg text-lg font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                        <span className="text-slate-400 text-sm">cm</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Height</label>
                                    <div className="flex items-center gap-2">
                                        <input type="number" name="heightCm" value={formData.heightCm} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg text-lg font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                        <span className="text-slate-400 text-sm">cm</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Depth</label>
                                    <div className="flex items-center gap-2">
                                        <input type="number" name="depthCm" value={formData.depthCm} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg text-lg font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                        <span className="text-slate-400 text-sm">cm</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100 mb-6">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Min Facings</label>
                                    <input type="number" name="minFacings" value={formData.minFacings} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg text-base" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Max Facings</label>
                                    <input type="number" name="maxFacings" value={formData.maxFacings} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg text-base" />
                                </div>
                            </div>
                            {errors.facings && <p className="text-sm text-red-500 flex items-center gap-2 bg-red-50 p-2 rounded"><FaExclamationTriangle /> {errors.facings}</p>}

                        </section>

                        {/* Section 2: Economics */}
                        <section>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 border-b pb-2">
                                Economics
                            </h3>
                            <div className="grid grid-cols-2 gap-6 mb-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Selling Price</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">LKR</span>
                                        <input type="number" name="baseUnitPriceLKR" value={formData.baseUnitPriceLKR} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border rounded-lg text-base font-mono" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Unit Cost</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">LKR</span>
                                        <input type="number" name="unitCostLKR" value={formData.unitCostLKR} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border rounded-lg text-base font-mono" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="text-slate-600 font-medium">projected Margin</span>
                                <span className={`text-lg font-bold px-3 py-1 rounded-lg ${marginClass}`}>
                                    {margin}%
                                </span>
                            </div>
                        </section>

                        {/* Sections 3 & 4 Grid */}
                        <div className="grid grid-cols-2 gap-8">
                            {/* Shelf Compatibility */}
                            <section>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2">
                                    Constraints
                                </h3>
                                <div className="flex flex-wrap gap-2 mb-3 min-h-[40px]">
                                    {formData.allowedTags && formData.allowedTags.map(tag => (
                                        <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full flex items-center gap-2 group border border-slate-200">
                                            {tag}
                                            <button onClick={() => removeTag(tag)} className="text-slate-400 hover:text-red-500"><FaTimes /></button>
                                        </span>
                                    ))}
                                    {(!formData.allowedTags || formData.allowedTags.length === 0) && (
                                        <span className="text-sm text-slate-400 italic py-1">Compatible with all shelves</span>
                                    )}
                                </div>
                                <select onChange={handleTagChange} className="w-full px-4 py-2 border rounded-lg text-sm bg-white">
                                    <option value="">+ Add Constraint Tag</option>
                                    {["Beverages", "Snacks", "Dairy", "Cooler", "Promo"].map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </section>

                            {/* ML Priority */}
                            <section>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2">
                                    ML Analytics
                                </h3>
                                <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">Rank</p>
                                        <p className="text-3xl font-bold text-purple-900">#{formData.priorityScore || "--"}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider mb-1">Trend</p>
                                        <div className="flex items-center gap-1 justify-end">
                                            {formData.priorityTrend === 'rising' && <span className="text-green-600 font-bold text-sm bg-green-100 px-2 py-1 rounded">RISING</span>}
                                            {formData.priorityTrend === 'falling' && <span className="text-red-500 font-bold text-sm bg-red-100 px-2 py-1 rounded">FALLING</span>}
                                            {(!formData.priorityTrend || formData.priorityTrend === 'stable') && <span className="text-slate-500 font-bold text-sm bg-slate-100 px-2 py-1 rounded">STABLE</span>}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Large Preview */}
                    <div className="w-[400px] bg-slate-50 p-8 border-l border-slate-200 flex flex-col overflow-y-auto">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">
                            Live Prevention
                        </h3>

                        {/* Large Preview Box */}
                        <div className="flex-1 flex flex-col items-center justify-center relative border-2 border-dashed border-slate-300 rounded-xl bg-white p-4 mb-6">


                            {/* Shelf Floor Line */}
                            <div className="w-full h-2 bg-slate-800 absolute bottom-10 rounded-full opacity-20"></div>

                            {/* Product Representation Wrapper */}
                            <div className="flex flex-col items-center z-10" style={{ marginBottom: '40px' }}>
                                <div className="mb-2 text-center bg-white/60 backdrop-blur-sm px-2 py-1 rounded border border-slate-100/50">
                                    <div className="text-xs font-bold text-slate-600 font-mono">
                                        {formData.widthCm} x {formData.heightCm} cm
                                    </div>
                                </div>
                                <div
                                    className="bg-indigo-500 shadow-xl shadow-indigo-500/30 rounded-lg relative transition-all duration-300"
                                    style={{
                                        width: `${Math.min(prodWidthPx, 300)}px`,
                                        height: `${Math.min(prodHeightPx, 300)}px`
                                    }}
                                >
                                    {/* Depth Indicator (Side View Mock) */}
                                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 h-full w-4 bg-indigo-700 rounded-r-lg opacity-50 skew-y-6 origin-left scale-y-90"></div>
                                </div>
                            </div>
                        </div>

                        {/* Capacity Quick Check */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Est. Shelf Capacity</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600">Standard (40cm)</span>
                                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded text-sm">{Math.floor(40 / (formData.depthCm || 1))} units deep</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600">Deep (50cm)</span>
                                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded text-sm">{Math.floor(50 / (formData.depthCm || 1))} units deep</span>
                                </div>
                                <div className="flex justify-between items-center border-t pt-2 mt-1">
                                    <span className="text-sm text-slate-600">Volume</span>
                                    <span className="font-mono font-bold text-indigo-600 text-sm">{((formData.widthCm * formData.heightCm * formData.depthCm) / 1000).toFixed(2)} L</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center shrink-0 rounded-b-xl">
                    <button
                        onClick={() => onDeactivate(formData._id)}
                        className="text-red-500 hover:bg-red-50 px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                        <FaTrash /> Deactivate Product
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onSave(formData)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg shadow-lg shadow-indigo-200 flex items-center gap-2 text-sm font-bold transition-all transform hover:scale-[1.02]"
                        >
                            <FaSave /> Save Product
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDrawer;
