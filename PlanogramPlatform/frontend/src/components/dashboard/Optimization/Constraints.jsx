import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaEdit, FaToggleOn, FaToggleOff, FaShieldAlt, FaInfoCircle, FaExclamationTriangle, FaLink, FaBan, FaSortAmountUp, FaSortAmountDown, FaLayerGroup, FaTags, FaChartPie, FaSearch } from 'react-icons/fa';
import api from '../../../services/api';

const RULE_TYPES = [
    { value: 'adjacency_required', label: 'Must Be Adjacent', description: 'Two products must be placed on the same shelf', scope: 'sku' },
    { value: 'adjacency_forbidden', label: 'Must NOT Be Adjacent', description: 'Two products must NOT be on the same shelf', scope: 'sku' },
    { value: 'min_facings_override', label: 'Minimum Facings Override', description: 'Override minimum facings for a product or category', scope: 'sku' },
    { value: 'max_facings_override', label: 'Maximum Facings Override', description: 'Cap maximum facings to prevent shelf domination', scope: 'sku' },
    { value: 'category_shelf_affinity', label: 'Category-Shelf Affinity', description: 'Prefer placing a category on specific shelves', scope: 'category' },
    { value: 'brand_block', label: 'Brand Blocking', description: 'Products of same brand must be grouped contiguously', scope: 'brand' },
    { value: 'max_shelf_share', label: 'Maximum Shelf Share', description: 'Limit how much shelf space a category can occupy (%)', scope: 'category' }
];

const SCOPES = [
    { value: 'sku', label: 'SKU' },
    { value: 'brand', label: 'Brand' },
    { value: 'category', label: 'Category' },
    { value: 'fixture', label: 'Fixture' },
    { value: 'level', label: 'Shelf Level' },
    { value: 'global', label: 'Global' }
];

const Constraints = () => {
    const [constraints, setConstraints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingConstraint, setEditingConstraint] = useState(null);
    const [products, setProducts] = useState([]);
    const [fixtures, setFixtures] = useState([]);

    // Form State
    const [form, setForm] = useState({
        name: '',
        ruleType: '',
        scope: 'sku',
        targetSku: '',
        targetBrand: '',
        targetCategory: '',
        targetFixtureId: '',
        targetLevelId: '',
        hardConstraint: true,
        penaltyWeight: 100,
        params: {}
    });

    useEffect(() => {
        fetchConstraints();
        fetchContextData();
    }, []);

    const fetchConstraints = async () => {
        try {
            const res = await api.get('/constraints');
            setConstraints(res.data.data || []);
        } catch (error) {
            console.error('Failed to fetch constraints', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchContextData = async () => {
        try {
            const [productsRes, shelvesRes] = await Promise.all([
                api.get('/products?isActive=true'),
                api.get('/planograms/shelves')
            ]);
            setProducts(productsRes.data || []);
            setFixtures(shelvesRes.data || []);
        } catch (error) {
            console.error('Failed to fetch context data', error);
        }
    };

    const resetForm = () => {
        setForm({
            name: '', ruleType: '', scope: 'sku',
            targetSku: '', targetBrand: '', targetCategory: '',
            targetFixtureId: '', targetLevelId: '',
            hardConstraint: true, penaltyWeight: 100, params: {}
        });
        setEditingConstraint(null);
    };

    const openAddModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (constraint) => {
        setEditingConstraint(constraint);
        setForm({
            name: constraint.name || '',
            ruleType: constraint.ruleType || '',
            scope: constraint.scope || 'sku',
            targetSku: constraint.targetSku || '',
            targetBrand: constraint.targetBrand || '',
            targetCategory: constraint.targetCategory || '',
            targetFixtureId: constraint.targetFixtureId || '',
            targetLevelId: constraint.targetLevelId || '',
            hardConstraint: constraint.hardConstraint !== false,
            penaltyWeight: constraint.penaltyWeight || 100,
            params: constraint.params || {}
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingConstraint) {
                await api.patch(`/constraints/${editingConstraint._id}`, form);
            } else {
                await api.post('/constraints', form);
            }
            setShowModal(false);
            resetForm();
            fetchConstraints();
        } catch (error) {
            console.error('Failed to save constraint', error);
            alert('Failed to save constraint: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this constraint rule?')) return;
        try {
            await api.delete(`/constraints/${id}`);
            setConstraints(constraints.filter(c => c._id !== id));
        } catch (error) {
            console.error('Failed to delete constraint', error);
        }
    };

    const handleToggle = async (id) => {
        try {
            const res = await api.patch(`/constraints/${id}/toggle`);
            setConstraints(constraints.map(c => c._id === id ? res.data.data : c));
        } catch (error) {
            console.error('Failed to toggle constraint', error);
        }
    };

    const handleRuleTypeChange = (ruleType) => {
        const ruleInfo = RULE_TYPES.find(r => r.value === ruleType);
        setForm(prev => ({
            ...prev,
            ruleType,
            scope: ruleInfo?.scope || prev.scope,
            params: {}
        }));
    };

    const getRuleLabel = (ruleType) => {
        return RULE_TYPES.find(r => r.value === ruleType)?.label || ruleType;
    };

    const RULE_ICONS = {
        adjacency_required: <FaLink className="text-[#17A2B8]" />,
        adjacency_forbidden: <FaBan className="text-red-500" />,
        min_facings_override: <FaSortAmountUp className="text-[#1B4F72]" />,
        max_facings_override: <FaSortAmountDown className="text-amber-600" />,
        category_shelf_affinity: <FaLayerGroup className="text-[#17A2B8]" />,
        brand_block: <FaTags className="text-[#1B4F72]" />,
        max_shelf_share: <FaChartPie className="text-amber-600" />
    };

    const getRuleIcon = (ruleType) => {
        return RULE_ICONS[ruleType] || <FaShieldAlt className="text-slate-400" />;
    };

    // Extract unique categories and brands from products
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
    const allLevels = fixtures.flatMap(f => (f.levels || []).map(l => ({ ...l, fixtureName: f.aisleBaySide })));

    const activeCount = constraints.filter(c => c.isActive).length;
    const hardCount = constraints.filter(c => c.hardConstraint && c.isActive).length;
    const softCount = activeCount - hardCount;

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden">
            <div className="flex-1 flex flex-col h-full transition-all duration-300">

                {/* Top Bar (matches Products page pattern) */}
                <div className="bg-white border-b border-slate-200 p-4 shadow-sm z-10">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-slate-800">Constraint Rules</h1>
                            <p className="text-slate-500 text-sm">Define business rules and optimization constraints for planogram generation.</p>
                        </div>
                        <button
                            onClick={openAddModal}
                            className="bg-[#1B4F72] text-white hover:bg-[#164060] px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-[#1B4F72]/10 transition-all"
                        >
                            <FaPlus /> Add Rule
                        </button>
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* Stats Bar */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Total Rules</p>
                            <p className="text-2xl font-bold text-[#1B4F72]">{constraints.length}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <p className="text-xs text-slate-400 uppercase font-bold">Hard Constraints</p>
                            </div>
                            <p className="text-2xl font-bold text-red-600 mt-1">{hardCount}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                <p className="text-xs text-slate-400 uppercase font-bold">Soft Constraints</p>
                            </div>
                            <p className="text-2xl font-bold text-amber-600 mt-1">{softCount}</p>
                        </div>
                    </div>

                    {/* Constraints Table */}
                    <div className="flex-1 overflow-auto">
                        {loading ? (
                            <div className="text-center py-10 text-slate-400">Loading constraints...</div>
                        ) : constraints.length === 0 ? (
                            <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                <FaShieldAlt className="text-4xl text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500 font-medium">No constraint rules defined yet.</p>
                                <p className="text-sm text-slate-400 mt-1">Add rules to guide the optimization engine.</p>
                                <button onClick={openAddModal} className="mt-4 text-[#17A2B8] font-semibold hover:underline">
                                    + Create your first rule
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3 border-b">Rule Name</th>
                                            <th className="px-6 py-3 border-b">Rule Type</th>
                                            <th className="px-6 py-3 border-b">Target / Details</th>
                                            <th className="px-6 py-3 border-b">Constraint Level</th>
                                            <th className="px-6 py-3 border-b text-center">Status</th>
                                            <th className="px-6 py-3 border-b text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-slate-100">
                                        {constraints.map(c => (
                                            <tr
                                                key={c._id}
                                                className={`hover:bg-[#17A2B8]/5 transition-colors group ${!c.isActive ? 'opacity-60' : ''}`}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-xl w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50">
                                                            {getRuleIcon(c.ruleType)}
                                                        </div>
                                                        <span className="font-bold text-slate-800">{c.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    {getRuleLabel(c.ruleType)}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 text-xs">
                                                    <div className="flex flex-col gap-1">
                                                        {c.targetSku && <span><span className="font-semibold text-slate-700">SKU:</span> {c.targetSku}</span>}
                                                        {c.targetCategory && <span><span className="font-semibold text-slate-700">Cat:</span> {c.targetCategory}</span>}
                                                        {c.targetBrand && <span><span className="font-semibold text-slate-700">Brand:</span> {c.targetBrand}</span>}
                                                        {!c.targetSku && !c.targetCategory && !c.targetBrand && <span className="text-slate-400 italic">Global / Unspecified</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${c.hardConstraint
                                                        ? 'bg-red-50 text-red-600 border border-red-200'
                                                        : 'bg-amber-50 text-amber-600 border border-amber-200'
                                                        }`}>
                                                        {c.hardConstraint ? 'HARD' : 'SOFT'}
                                                    </span>
                                                    {!c.hardConstraint && <div className="text-xs text-amber-500 mt-1">Penalty: {c.penaltyWeight}</div>}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleToggle(c._id)}
                                                        className={`p-1.5 rounded-lg transition-colors ${c.isActive ? 'text-[#17A2B8] hover:bg-teal-50' : 'text-slate-300 hover:bg-slate-50'}`}
                                                        title={c.isActive ? 'Disable' : 'Enable'}
                                                    >
                                                        {c.isActive ? <FaToggleOn className="text-3xl" /> : <FaToggleOff className="text-3xl" />}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openEditModal(c)}
                                                            className="p-2 text-slate-400 hover:text-[#1B4F72] hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <FaEdit className="text-xl" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(c._id)}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <FaTrash className="text-xl" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>


                    {/* Add/Edit Modal */}
                    {showModal && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                                {/* Modal Header */}
                                <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-[#1B4F72] to-[#17A2B8] rounded-t-2xl">
                                    <h2 className="text-lg font-bold text-white">
                                        {editingConstraint ? 'Edit Constraint Rule' : 'Add Constraint Rule'}
                                    </h2>
                                    <p className="text-white/70 text-sm mt-1">
                                        Define a business rule for the optimization engine.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                                    {/* Rule Name */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Rule Name</label>
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent outline-none"
                                            placeholder="e.g., Keep Coca-Cola next to Pepsi"
                                            required
                                        />
                                    </div>

                                    {/* Rule Type */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Rule Type</label>
                                        <select
                                            value={form.ruleType}
                                            onChange={e => handleRuleTypeChange(e.target.value)}
                                            className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent outline-none"
                                            required
                                        >
                                            <option value="">Select a rule type...</option>
                                            {RULE_TYPES.map(r => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                        {form.ruleType && (
                                            <div className="mt-2 p-3 bg-blue-50 rounded-lg text-xs text-[#1B4F72] flex items-start gap-2">
                                                <FaInfoCircle className="shrink-0 mt-0.5" />
                                                {RULE_TYPES.find(r => r.value === form.ruleType)?.description}
                                            </div>
                                        )}
                                    </div>

                                    {/* Dynamic Target Fields */}
                                    {(form.ruleType === 'adjacency_required' || form.ruleType === 'adjacency_forbidden') && (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Product A (SKU)</label>
                                                <select
                                                    value={form.targetSku}
                                                    onChange={e => setForm({ ...form, targetSku: e.target.value })}
                                                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent outline-none"
                                                >
                                                    <option value="">Select product...</option>
                                                    {products.map(p => (
                                                        <option key={p._id} value={p.sku}>{p.productName || p.sku}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                    Product B (SKU) — {form.ruleType === 'adjacency_required' ? 'Must be adjacent' : 'Must NOT be adjacent'}
                                                </label>
                                                <select
                                                    value={form.params.adjacentSku || form.params.forbiddenSku || ''}
                                                    onChange={e => setForm({
                                                        ...form,
                                                        params: {
                                                            ...form.params,
                                                            [form.ruleType === 'adjacency_required' ? 'adjacentSku' : 'forbiddenSku']: e.target.value
                                                        }
                                                    })}
                                                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent outline-none"
                                                >
                                                    <option value="">Select product...</option>
                                                    {products.map(p => (
                                                        <option key={p._id} value={p.sku}>{p.productName || p.sku}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {(form.ruleType === 'min_facings_override' || form.ruleType === 'max_facings_override') && (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Scope</label>
                                                <select
                                                    value={form.scope}
                                                    onChange={e => setForm({ ...form, scope: e.target.value })}
                                                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent outline-none"
                                                >
                                                    <option value="sku">Specific SKU</option>
                                                    <option value="category">Category</option>
                                                </select>
                                            </div>
                                            {form.scope === 'sku' && (
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target SKU</label>
                                                    <select
                                                        value={form.targetSku}
                                                        onChange={e => setForm({ ...form, targetSku: e.target.value })}
                                                        className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent outline-none"
                                                    >
                                                        <option value="">Select product...</option>
                                                        {products.map(p => (
                                                            <option key={p._id} value={p.sku}>{p.productName || p.sku}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            {form.scope === 'category' && (
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target Category</label>
                                                    <select
                                                        value={form.targetCategory}
                                                        onChange={e => setForm({ ...form, targetCategory: e.target.value })}
                                                        className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent outline-none"
                                                    >
                                                        <option value="">Select category...</option>
                                                        {categories.map(c => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                    {form.ruleType === 'min_facings_override' ? 'Minimum Facings' : 'Maximum Facings'}
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1" max="50"
                                                    value={form.params.minFacings || form.params.maxFacings || 1}
                                                    onChange={e => setForm({
                                                        ...form,
                                                        params: {
                                                            ...form.params,
                                                            [form.ruleType === 'min_facings_override' ? 'minFacings' : 'maxFacings']: parseInt(e.target.value)
                                                        }
                                                    })}
                                                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {form.ruleType === 'category_shelf_affinity' && (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
                                                <select
                                                    value={form.targetCategory}
                                                    onChange={e => setForm({ ...form, targetCategory: e.target.value, scope: 'category' })}
                                                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent outline-none"
                                                >
                                                    <option value="">Select category...</option>
                                                    {categories.map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Preferred Fixture</label>
                                                <select
                                                    value={form.targetFixtureId}
                                                    onChange={e => setForm({ ...form, targetFixtureId: e.target.value })}
                                                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent outline-none"
                                                >
                                                    <option value="">Any fixture...</option>
                                                    {fixtures.map(f => (
                                                        <option key={f._id} value={f._id}>{f.aisleBaySide || f._id}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {form.ruleType === 'brand_block' && (
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Brand</label>
                                            <select
                                                value={form.targetBrand}
                                                onChange={e => setForm({ ...form, targetBrand: e.target.value, scope: 'brand' })}
                                                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent outline-none"
                                            >
                                                <option value="">Select brand...</option>
                                                {brands.map(b => (
                                                    <option key={b} value={b}>{b}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {form.ruleType === 'max_shelf_share' && (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
                                                <select
                                                    value={form.targetCategory}
                                                    onChange={e => setForm({ ...form, targetCategory: e.target.value, scope: 'category' })}
                                                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent outline-none"
                                                >
                                                    <option value="">Select category...</option>
                                                    {categories.map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                    Maximum Share (%) — <span className="text-[#17A2B8]">{form.params.maxPercent || 40}%</span>
                                                </label>
                                                <input
                                                    type="range"
                                                    min="10" max="100" step="5"
                                                    value={form.params.maxPercent || 40}
                                                    onChange={e => setForm({ ...form, params: { ...form.params, maxPercent: parseInt(e.target.value) } })}
                                                    className="w-full accent-[#17A2B8]"
                                                />
                                                <div className="flex justify-between text-xs text-slate-400 mt-1">
                                                    <span>10%</span><span>50%</span><span>100%</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Hard vs Soft Toggle */}
                                    <div className="border border-slate-200 rounded-xl p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-700">Constraint Type</p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {form.hardConstraint
                                                        ? 'Hard: Solution MUST satisfy this rule'
                                                        : 'Soft: Violation incurs a penalty in scoring'}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setForm({ ...form, hardConstraint: !form.hardConstraint })}
                                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${form.hardConstraint
                                                    ? 'bg-red-50 text-red-600 border border-red-200'
                                                    : 'bg-amber-50 text-amber-600 border border-amber-200'
                                                    }`}
                                            >
                                                {form.hardConstraint ? 'HARD' : 'SOFT'}
                                            </button>
                                        </div>

                                        {/* Penalty Weight (only for soft) */}
                                        {!form.hardConstraint && (
                                            <div className="mt-4">
                                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                                    Penalty Weight — <span className="text-amber-600">{form.penaltyWeight}</span>
                                                </label>
                                                <input
                                                    type="range"
                                                    min="10" max="500" step="10"
                                                    value={form.penaltyWeight}
                                                    onChange={e => setForm({ ...form, penaltyWeight: parseInt(e.target.value) })}
                                                    className="w-full accent-amber-500"
                                                />
                                                <div className="flex justify-between text-xs text-slate-400 mt-1">
                                                    <span>Low (10)</span><span>Medium (250)</span><span>High (500)</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            className="px-5 py-2.5 text-slate-500 hover:text-slate-700 font-medium rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-2.5 bg-gradient-to-r from-[#1B4F72] to-[#17A2B8] text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                                        >
                                            {editingConstraint ? 'Update Rule' : 'Create Rule'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default Constraints;
