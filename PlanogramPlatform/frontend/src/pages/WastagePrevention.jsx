import React, { useState, useEffect, useMemo } from 'react';
import {
    FaLeaf, FaTag, FaCheckCircle, FaSpinner, FaSearch,
    FaFilter, FaExclamationTriangle, FaFire, FaCheck
} from 'react-icons/fa';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

/**
 * Wastage Prevention System
 * Enhanced with:
 *  1. KPI Summary Cards
 *  2. Search & Category Filter
 *  3. Urgency Countdown Bar per row
 *  4. Bulk Apply for critical items
 *  5. Animated slide-out on resolve
 */

// ─── Urgency Bar Component ──────────────────────────────────────────────────
const UrgencyBar = ({ risk }) => {
    const config = {
        Critical: { pct: 92, color: 'bg-red-500', label: 'Critical', pulse: true },
        High: { pct: 68, color: 'bg-orange-500', label: 'High', pulse: false },
        Medium: { pct: 42, color: 'bg-yellow-400', label: 'Medium', pulse: false },
        Low: { pct: 18, color: 'bg-emerald-400', label: 'Low', pulse: false },
    };
    const c = config[risk] || config.Low;

    return (
        <div className="mt-1.5 w-full">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${c.color} ${c.pulse ? 'animate-pulse' : ''}`}
                    style={{ width: `${c.pct}%` }}
                />
            </div>
        </div>
    );
};



// ─── Main Page ───────────────────────────────────────────────────────────────
const WastagePrevention = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);
    const [applyingAction, setApplyingAction] = useState(null);  // single item
    const [resolvingItems, setResolvingItems] = useState(new Set()); // animating out
    const [selectedItems, setSelectedItems] = useState(new Set()); // bulk select
    const [bulkApplying, setBulkApplying] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterRisk, setFilterRisk] = useState('All');
    const { user } = useAuth();

    const storeId = typeof user?.store === 'string'
        ? user.store
        : (user?.store?._id || user?.store?.name || 'default');

    useEffect(() => { fetchDashboard(); }, []);

    const fetchDashboard = async () => {
        setLoading(true);
        setError(null);
        try {
            const dashRes = await api.getWastageDashboard(storeId);
            if (dashRes && dashRes.data) {
                setDashboardData(dashRes.data);
            } else {
                setDashboardData({ riskItems: [], totalRiskItems: 0 });
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
            setError('Failed to load data. Please check that the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    // ── Animated resolve then remove ──────────────────────────────────────────
    const resolveItem = async (item) => {
        // Step 1: animate out
        setResolvingItems(prev => new Set([...prev, item.id]));

        // Step 2: short delay for animation
        await new Promise(r => setTimeout(r, 600));

        // Step 3: call API
        try {
            const discountMatch = item.action.match(/(\d+)%/);
            const discountPercent = discountMatch ? parseInt(discountMatch[1]) : 0;
            const actionType = item.action.toLowerCase().includes('donate') ? 'donate' : 'markdown';

            await api.applyWastageAction({
                productId: item.sku,
                storeId,
                actionType,
                discountPercent,
                targetQuantity: item.closingStock,
            });
        } catch (err) {
            console.error('Action error:', err);
        }

        // Step 4: remove from list
        setDashboardData(prev => ({
            ...prev,
            riskItems: prev.riskItems.filter(ri => ri.id !== item.id),
            totalRiskItems: prev.totalRiskItems - 1,
        }));
        setResolvingItems(prev => { const s = new Set(prev); s.delete(item.id); return s; });
        setSelectedItems(prev => { const s = new Set(prev); s.delete(item.id); return s; });
    };

    const handleAction = async (item) => {
        if (applyingAction) return;
        setApplyingAction(item.id);
        await resolveItem(item);
        setApplyingAction(null);
    };

    // ── Bulk apply ────────────────────────────────────────────────────────────
    const handleBulkApply = async () => {
        if (bulkApplying || selectedItems.size === 0) return;
        setBulkApplying(true);
        const allItems = dashboardData?.riskItems || [];
        const toProcess = allItems.filter(it => selectedItems.has(it.id));
        for (const item of toProcess) {
            await resolveItem(item);
            await new Promise(r => setTimeout(r, 100)); // stagger
        }
        setSelectedItems(new Set());
        setBulkApplying(false);
    };

    const selectAllCritical = () => {
        const criticalIds = (dashboardData?.riskItems || [])
            .filter(it => it.risk === 'Critical' || it.risk === 'High')
            .map(it => it.id);
        setSelectedItems(new Set(criticalIds));
    };

    const toggleSelect = (id) => {
        setSelectedItems(prev => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });
    };

    // ── Derived data ──────────────────────────────────────────────────────────
    const riskItems = dashboardData?.riskItems || [];

    const categories = useMemo(() => {
        const cats = [...new Set(riskItems.map(it => it.category).filter(Boolean))];
        return ['All', ...cats.sort()];
    }, [riskItems]);

    const filteredItems = useMemo(() => {
        return riskItems.filter(item => {
            const q = searchQuery.toLowerCase();
            const matchesSearch = !q ||
                item.productName?.toLowerCase().includes(q) ||
                item.sku?.toLowerCase().includes(q) ||
                item.category?.toLowerCase().includes(q);
            const matchesCat = filterCategory === 'All' || item.category === filterCategory;
            const matchesRisk = filterRisk === 'All' || item.risk === filterRisk;
            return matchesSearch && matchesCat && matchesRisk;
        });
    }, [riskItems, searchQuery, filterCategory, filterRisk]);



    // ── Loading skeleton ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-6 pb-10 animate-pulse">
                <div className="h-10 w-72 bg-slate-200 rounded-lg" />
                <div className="bg-white p-6 rounded-xl border border-slate-200 h-64" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <FaLeaf className="text-emerald-600" />
                        Wastage Prevention
                    </h1>
                    <p className="text-slate-500 mt-1">Monitor and act on near-expiry items before they become waste</p>
                </div>
                <div className="flex items-center gap-3">
                    {error && (
                        <span className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded-lg border border-red-100">{error}</span>
                    )}
                    <button
                        onClick={fetchDashboard}
                        className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <FaCheckCircle className="text-emerald-500" />
                        Refresh
                    </button>
                </div>
            </div>



            {/* ── Risk Table ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

                {/* Table Header */}
                <div className="p-5 border-b border-slate-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Priority Actions Required</h2>
                            <p className="text-sm text-slate-500">Suggested interventions for near-expiry items</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${riskItems.length > 0 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-emerald-100 text-emerald-700'}`}>
                            {riskItems.length > 0 ? `${dashboardData?.totalRiskItems || riskItems.length} Items at Risk` : '✓ All Clear'}
                        </span>
                    </div>

                    {/* ── Search & Filter Bar ─────────────────────────────── */}
                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                        {/* Search */}
                        <div className="relative flex-1">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                            <input
                                type="text"
                                placeholder="Search by name, SKU or category..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
                            />
                        </div>
                        {/* Category filter */}
                        <div className="relative">
                            <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                            <select
                                value={filterCategory}
                                onChange={e => setFilterCategory(e.target.value)}
                                className="pl-8 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 appearance-none cursor-pointer"
                            >
                                {categories.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        {/* Risk filter */}
                        <div className="relative">
                            <FaExclamationTriangle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                            <select
                                value={filterRisk}
                                onChange={e => setFilterRisk(e.target.value)}
                                className="pl-8 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 appearance-none cursor-pointer"
                            >
                                {['All', 'Critical', 'High', 'Medium', 'Low'].map(r => <option key={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* ── Bulk Actions Bar ────────────────────────────────── */}
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                        <button
                            onClick={selectAllCritical}
                            className="text-xs px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 font-medium hover:bg-orange-100 transition-colors"
                        >
                            🔥 Select All Critical & High
                        </button>
                        {selectedItems.size > 0 && (
                            <button
                                onClick={handleBulkApply}
                                disabled={bulkApplying}
                                className="text-xs px-4 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {bulkApplying
                                    ? <><FaSpinner className="animate-spin" /> Applying...</>
                                    : <><FaCheck /> Apply Selected ({selectedItems.size})</>
                                }
                            </button>
                        )}
                        {selectedItems.size > 0 && (
                            <button
                                onClick={() => setSelectedItems(new Set())}
                                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                            >
                                Clear
                            </button>
                        )}
                        <span className="text-xs text-slate-400 ml-auto">
                            {filteredItems.length} of {riskItems.length} items shown
                        </span>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                            <tr>
                                <th className="px-4 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 accent-indigo-600 cursor-pointer"
                                        checked={selectedItems.size > 0 && filteredItems.every(it => selectedItems.has(it.id))}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedItems(new Set(filteredItems.map(it => it.id)));
                                            } else {
                                                setSelectedItems(new Set());
                                            }
                                        }}
                                    />
                                </th>
                                <th className="px-4 py-3">Product Details</th>
                                <th className="px-4 py-3">Urgency</th>
                                <th className="px-4 py-3">Value At Risk</th>
                                <th className="px-4 py-3">Recommendation</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.length > 0 ? filteredItems.map((item) => {
                                const isResolving = resolvingItems.has(item.id);
                                const isSelected = selectedItems.has(item.id);

                                return (
                                    <tr
                                        key={item.id}
                                        style={{
                                            transition: 'opacity 0.5s ease, transform 0.5s ease, max-height 0.5s ease',
                                            opacity: isResolving ? 0 : 1,
                                            transform: isResolving ? 'translateX(40px)' : 'translateX(0)',
                                            pointerEvents: isResolving ? 'none' : 'auto',
                                            backgroundColor: isSelected ? '#f0f4ff' : undefined,
                                        }}
                                        className={`border-b border-slate-100 hover:bg-slate-50 transition-colors group ${isResolving ? 'bg-emerald-50' : ''}`}
                                    >
                                        {/* Checkbox */}
                                        <td className="px-4 py-4">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelect(item.id)}
                                                className="rounded border-slate-300 accent-indigo-600 cursor-pointer"
                                            />
                                        </td>

                                        {/* Product details */}
                                        <td className="px-4 py-4 max-w-[200px]">
                                            <div className="font-semibold text-slate-900 truncate">{item.productName}</div>
                                            <div className="text-slate-400 text-xs mt-0.5">{item.sku} · {item.category}</div>
                                            <div className="text-xs text-slate-400 mt-0.5">{item.closingStock} units in stock</div>
                                        </td>

                                        {/* Urgency countdown */}
                                        <td className="px-4 py-4 min-w-[150px]">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.risk === 'Critical' ? 'bg-red-500 animate-pulse' :
                                                    item.risk === 'High' ? 'bg-orange-500' :
                                                        item.risk === 'Medium' ? 'bg-yellow-400' : 'bg-emerald-400'
                                                    }`} />
                                                <span className={`text-xs font-semibold ${item.risk === 'Critical' ? 'text-red-600' :
                                                    item.risk === 'High' ? 'text-orange-600' :
                                                        item.risk === 'Medium' ? 'text-yellow-600' : 'text-emerald-600'
                                                    }`}>{item.risk}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 mb-1.5">{item.expiryLabel}</div>
                                            <UrgencyBar risk={item.risk} />
                                        </td>

                                        {/* Value at risk */}
                                        <td className="px-4 py-4">
                                            <span className="font-bold text-slate-900">
                                                LKR {item.value?.toLocaleString() || '0'}
                                            </span>
                                        </td>

                                        {/* Recommendation */}
                                        <td className="px-4 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-medium text-xs border border-indigo-100">
                                                <FaTag size={9} />
                                                {item.action}
                                            </span>
                                        </td>

                                        {/* Action */}
                                        <td className="px-4 py-4 text-right">
                                            {isResolving ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold">
                                                    <FaCheck size={10} /> Done
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleAction(item)}
                                                    disabled={applyingAction === item.id || bulkApplying}
                                                    className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {applyingAction === item.id
                                                        ? <span className="flex items-center gap-1"><FaSpinner className="animate-spin" /> Applying...</span>
                                                        : 'Apply'
                                                    }
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center text-slate-400">
                                        {riskItems.length === 0 ? (
                                            <>
                                                <FaCheckCircle className="mx-auto text-emerald-400 mb-3" size={36} />
                                                <p className="font-semibold text-slate-600">No critical risks detected!</p>
                                                <p className="text-sm mt-1">Great job keeping stock under control.</p>
                                            </>
                                        ) : (
                                            <>
                                                <FaSearch className="mx-auto text-slate-300 mb-3" size={32} />
                                                <p className="font-semibold text-slate-500">No items match your filters.</p>
                                                <p className="text-sm mt-1">Try adjusting your search or filter criteria.</p>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                {riskItems.length > 0 && (
                    <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <span>
                            <span className="font-medium text-slate-600">{filteredItems.length}</span> items shown
                            {filterCategory !== 'All' || filterRisk !== 'All' || searchQuery ? ` (filtered from ${riskItems.length})` : ''}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                            Live monitoring active
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WastagePrevention;
