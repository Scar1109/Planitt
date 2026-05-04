import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    FaLeaf, FaTag, FaCheckCircle, FaSpinner, FaSearch,
    FaFilter, FaExclamationTriangle, FaFire, FaCheck,
    FaChartLine, FaShieldAlt, FaBoxes, FaTimes,
    FaRobot, FaBolt, FaRecycle, FaArrowDown, FaArrowUp
} from 'react-icons/fa';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

/* ═══════════════════════════════════════════════════════════════════════
   MINI CHART COMPONENTS (no external library required)
   ═══════════════════════════════════════════════════════════════════════ */

const MiniBarChart = ({ data, valueKey = 'value', labelKey = 'day', height = 120, accentColor = '#6366f1' }) => {
    const maxVal = Math.max(...data.map(d => d[valueKey]), 1);
    return (
        <div className="flex items-end gap-1.5 justify-between" style={{ height }}>
            {data.map((d, i) => {
                const barH = Math.max(4, (d[valueKey] / maxVal) * (height - 24));
                return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1 group">
                        <div className="relative flex-1 flex items-end w-full">
                            <div
                                className="w-full rounded-t-md transition-all duration-500 group-hover:opacity-80"
                                style={{
                                    height: barH,
                                    background: `linear-gradient(180deg, ${accentColor}, ${accentColor}88)`,
                                    minWidth: 18,
                                }}
                            />
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">

                            </div>
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium truncate w-full text-center">{d[labelKey]}</span>
                    </div>
                );
            })}
        </div>
    );
};

const MiniDonut = ({ data, size = 120 }) => {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
    let cumAngle = 0;

    const slices = data.map((d, i) => {
        const angle = (d.value / total) * 360;
        const startAngle = cumAngle;
        cumAngle += angle;
        const midAngle = startAngle + angle / 2;
        const largeArc = angle > 180 ? 1 : 0;
        const r = size / 2 - 4;
        const cx = size / 2;
        const cy = size / 2;

        const x1 = cx + r * Math.cos((Math.PI * startAngle) / 180);
        const y1 = cy + r * Math.sin((Math.PI * startAngle) / 180);
        const x2 = cx + r * Math.cos((Math.PI * (startAngle + angle)) / 180);
        const y2 = cy + r * Math.sin((Math.PI * (startAngle + angle)) / 180);

        return (
            <path
                key={i}
                d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={colors[i % colors.length]}
                className="transition-all duration-300 hover:opacity-80"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
            />
        );
    });

    return (
        <div className="flex items-center gap-3">
            <svg width={size} height={size} className="flex-shrink-0">
                {slices}
                <circle cx={size / 2} cy={size / 2} r={size / 4} fill="white" />
                <text x={size / 2} y={size / 2 - 4} textAnchor="middle" className="text-[10px] font-bold fill-slate-700">
                    {data.length}
                </text>
                <text x={size / 2} y={size / 2 + 8} textAnchor="middle" className="text-[8px] fill-slate-400">
                    categories
                </text>
            </svg>
            <div className="flex flex-col gap-1 min-w-0">
                {data.slice(0, 5).map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px]">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
                        <span className="truncate text-slate-600">{d.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};



/* ═══════════════════════════════════════════════════════════════════════
   URGENCY BAR
   ═══════════════════════════════════════════════════════════════════════ */
const UrgencyBar = ({ risk }) => {
    const config = {
        Critical: { pct: 92, color: 'bg-red-500', pulse: true },
        High: { pct: 68, color: 'bg-orange-500', pulse: false },
        Medium: { pct: 42, color: 'bg-yellow-400', pulse: false },
        Low: { pct: 18, color: 'bg-emerald-400', pulse: false },
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

/* ═══════════════════════════════════════════════════════════════════════
   SMART DISCOUNT BADGE — shows AI recommendation per item
   ═══════════════════════════════════════════════════════════════════════ */
const SmartDiscountBadge = ({ item, smartDiscounts, onFetchDiscount }) => {
    const disc = smartDiscounts[item.sku];

    if (!disc) {
        return (
            <button
                onClick={() => onFetchDiscount(item)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#17A2B8]/10 to-[#17A2B8]/10 text-[#1B4F72] font-medium text-xs border border-[#17A2B8]/20 hover:shadow-md hover:scale-105 transition-all cursor-pointer"
            >
                <FaRobot size={10} />
                Get Smart Price
            </button>
        );
    }

    if (disc === 'loading') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-400 text-xs">
                <FaSpinner className="animate-spin" size={10} />
                Analyzing...
            </span>
        );
    }

    return (
        <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 font-bold text-xs border border-emerald-200 shadow-sm">
                <FaRobot size={10} />
                {disc.optimalDiscount}% off
                <span className="text-[10px] font-normal text-emerald-500 ml-0.5">
                    ({disc.source === 'rule-based' ? 'Rule' : 'Smart'})
                </span>
            </div>
            <div className="text-[10px] text-slate-400">
                {disc.wasteAvoidedPercent}% waste avoided
            </div>
        </div>
    );
};


/* ═══════════════════════════════════════════════════════════════════════
   OPTIMAL SIMULATION MODAL
   ═══════════════════════════════════════════════════════════════════════ */
const OptimalSimulationModal = ({ item, onApply, onClose }) => {
    const [step, setStep] = useState(0);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        const runSim = async () => {
            try {
                setStep(1); // "Connecting to Promotion Forecasting Engine..."
                await new Promise(r => setTimeout(r, 800));
                if (!mounted) return;
                setStep(2); // "Running Stochastic Uplift Optimization..."

                const res = await api.getSmartDiscount({
                    sku: item.sku,
                    currentStock: item.closingStock,
                    daysToExpiry: item.daysToExpiry,
                    basePrice: item.basePrice,
                    costPrice: item.costPrice,
                });

                await new Promise(r => setTimeout(r, 600)); // Animation spacing
                if (!mounted) return;

                if (res.success) {
                    setStep(3); // Complete
                    setResult({ ...res.data, source: res.source });
                } else {
                    setError("Failed to simulate. Using standard rules.");
                }
            } catch (err) {
                if (mounted) setError(err.message || "Failed to analyze.");
            }
        };
        runSim();
        return () => { mounted = false; };
    }, [item]);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-fade-in-up">
                <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <FaRobot className="text-indigo-500" /> AI Pricing Analysis
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <FaTimes />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                            {item.sku.substring(0, 3).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 leading-tight">{item.productName}</p>
                            <p className="text-xs text-slate-500 mt-1">{item.sku} • {item.closingStock} units at risk</p>
                        </div>
                    </div>

                    {!result && !error && (
                        <div className="py-8 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-300'}`}>
                                    {step > 1 ? <FaCheckCircle /> : <FaSpinner className="animate-spin" />}
                                </div>
                                <div className={`text-sm flex-1 ${step >= 1 ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                                    Connecting to Forecast Optimizer...
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-300'}`}>
                                    {step > 2 ? <FaCheckCircle /> : step === 2 ? <FaSpinner className="animate-spin" /> : <div className="w-2 h-2 rounded-full bg-slate-200" />}
                                </div>
                                <div className={`text-sm flex-1 ${step >= 2 ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                                    Simulating Elasticity & Markdowns...
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300'}`}>
                                    {step === 3 ? <FaCheckCircle /> : <div className="w-2 h-2 rounded-full bg-slate-200" />}
                                </div>
                                <div className={`text-sm flex-1 ${step >= 3 ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                                    Finalizing Optimal Discount...
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="py-6 text-center text-rose-500 text-sm">
                            <FaExclamationTriangle className="mx-auto text-3xl mb-2" />
                            <p>{error}</p>
                        </div>
                    )}

                    {result && (
                        <div className="animate-fadeIn">
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 mb-5 text-center">
                                <p className="text-emerald-800 font-medium text-[10px] uppercase tracking-wide mb-1">Optimal AI Output</p>
                                <p className="text-4xl font-black text-emerald-600">{result.optimalDiscount}% OFF</p>
                                <p className="text-emerald-700 text-xs mt-2 font-medium">Maximizes profit while preventing {result.wasteAvoidedPercent}% waste</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                                    <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Expected Uplift</p>
                                    <p className="font-bold text-slate-800">+{result.expectedUplift} units</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                                    <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Estimated Sales</p>
                                    <p className="font-bold text-indigo-600">{result.expectedUnitsSold} units</p>
                                </div>
                            </div>

                            <button onClick={() => onApply(result)} className="w-full bg-indigo-600 text-white text-sm font-bold py-3 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                                Apply Optimal Price
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <style jsx>{`
                .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */
const WastagePrevention = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);
    const [applyingAction, setApplyingAction] = useState(null);
    const [resolvingItems, setResolvingItems] = useState(new Set());
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [bulkApplying, setBulkApplying] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRisk, setFilterRisk] = useState('All');
    const [smartDiscounts, setSmartDiscounts] = useState({});
    const [simulationModalItem, setSimulationModalItem] = useState(null);
    const [autoPromoting, setAutoPromoting] = useState(false);
    const [activeTab, setActiveTab] = useState('risk'); // risk | bundles
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
                setDashboardData({ riskItems: [], totalRiskItems: 0, kpis: {}, expiryTimeline: [], categoryBreakdown: [], historicalWastageTrend: [], bundleSuggestions: [] });
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
            setError('Failed to load data. Please check that the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    /* ── Fetch AI Discount for a single item ─────────────────────────── */
    const fetchSmartDiscount = useCallback(async (item) => {
        setSimulationModalItem(item);
    }, []);

    /* ── Resolve (apply action to) a single item ─────────────────────── */
    const resolveItem = async (item) => {
        setResolvingItems(prev => new Set([...prev, item.id]));
        await new Promise(r => setTimeout(r, 600));

        try {
            const disc = smartDiscounts[item.sku];
            const discountPercent = disc && typeof disc === 'object' ? disc.optimalDiscount : item.fallbackDiscount || 0;
            const actionType = item.daysToExpiry <= 0 ? 'donate' : 'markdown';

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

    /* ── Bulk apply ────────────────────────────────────────────────── */
    const handleBulkApply = async () => {
        if (bulkApplying || selectedItems.size === 0) return;
        setBulkApplying(true);
        const allItems = dashboardData?.riskItems || [];
        const toProcess = allItems.filter(it => selectedItems.has(it.id));
        for (const item of toProcess) {
            await resolveItem(item);
            await new Promise(r => setTimeout(r, 100));
        }
        setSelectedItems(new Set());
        setBulkApplying(false);
    };

    /* ── Auto-Promote All ─────────────────────────────────────────── */
    const handleAutoPromote = async () => {
        const items = (dashboardData?.riskItems || []).filter(i => i.daysToExpiry > 0 && i.daysToExpiry <= 7);
        if (items.length === 0 || autoPromoting) return;
        setAutoPromoting(true);

        try {
            const promoItems = items.map(item => {
                const disc = smartDiscounts[item.sku];
                return {
                    sku: item.sku,
                    discount: disc && typeof disc === 'object' ? disc.optimalDiscount : item.fallbackDiscount,
                    stock: item.closingStock,
                    daysToExpiry: item.daysToExpiry,
                    expectedUplift: disc?.expectedUplift || 0,
                    revenueSaved: disc?.revenueSaved || 0,
                };
            });

            await api.autoPromoteRiskItems(promoItems, storeId);
            await fetchDashboard();
        } catch (err) {
            console.error('Auto-promote error:', err);
        } finally {
            setAutoPromoting(false);
        }
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

    /* ── Fetch all smart discounts at once ─────────────────────────── */
    const fetchAllSmartDiscounts = async () => {
        const items = (dashboardData?.riskItems || []).filter(i => i.daysToExpiry > 0 && i.daysToExpiry <= 7);
        for (const item of items) {
            if (!smartDiscounts[item.sku]) {
                fetchSmartDiscount(item);
                await new Promise(r => setTimeout(r, 150)); // stagger
            }
        }
    };

    /* ── Derived data ──────────────────────────────────────────────── */
    const riskItems = dashboardData?.riskItems || [];
    const kpis = dashboardData?.kpis || {};
    const expiryTimeline = dashboardData?.expiryTimeline || [];
    const categoryBreakdown = dashboardData?.categoryBreakdown || [];
    const historicalTrend = dashboardData?.historicalWastageTrend || [];
    const bundles = dashboardData?.bundleSuggestions || [];



    const filteredItems = useMemo(() => {
        return riskItems.filter(item => {
            const q = searchQuery.toLowerCase();
            const matchesSearch = !q ||
                item.productName?.toLowerCase().includes(q) ||
                item.sku?.toLowerCase().includes(q) ||
                item.category?.toLowerCase().includes(q);
            const matchesRisk = filterRisk === 'All' || item.risk === filterRisk;
            return matchesSearch && matchesRisk;
        });
    }, [riskItems, searchQuery, filterRisk]);

    /* ── Loading skeleton ──────────────────────────────────────────── */
    if (loading) {
        return (
            <div className="space-y-6 pb-10 animate-pulse">
                <div className="h-10 w-72 bg-slate-200 rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-200 rounded-xl" />)}
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 h-64" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">

            {/* ═══════════ HEADER ═══════════════════════════════════════ */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <FaLeaf className="text-white" size={16} />
                        </div>
                        Wastage Prevention

                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">Intelligent waste management with optimized discount pricing</p>
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



            {/* ═══════════ CHARTS SECTION ═══════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Expiry Timeline */}
                <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <FaChartLine className="text-[#17A2B8]" size={12} />
                        Expiry Timeline
                    </h3>
                    {expiryTimeline.length > 0 ? (
                        <MiniBarChart data={expiryTimeline} />
                    ) : (
                        <p className="text-xs text-slate-400 text-center py-8">No timeline data</p>
                    )}
                </div>

                {/* Category Breakdown */}
                <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <FaBoxes className="text-[#17A2B8]" size={12} />
                        Risk by Category
                    </h3>
                    {categoryBreakdown.length > 0 ? (
                        <MiniDonut data={categoryBreakdown} />
                    ) : (
                        <p className="text-xs text-slate-400 text-center py-8">No category data</p>
                    )}
                </div>

                {/* Historical Trend */}
                <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <FaRecycle className="text-emerald-500" size={12} />
                        Wastage Trend (3 months)
                    </h3>
                    <div className="max-w-[300px] mx-auto">
                        {historicalTrend.length > 0 ? (
                            <MiniBarChart data={historicalTrend} valueKey="value" labelKey="month" accentColor="#ef4444" />
                        ) : (
                            <p className="text-xs text-slate-400 text-center py-8">No historical data</p>
                        )}
                    </div>
                </div>
            </div>


            {/* ═══════════ TAB NAVIGATION ═══════════════════════════════ */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                {[
                    { key: 'risk', icon: FaExclamationTriangle, label: 'Risk Items', count: riskItems.length },
                    { key: 'bundles', icon: FaBoxes, label: 'Smart Bundles', count: bundles.length },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <tab.icon size={12} />
                        {tab.label}
                        {tab.count !== null && tab.count > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.key ? 'bg-[#17A2B8]/10 text-[#1B4F72]' : 'bg-slate-200 text-slate-500'}`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>


            {/* ═══════════ TAB: RISK ITEMS TABLE ═══════════════════════ */}
            {activeTab === 'risk' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Table Header */}
                    <div className="p-5 border-b border-slate-100">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Priority Actions Required</h2>
                                <p className="text-sm text-slate-500">Optimized discount recommendations for near-expiry items</p>
                            </div>

                        </div>

                        {/* Search & Filter Bar */}
                        <div className="mt-4 flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                                <input
                                    type="text"
                                    placeholder="Search by name, SKU or category..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-[#17A2B8] transition-all"
                                />
                            </div>

                            <div className="relative">
                                <FaExclamationTriangle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                                <select
                                    value={filterRisk}
                                    onChange={e => setFilterRisk(e.target.value)}
                                    className="pl-8 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] appearance-none cursor-pointer"
                                >
                                    {['All', 'Critical', 'High', 'Medium', 'Low'].map(r => <option key={r}>{r}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Bulk Actions Bar */}
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
                                            className="rounded border-slate-300 accent-[#1B4F72] cursor-pointer"
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
                                    <th className="px-4 py-3">AI Recommendation</th>
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
                                                transition: 'opacity 0.5s ease, transform 0.5s ease',
                                                opacity: isResolving ? 0 : 1,
                                                transform: isResolving ? 'translateX(40px)' : 'translateX(0)',
                                                pointerEvents: isResolving ? 'none' : 'auto',
                                                backgroundColor: isSelected ? '#f0f4ff' : undefined,
                                            }}
                                            className={`border-b border-slate-100 hover:bg-slate-50 transition-colors group ${isResolving ? 'bg-emerald-50' : ''}`}
                                        >
                                            <td className="px-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(item.id)}
                                                    className="rounded border-slate-300 accent-[#1B4F72] cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-4 py-4 max-w-[200px]">
                                                <div className="font-semibold text-slate-900 truncate">{item.productName}</div>
                                                <div className="text-slate-400 text-xs mt-0.5">{item.sku} · {item.category}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">{item.closingStock} units</div>
                                            </td>
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

                                            <td className="px-4 py-4">
                                                <SmartDiscountBadge
                                                    item={item}
                                                    smartDiscounts={smartDiscounts}
                                                    onFetchDiscount={fetchSmartDiscount}
                                                />
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-16 text-center text-slate-400">
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
                                {filterRisk !== 'All' || searchQuery ? ` (filtered from ${riskItems.length})` : ''}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                                Live monitoring active
                            </span>
                        </div>
                    )}
                </div>
            )}


            {/* ═══════════ TAB: SMART BUNDLES ═══════════════════════════ */}
            {activeTab === 'bundles' && (
                <div className="space-y-4">
                    {bundles.length > 0 ? bundles.map((bundle) => (
                        <div key={bundle.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <FaBoxes className="text-[#17A2B8]" />
                                        Smart Bundle Suggestion
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">Pair these near-expiry items for better sell-through</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                    Save {bundle.savingsPercent}%
                                </span>
                            </div>

                            <div className="mt-4 flex flex-col sm:flex-row gap-3">
                                {bundle.items.map((item, idx) => (
                                    <React.Fragment key={item.sku}>
                                        <div className="flex-1 bg-slate-50 rounded-lg p-3 border border-slate-100">
                                            <p className="font-semibold text-sm text-slate-900 truncate">{item.name}</p>
                                            <p className="text-xs text-slate-400">{item.sku}</p>
                                        </div>
                                        {idx < bundle.items.length - 1 && (
                                            <div className="flex items-center justify-center text-slate-300 font-bold text-lg">+</div>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>


                        </div>
                    )) : (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <FaBoxes className="mx-auto text-slate-300 mb-3" size={36} />
                            <p className="font-semibold text-slate-600">No bundle suggestions available</p>
                            <p className="text-sm text-slate-400 mt-1">Bundles are generated when multiple items from different categories are expiring soon.</p>
                        </div>
                    )}
                </div>
            )}

            {simulationModalItem && (
                <OptimalSimulationModal
                    item={simulationModalItem}
                    onClose={() => setSimulationModalItem(null)}
                    onApply={(res) => {
                        setSmartDiscounts(prev => ({
                            ...prev,
                            [simulationModalItem.sku]: res
                        }));
                        setSimulationModalItem(null);
                    }}
                />
            )}

        </div>
    );
};

export default WastagePrevention;
