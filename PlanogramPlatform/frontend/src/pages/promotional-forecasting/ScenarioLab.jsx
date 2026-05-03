import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Beaker, MapPin, TrendingUp, Bot, AlertTriangle, CheckCircle2,
  ArrowRightLeft, Loader2, AlertCircle, Info, BookOpen, X,
  FlaskConical, Cpu, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

/* ─── Helper Components ─────────────────────────────────────────── */
const Pill = ({ children, variant = 'neutral' }) => {
  const cls = {
    neutral: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-cyan-100 text-[#17A2B8]',
    red: 'bg-red-100 text-red-600',
  }[variant];
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${cls}`}>{children}</span>;
};

const StatCard = ({ label, value, sub, accent, unit, formulaHint }) => {
  const [showHint, setShowHint] = useState(false);
  return (
    <div className={`rounded-2xl p-4 border ${accent} relative`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-60">{label}</p>
        {unit && <span className="text-[9px] font-bold bg-white/50 border border-current/10 px-1.5 py-0.5 rounded-full opacity-50">{unit}</span>}
      </div>
      <p className="text-xl font-black leading-none">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-50">{sub}</p>}
      {formulaHint && (
        <button
          onMouseEnter={() => setShowHint(true)}
          onMouseLeave={() => setShowHint(false)}
          className="absolute top-3 right-3 text-current opacity-30 hover:opacity-60 transition-opacity"
        >
          <Info size={11} />
        </button>
      )}
      <AnimatePresence>
        {showHint && formulaHint && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute top-full left-0 mt-1 w-full bg-slate-900 text-white text-[10px] rounded-xl p-2.5 z-50 shadow-xl font-mono">
            {formulaHint}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Planogram Shelf ───────────────────────────────────────────── */
const PlanogramShelf = ({ facings, colorClass = "bg-[#17A2B8]" }) => (
  <div className="mt-4">
    <div className="flex justify-between items-center mb-3">
      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Visual Shelf</p>
      <p className="text-xs font-semibold text-slate-700">{facings} Facing{facings !== 1 ? 's' : ''}</p>
    </div>
    <div className="bg-gradient-to-r from-slate-100 to-slate-200 h-8 w-full rounded-lg relative overflow-hidden border border-slate-300">
      <div className="absolute inset-0 flex items-center gap-1 px-2">
        {Array.from({ length: Math.min(facings, 20) }).map((_, i) => (
          <motion.div key={i} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.02 }}
            className={`flex-1 h-6 rounded-md shadow-sm border border-black/15 ${colorClass} hover:shadow-md transition-shadow`} />
        ))}
        {facings > 20 && <span className="ml-2 text-xs font-bold text-slate-600 flex-shrink-0">+{facings - 20}</span>}
        {facings === 0 && <span className="text-sm text-slate-400 italic">Empty Shelf</span>}
      </div>
    </div>
  </div>
);

/* ─── Full Planogram Shelf ──────────────────────────────────────── */
const FullPlanogramShelf = ({ items = [], products = [] }) => {
  const colors = [
    "bg-[#E0F7FA] text-[#006064] border-[#B2EBF2]", "bg-[#F1F8E9] text-[#33691E] border-[#DCEDC8]",
    "bg-[#FCE4EC] text-[#880E4F] border-[#F8BBD0]", "bg-[#FFF8E1] text-[#FF6F00] border-[#FFECB3]",
    "bg-[#E8EAF6] text-[#1A237E] border-[#C5CAE9]", "bg-[#F3E5F5] text-[#4A148C] border-[#E1BEE7]",
    "bg-[#E3F2FD] text-[#0D47A1] border-[#BBDEFB]", "bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]"
  ];

  const shelfBoxes = [];
  items.forEach((item, index) => {
    const itemSku = item.sku || item.product_id || 'UNK';
    const prod = products.find(p =>
      (item.product_id && p._id === item.product_id) ||
      (p.sku && item.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) ||
      (p.sku === itemSku || p._id === itemSku)
    );
    const color = colors[index % colors.length];
    const name = prod?.productName || itemSku;
    for (let i = 0; i < item.facings; i++) shelfBoxes.push({ color, name, sku: itemSku });
  });

  const displayBoxes = shelfBoxes.slice(0, 30);
  const hiddenCount = shelfBoxes.length - 30;
  if (items.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm font-bold text-slate-700">Planogram Layout</p>
          <p className="text-xs text-slate-500 mt-0.5">{shelfBoxes.length} total facings</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-5">
        {items.map((item, index) => {
          const itemSku = item.sku || item.product_id || 'UNK';
          const prod = products.find(p =>
            (item.product_id && p._id === item.product_id) ||
            (p.sku && item.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) ||
            (p.sku === itemSku || p._id === itemSku)
          );
          const name = prod?.productName || itemSku;
          return (
            <motion.div key={index + '-' + itemSku} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: index * 0.05 }}
              className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px]">
              <div className={`w-2.5 h-2.5 rounded-full border ${colors[index % colors.length]}`}></div>
              <span className="font-medium truncate max-w-[120px]" title={name}>{name} (x{item.facings})</span>
            </motion.div>
          );
        })}
      </div>
      <div className="bg-gradient-to-b from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200 min-h-[120px] flex items-center justify-center">
        <div className="flex items-end gap-1 w-full h-20 px-2">
          {displayBoxes.map((box, i) => (
            <motion.div key={i} initial={{ height: 0, opacity: 0 }} animate={{ height: '100%', opacity: 1 }} transition={{ delay: i * 0.02 }}
              className={`flex-1 rounded-t-md shadow-sm border border-black/10 ${box.color} group relative hover:shadow-md transition-shadow`} title={box.name}>
              <div className="absolute bottom-1 left-1 text-[7px] font-bold opacity-70 truncate max-w-[20px]">
                {String(box.sku).substring(0, 3)}
              </div>
            </motion.div>
          ))}
          {hiddenCount > 0 && (
            <div className="flex items-end justify-center min-w-[40px] h-20">
              <span className="text-sm font-bold text-slate-600">+{hiddenCount}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ─── How It Works Panel ────────────────────────────────────────── */
const HowItWorksPanel = ({ onClose }) => (
  <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
    className="fixed right-0 top-0 h-full w-full max-w-md bg-white border-l border-slate-200 shadow-2xl z-50 overflow-y-auto">
    <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#1B4F72]/10 flex items-center justify-center">
          <BookOpen size={14} className="text-[#1B4F72]" />
        </div>
        <span className="font-bold text-slate-800 text-sm">How Scenario Lab Works</span>
      </div>
      <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition">
        <X size={14} />
      </button>
    </div>

    <div className="p-6 space-y-6 text-sm">

      {/* Planogram + Promo Tab */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ArrowRightLeft size={14} className="text-[#17A2B8]" />
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Planogram + Promo Comparison</span>
        </div>
        <div className="space-y-3">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <p className="font-semibold text-slate-700 text-xs mb-2">What it does</p>
            <p className="text-slate-500 text-xs leading-relaxed">Compares two shelf setups (current vs proposed) and simulates the revenue and profit impact of changing both facings and discount simultaneously. Uses the S-Learner uplift model for demand estimation.</p>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Units Sold', formula: 'Baseline × (1 + uplift_rate × facings_factor)', unit: 'units' },
              { label: 'Revenue', formula: 'Units × Price × (1 − Discount)', unit: 'LKR' },
              { label: 'Profit', formula: 'Units × (Price × (1−Discount) − Cost)', unit: 'LKR' },
              { label: 'Revenue Lift', formula: 'Proposed Revenue − Current Revenue', unit: 'LKR delta' },
              { label: 'Profit Lift', formula: 'Proposed Profit − Current Profit', unit: 'LKR delta' },
            ].map(({ label, formula, unit }) => (
              <div key={label} className="bg-white border border-slate-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-700 text-xs">{label}</span>
                  <span className="text-[9px] bg-[#17A2B8]/10 text-[#17A2B8] font-bold px-1.5 py-0.5 rounded-full">{unit}</span>
                </div>
                <code className="text-[10px] font-mono text-slate-500 block leading-relaxed">{formula}</code>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Demand Forecast Tab */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-[#17A2B8]" />
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Demand Forecast</span>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-3">
          <p className="font-semibold text-slate-700 text-xs mb-2">What it does</p>
          <p className="text-slate-500 text-xs leading-relaxed">The Hybrid Forecaster (Random Forest, 300 trees) generates a day-by-day demand prediction using historical lag features, rolling means, and seasonal signals. Event markers (holidays, weekends) are overlaid on the chart.</p>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Predicted Demand', formula: 'expm1(RF.predict(log-features))', unit: 'units/day' },
            { label: 'Event Impact', formula: 'Multiplicative factor from event calendar', unit: 'scalar' },
            { label: 'Chart X-axis', formula: 'Date (daily or weekly aggregation ≥180d)', unit: 'MM/DD' },
            { label: 'Chart Y-axis', formula: 'Predicted demand', unit: 'units' },
          ].map(({ label, formula, unit }) => (
            <div key={label} className="bg-white border border-slate-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 text-xs">{label}</span>
                <span className="text-[9px] bg-[#17A2B8]/10 text-[#17A2B8] font-bold px-1.5 py-0.5 rounded-full">{unit}</span>
              </div>
              <code className="text-[10px] font-mono text-slate-500 block">{formula}</code>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Cpu size={14} className="text-[#17A2B8]" />
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">ML Features Used</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'price_index', desc: 'Relative price vs category avg' },
            { name: 'discount_depth', desc: 'Promo magnitude 0–1' },
            { name: 'lag_1 / lag_7', desc: 'Recent sales history' },
            { name: 'rolling_mean_30', desc: '30-day demand average' },
            { name: 'event_impact', desc: 'Holiday/seasonal factor' },
            { name: 'is_rainy', desc: 'Weather demand adjustment' },
            { name: 'month_sin', desc: 'Cyclical month encoding' },
            { name: 'is_weekend', desc: 'Weekend demand uplift' },
          ].map(({ name, desc }) => (
            <div key={name} className="bg-white border border-slate-100 rounded-lg p-2.5">
              <code className="text-[10px] font-mono font-bold text-[#1B4F72]">{name}</code>
              <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={13} className="text-amber-500" />
          <span className="font-bold text-amber-700 text-xs">AI Output Disclaimer</span>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          All scenario outputs are statistical estimates. The MIP solver optimises based on historical patterns — actual results depend on competitor behaviour, supply availability, and market conditions. <strong>Always validate before implementation.</strong>
        </p>
      </div>
    </div>
  </motion.div>
);

/* ─── Main Component ────────────────────────────────────────────── */
const ScenarioLab = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('compare');
  const [storeLocation, setStoreLocation] = useState('Colombo');
  const [loading, setLoading] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const [compareSim, setCompareSim] = useState({
    skuId: '', currDiscount: 0, currFacings: 4,
    propDiscount: 15, propFacings: 6, duration: 14,
    loadedPlanogramItems: [], selectedLevel: 'All'
  });
  const [compareResult, setCompareResult] = useState(null);

  const [trendDays, setTrendDays] = useState(30);
  const [trendSkuId, setTrendSkuId] = useState('');
  const [trendResult, setTrendResult] = useState(null);

  const [products, setProducts] = useState([]);
  const [planograms, setPlanograms] = useState([]);
  const [fixtures, setFixtures] = useState([]);

  useEffect(() => {
    if (user?.store?.location?.city) setStoreLocation(user.store.location.city);
  }, [user]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const prodResponse = await axios.get('http://localhost:3000/api/products', { withCredentials: true });
        setProducts(prodResponse.data);
        if (prodResponse.data?.length > 0) {
          const firstProd = prodResponse.data[0];
          const sku = firstProd.sku || firstProd._id;
          setCompareSim(prev => ({ ...prev, skuId: sku }));
          setTrendSkuId(sku);
        }
        const planRes = await axios.get('http://localhost:3000/api/planograms/optimization/runs', { withCredentials: true });
        if (planRes.data && Array.isArray(planRes.data)) setPlanograms(planRes.data);
        const shelfRes = await axios.get('http://localhost:3000/api/planograms/shelves', { withCredentials: true });
        if (shelfRes.data && Array.isArray(shelfRes.data)) setFixtures(shelfRes.data);
      } catch (err) {
        console.error("Failed to fetch initial scenario data:", err);
      }
    };
    fetchInitialData();
  }, []);

  const handleLoadPlanogram = (runId) => {
    const run = planograms.find(r => r._id === runId);
    if (!run?.resultingPlacements) {
      setCompareSim(prev => ({ ...prev, loadedPlanogramItems: [], selectedLevel: 'All' }));
      return;
    }
    const items = Array.isArray(run.resultingPlacements) ? run.resultingPlacements : [];
    const itemLayout = items.find(item => (item.sku || item.product_id) === compareSim.skuId);
    let newFacings = compareSim.currFacings;
    let newSkuId = compareSim.skuId;
    if (itemLayout?.facings) {
      newFacings = itemLayout.facings;
    } else if (items.length > 0) {
      newSkuId = items[0].sku || items[0].product_id;
      newFacings = items[0].facings;
    }
    setCompareSim(prev => ({ ...prev, skuId: newSkuId, currFacings: newFacings, loadedPlanogramItems: items, selectedLevel: 'All' }));
  };

  const getFullProductDetails = (skuId) => {
    const prod = products.find(p => p.sku === skuId || p._id === skuId);
    if (prod) {
      return {
        sku_id: skuId, category: prod.category || 'General', brand: prod.brand || 'Unknown',
        base_price: prod.baseUnitPriceLKR || prod.price || 1000,
        cost_price: prod.unitCostLKR || prod.costPrice || (prod.baseUnitPriceLKR ? prod.baseUnitPriceLKR * 0.7 : 600),
        stock_level: prod.currentStock || prod.quantity || 100
      };
    }
    return { sku_id: skuId, category: "Test", brand: "Test", base_price: 1000, cost_price: 600, stock_level: 100 };
  };

  const handleCompare = async () => {
    setLoading(true);
    try {
      const payload = {
        sku: getFullProductDetails(compareSim.skuId),
        current_discount: compareSim.currDiscount / 100,
        current_facings: compareSim.currFacings,
        proposed_discount: compareSim.propDiscount / 100,
        proposed_facings: compareSim.propFacings,
        duration_days: compareSim.duration,
        location: storeLocation
      };
      const response = await axios.post('http://localhost:3000/api/scenario/planogram-promo', payload, { withCredentials: true });
      setCompareResult(response.data);
    } catch (error) {
      alert("Comparison failed: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFetchTrend = async () => {
    setLoading(true);
    try {
      const payload = { sku: getFullProductDetails(trendSkuId), days: trendDays, location: storeLocation };
      const response = await axios.post('http://localhost:3000/api/scenario/future-trend', payload, { withCredentials: true });
      setTrendResult(response.data);
    } catch (error) {
      alert("Trend fetch failed: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Selected product details for formula display
  const selectedProduct = products.find(p => p.sku === compareSim.skuId || p._id === compareSim.skuId);
  const basePrice = selectedProduct?.baseUnitPriceLKR || selectedProduct?.price || 0;
  const costPrice = selectedProduct?.unitCostLKR || selectedProduct?.costPrice || 0;
  const currPromoPrice = basePrice * (1 - compareSim.currDiscount / 100);
  const propPromoPrice = basePrice * (1 - compareSim.propDiscount / 100);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* How It Works overlay */}
      <AnimatePresence>
        {showHowItWorks && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40" onClick={() => setShowHowItWorks(false)} />
            <HowItWorksPanel onClose={() => setShowHowItWorks(false)} />
          </>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="px-6 pt-8 pb-6 max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#1B4F72] flex items-center justify-center shadow-lg shadow-[#1B4F72]/20">
                <Beaker size={20} className="text-white" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Scenario Lab</h1>
            </div>
            <p className="text-sm text-slate-500 ml-13">Experiment with planogram setups, promotions, and future demand scenarios.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowHowItWorks(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-[#17A2B8] hover:text-[#17A2B8] transition-all shadow-sm">
              <BookOpen size={13} />
              How It Works
            </button>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white px-4 py-3 rounded-xl border border-slate-200 flex items-center gap-2 shadow-sm">
              <MapPin size={16} className="text-slate-400 shrink-0" />
              <span className="text-sm font-semibold text-slate-700">{storeLocation || 'Global'}</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 inline-flex w-full gap-1">
          {[
            { id: 'compare', label: 'Planogram + Promo', icon: ArrowRightLeft },
            { id: 'trend', label: 'Demand Forecast', icon: TrendingUp }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl transition-all ${activeTab === tab.id ? 'bg-[#1B4F72] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </motion.div>
      </div>

      {/* Content Area */}
      <div className="px-6 pb-12 pt-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">

          {/* ── Compare Tab ── */}
          {activeTab === 'compare' && (
            <motion.div key="compare" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">

              {/* Left Panel */}
              <div className="space-y-5">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-400 mb-4">Setup Configuration</p>

                    <div className="space-y-2 mb-4">
                      <label className="block text-xs font-semibold text-slate-700">Store Planogram</label>
                      <select className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/40 focus:border-[#1B4F72] transition"
                        onChange={e => handleLoadPlanogram(e.target.value)} defaultValue="">
                        <option value="" disabled>Select configuration...</option>
                        {planograms.map(plan => (
                          <option key={plan._id} value={plan._id}>
                            {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : 'Unknown'} (Score: {(plan.bestScore || 0).toFixed(1)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {compareSim.loadedPlanogramItems.length > 0 && (() => {
                      const availableLevels = [...new Set(compareSim.loadedPlanogramItems.map(item => item.level_id || 'Level 1'))].sort();
                      return (
                        <div className="space-y-2 mb-4 pb-4 border-b border-slate-100">
                          <label className="block text-xs font-semibold text-slate-700">Shelf Level</label>
                          <select className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/40 focus:border-[#1B4F72] transition"
                            value={compareSim.selectedLevel}
                            onChange={e => {
                              const lvl = e.target.value;
                              const filteredItems = lvl === 'All' ? compareSim.loadedPlanogramItems : compareSim.loadedPlanogramItems.filter(i => (i.level_id || 'Level 1').toString() === lvl);
                              let newSkuId = compareSim.skuId;
                              let newFacings = compareSim.currFacings;
                              if (filteredItems.length > 0 && !filteredItems.find(i => (i.sku || i.product_id) === newSkuId)) {
                                newSkuId = filteredItems[0].sku || filteredItems[0].product_id;
                                newFacings = filteredItems[0].facings;
                              }
                              setCompareSim({ ...compareSim, selectedLevel: lvl, skuId: newSkuId, currFacings: newFacings });
                            }}>
                            <option value="All">All Shelves</option>
                            {availableLevels.map(lvl => <option key={lvl} value={lvl}>Level {lvl}</option>)}
                          </select>
                        </div>
                      );
                    })()}

                    <div className="space-y-2 mb-5 p-3 bg-[#1B4F72]/5 rounded-xl border border-[#1B4F72]/15">
                      <label className="block text-xs font-bold text-[#1B4F72] uppercase tracking-wide">Select Product</label>
                      <select className="w-full p-3 border border-[#1B4F72]/30 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/40 focus:border-[#1B4F72] transition"
                        value={compareSim.skuId}
                        onChange={e => {
                          const newSku = e.target.value;
                          const itemLayout = compareSim.loadedPlanogramItems.find(i => (i.sku || i.product_id) === newSku);
                          setCompareSim({ ...compareSim, skuId: newSku, currFacings: itemLayout ? itemLayout.facings : compareSim.currFacings });
                        }}>
                        {(() => {
                          const displayedItems = compareSim.selectedLevel === 'All' ? compareSim.loadedPlanogramItems : compareSim.loadedPlanogramItems.filter(item => (item.level_id || 'Level 1').toString() === compareSim.selectedLevel.toString());
                          let optionsToMap = products;
                          if (compareSim.loadedPlanogramItems.length > 0) {
                            const uniqueSkusOnLevel = [...new Set(displayedItems.map(i => i.sku || i.product_id))];
                            optionsToMap = uniqueSkusOnLevel.map(sku => products.find(p => (p.sku && sku && p.sku.toLowerCase() === sku.toLowerCase()) || p._id === sku)).filter(Boolean);
                          }
                          if (optionsToMap.length === 0) return <option value="" disabled>No products</option>;
                          return optionsToMap.map(prod => <option key={prod._id} value={prod.sku || prod._id}>{prod.productName}</option>);
                        })()}
                      </select>
                    </div>
                  </div>

                  {/* Price context strip */}
                  {basePrice > 0 && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Price Context (LKR)</p>
                      <div className="flex items-center justify-between text-xs">
                        <div><span className="text-slate-500">Base: </span><span className="font-bold text-slate-800">Rs. {basePrice.toLocaleString()}</span></div>
                        <div><span className="text-slate-500">Cost: </span><span className="font-bold text-slate-800">Rs. {costPrice.toLocaleString()}</span></div>
                        <div><span className="text-slate-500">Margin: </span><span className="font-bold text-emerald-700">Rs. {(basePrice - costPrice).toLocaleString()}</span></div>
                      </div>
                    </div>
                  )}

                  {/* Current Setup */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">Current Setup</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 mb-1.5 block">Facings</label>
                        <input type="number" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/40"
                          value={compareSim.currFacings} onChange={e => setCompareSim({ ...compareSim, currFacings: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 mb-1.5 block">Discount %</label>
                        <input type="number" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/40"
                          value={compareSim.currDiscount} onChange={e => setCompareSim({ ...compareSim, currDiscount: Number(e.target.value) })} />
                      </div>
                    </div>
                    {basePrice > 0 && (
                      <p className="text-[11px] text-slate-500 mb-2 font-mono">
                        Promo price: Rs. {currPromoPrice.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
                        <span className="text-slate-400"> = {basePrice.toLocaleString()} × {(1 - compareSim.currDiscount / 100).toFixed(2)}</span>
                      </p>
                    )}
                    <PlanogramShelf facings={compareSim.currFacings} colorClass="bg-slate-500" />
                  </div>

                  {/* Proposed Setup */}
                  <div className="bg-[#1B4F72]/5 p-4 rounded-xl border border-[#1B4F72]/15">
                    <p className="text-xs font-bold text-[#1B4F72] mb-3 uppercase tracking-wide">Proposed Setup</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-[10px] font-semibold text-[#1B4F72] mb-1.5 block">Facings</label>
                        <input type="number" className="w-full p-2.5 border border-[#1B4F72]/30 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/40"
                          value={compareSim.propFacings} onChange={e => setCompareSim({ ...compareSim, propFacings: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-[#1B4F72] mb-1.5 block">Discount %</label>
                        <input type="number" className="w-full p-2.5 border border-[#1B4F72]/30 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/40"
                          value={compareSim.propDiscount} onChange={e => setCompareSim({ ...compareSim, propDiscount: Number(e.target.value) })} />
                      </div>
                    </div>
                    {basePrice > 0 && (
                      <p className="text-[11px] text-[#1B4F72]/70 mb-2 font-mono">
                        Promo price: Rs. {propPromoPrice.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
                        <span className="text-[#1B4F72]/50"> = {basePrice.toLocaleString()} × {(1 - compareSim.propDiscount / 100).toFixed(2)}</span>
                      </p>
                    )}
                    <PlanogramShelf facings={compareSim.propFacings} colorClass="bg-[#1B4F72]" />
                  </div>

                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCompare} disabled={loading}
                    className="w-full bg-gradient-to-r from-[#1B4F72] to-[#164060] hover:shadow-lg hover:shadow-[#1B4F72]/30 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
                    {loading ? <><Loader2 size={16} className="animate-spin" />Evaluating...</> : 'Evaluate Setups'}
                  </motion.button>
                </div>
              </div>

              {/* Right Panel */}
              <div className="space-y-5">
                {compareSim.loadedPlanogramItems?.length > 0 && (
                  <FullPlanogramShelf
                    items={compareSim.selectedLevel === 'All' ? compareSim.loadedPlanogramItems : compareSim.loadedPlanogramItems.filter(item => (item.level_id || 'Level 1').toString() === compareSim.selectedLevel.toString())}
                    products={products}
                  />
                )}

                <AnimatePresence mode="wait">
                  {!compareResult && !loading && (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center h-80 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                      <ArrowRightLeft size={48} className="text-slate-300 mb-4" />
                      <p className="text-slate-500 font-semibold">Configure and evaluate</p>
                      <p className="text-sm text-slate-400 mt-1">to compare scenarios</p>
                      <button onClick={() => setShowHowItWorks(true)}
                        className="mt-3 text-xs font-semibold text-[#17A2B8] hover:underline flex items-center gap-1">
                        <Info size={11} /> Learn how comparison works
                      </button>
                    </motion.div>
                  )}

                  {loading && (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="bg-white rounded-2xl border border-slate-100 p-8 space-y-4">
                      {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
                    </motion.div>
                  )}

                  {compareResult && (
                    <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                      className="space-y-5">

                      {/* AI Disclaimer */}
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                        <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                        <p className="text-[11px] text-amber-700 font-semibold">AI estimate — validate with actual store data before implementation</p>
                      </div>

                      {/* Verdict */}
                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3">
                        <CheckCircle2 size={20} className="text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <h3 className="font-bold text-emerald-900 text-sm">
                            Recommended: {compareResult.verdict?.recommended_setup || 'Unknown'}
                          </h3>
                          <p className="text-sm text-emerald-800 mt-1">{compareResult.verdict?.justification || ''}</p>
                        </div>
                      </div>

                      {/* Units grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <StatCard label="Current Units" value={`${(compareResult.current?.units || 0).toFixed(0)}`}
                          unit="units" formulaHint="Baseline × (1 + uplift_rate × facings_factor)"
                          accent={compareResult.verdict?.recommended_setup === 'Current Setup' ? 'border-[#1B4F72] bg-[#1B4F72]/5 text-[#1B4F72]' : 'border-slate-200 bg-slate-50 text-slate-700'} />
                        <StatCard label="Proposed Units" value={`${(compareResult.proposed?.units || 0).toFixed(0)}`}
                          unit="units" formulaHint="Baseline × (1 + uplift_rate × new_facings_factor)"
                          accent={compareResult.verdict?.recommended_setup === 'Proposed Setup' ? 'border-[#1B4F72] bg-[#1B4F72]/5 text-[#1B4F72]' : 'border-slate-200 bg-slate-50 text-slate-700'} />
                      </div>

                      {/* Revenue & Profit */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white border border-slate-200 rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Revenue Lift</p>
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">LKR · delta</span>
                          </div>
                          <p className={`text-xl font-black ${(compareResult.delta?.revenue || 0) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {(compareResult.delta?.revenue || 0) > 0 ? '+' : ''}Rs. {((compareResult.delta?.revenue || 0) / 1000).toFixed(1)}k
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">Proposed Revenue − Current Revenue</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Profit Lift</p>
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">LKR · delta</span>
                          </div>
                          <p className={`text-xl font-black ${(compareResult.delta?.profit || 0) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {(compareResult.delta?.profit || 0) > 0 ? '+' : ''}Rs. {((compareResult.delta?.profit || 0) / 1000).toFixed(1)}k
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">Proposed Profit − Current Profit</p>
                        </div>
                      </div>

                      {/* Detailed Comparison */}
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'Current Setup', data: compareResult.current, discount: compareSim.currDiscount, facings: compareSim.currFacings },
                          { label: 'Proposed Setup', data: compareResult.proposed, discount: compareSim.propDiscount, facings: compareSim.propFacings },
                        ].map(({ label, data, discount, facings }) => (
                          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4">
                            <h4 className="font-bold text-slate-800 text-sm mb-3">{label}</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Discount</span>
                                <span className="font-bold text-slate-700">{discount}%</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Facings</span>
                                <span className="font-bold text-slate-700">{facings}</span>
                              </div>
                              <div className="border-t border-slate-100 pt-2">
                                <p className="text-xs text-slate-600">Revenue</p>
                                <p className="font-bold text-slate-800">Rs. {((data?.revenue || 0) / 1000).toFixed(1)}k <span className="text-[10px] font-normal text-slate-400">LKR</span></p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ── Trend Tab ── */}
          {activeTab === 'trend' && (
            <motion.div key="trend" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Demand Forecast</h2>
                    <p className="text-sm text-slate-500 mt-1">Hybrid RF model · day-by-day demand prediction with seasonal events.</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] bg-[#1B4F72]/10 text-[#1B4F72] font-bold px-2 py-0.5 rounded-full">Random Forest · 300 trees</span>
                      <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">Units/day</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-slate-700">Product:</label>
                      <select className="p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/40 flex-1 sm:flex-none"
                        value={trendSkuId} onChange={e => setTrendSkuId(e.target.value)}>
                        {products.length > 0 ? products.map(p => <option key={p._id} value={p.sku || p._id}>{p.productName}</option>) : <option value={trendSkuId}>Default</option>}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-slate-700">Horizon:</label>
                      <select className="p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/40 flex-1 sm:flex-none"
                        value={trendDays} onChange={e => setTrendDays(Number(e.target.value))}>
                        <option value={14}>14 Days</option>
                        <option value={30}>30 Days</option>
                        <option value={90}>90 Days</option>
                        <option value={180}>6 Months</option>
                        <option value={365}>1 Year</option>
                      </select>
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleFetchTrend} disabled={loading}
                      className="bg-[#1B4F72] hover:bg-[#164060] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-[#1B4F72]/20 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
                      {loading ? <><Loader2 size={14} className="animate-spin" />Loading...</> : 'Fetch Forecast'}
                    </motion.button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {!trendResult && !loading && (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center h-64 text-slate-400">
                      <TrendingUp size={56} className="mb-4 opacity-20" />
                      <p className="font-semibold">Configure and fetch</p>
                      <p className="text-sm mt-1">to view demand trends</p>
                      <button onClick={() => setShowHowItWorks(true)}
                        className="mt-3 text-xs font-semibold text-[#17A2B8] hover:underline flex items-center gap-1">
                        <Info size={11} /> How is this forecast computed?
                      </button>
                    </motion.div>
                  )}

                  {loading && (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                      <div className="h-72 bg-slate-100 rounded-xl animate-pulse" />
                    </motion.div>
                  )}

                  {trendResult && (
                    <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">

                      {/* Disclaimer */}
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                        <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                        <p className="text-[11px] text-amber-700 font-semibold">Statistical forecast — verify against actual sales before making stocking decisions</p>
                      </div>

                      {/* Event Narrative */}
                      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                        className={`p-4 rounded-xl border flex gap-3 ${trendResult.events?.length > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                        {trendResult.events?.length > 0 ? <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" /> : <Bot size={18} className="text-slate-400 mt-0.5 shrink-0" />}
                        <div>
                          <h4 className="font-bold text-sm mb-1">{trendResult.readiness_status}</h4>
                          <p className="text-sm">{trendResult.event_narrative}</p>
                        </div>
                      </motion.div>

                      {/* Chart */}
                      {(() => {
                        let chartData = trendResult.trend;
                        if (trendDays >= 180 && chartData.length > 0) {
                          const weeklyData = [];
                          let sum = 0, count = 0, weekStart = chartData[0].date;
                          for (let i = 0; i < chartData.length; i++) {
                            sum += chartData[i].predicted_demand; count++;
                            if (count === 7 || i === chartData.length - 1) {
                              weeklyData.push({ date: weekStart, predicted_demand: Number((sum / count).toFixed(2)) });
                              sum = 0; count = 0;
                              if (i + 1 < chartData.length) weekStart = chartData[i + 1].date;
                            }
                          }
                          chartData = weeklyData;
                        }
                        return (
                          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="h-80 bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-2xl border border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Predicted Demand · units{trendDays >= 180 ? '/week avg' : '/day'}</span>
                              <span className="text-[10px] text-slate-400 font-mono">expm1(RF.predict(features))</span>
                            </div>
                            <ResponsiveContainer width="100%" height="90%">
                              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="date" tickFormatter={(str) => { const d = new Date(str); return `${d.getMonth() + 1}/${d.getDate()}`; }} stroke="#94A3B8" fontSize={12} />
                                <YAxis stroke="#94A3B8" fontSize={12} label={{ value: 'units', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94A3B8' }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                  labelFormatter={(val) => new Date(val).toLocaleDateString()}
                                  formatter={(val) => [`${val} units`, 'Predicted Demand']} />
                                <Line type="monotone" dataKey="predicted_demand" stroke="#1B4F72" strokeWidth={3} dot={false} activeDot={{ r: 8 }} />
                                {trendResult.events?.map((evt, i) => {
                                  const evtTime = new Date(evt.date).getTime();
                                  const validChartDates = chartData.map(d => new Date(d.date).getTime());
                                  let closestDateStr = evt.date;
                                  if (validChartDates.length > 0) {
                                    const closestTime = validChartDates.reduce((prev, curr) => Math.abs(curr - evtTime) < Math.abs(prev - evtTime) ? curr : prev);
                                    const match = chartData.find(d => new Date(d.date).getTime() === closestTime);
                                    if (match) closestDateStr = match.date;
                                  }
                                  const shortName = evt.name.length > 20 ? evt.name.substring(0, 18) + '..' : evt.name;
                                  return (
                                    <ReferenceLine key={i} x={closestDateStr} stroke="#F59E0B" strokeDasharray="3 3"
                                      label={({ viewBox }) => {
                                        if (!viewBox) return null;
                                        return <text x={viewBox.x + 4} y={viewBox.y + 12 + (i % 4) * 15} fill="#D97706" fontSize={10} fontWeight="600" textAnchor="start">{shortName}</text>;
                                      }} />
                                  );
                                })}
                              </LineChart>
                            </ResponsiveContainer>
                          </motion.div>
                        );
                      })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ScenarioLab;