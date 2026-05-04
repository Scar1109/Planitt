import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Beaker, MapPin, TrendingUp, Bot, AlertTriangle, CheckCircle2,
  ArrowRightLeft, Loader2, AlertCircle, Info, BookOpen, X,
  FlaskConical, Cpu, ChevronDown, ChevronUp, PackageSearch, Tag, Calendar,
  ArrowUpRight, ArrowDownRight, Zap, Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const fmt = (n) => (n ?? 0).toLocaleString('en-LK', { maximumFractionDigits: 0 });
const sign = (n) => (n >= 0 ? '+' : '');
const isPos = (n) => n >= 0;

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
  if (!items || items.length === 0) return null;

  const colors = [
    "bg-[#E0F7FA] text-[#006064] border-[#B2EBF2]",
    "bg-[#F1F8E9] text-[#33691E] border-[#DCEDC8]",
    "bg-[#FCE4EC] text-[#880E4F] border-[#F8BBD0]",
    "bg-[#FFF8E1] text-[#FF6F00] border-[#FFECB3]",
    "bg-[#E8EAF6] text-[#1A237E] border-[#C5CAE9]",
    "bg-[#F3E5F5] text-[#4A148C] border-[#E1BEE7]",
    "bg-[#E3F2FD] text-[#0D47A1] border-[#BBDEFB]",
    "bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]"
  ];

  const shelfBoxes = [];
  items.forEach((item, index) => {
    const itemSku = item.sku || item.product_id || 'UNK';
    const prod = products.find(p => p.sku === itemSku || p._id === itemSku);
    const color = colors[index % colors.length];
    const name = prod?.productName || itemSku;
    for (let i = 0; i < (item.facings || 0); i++) {
      shelfBoxes.push({ color, name, sku: itemSku });
    }
  });

  const displayBoxes = shelfBoxes.slice(0, 30);
  const hiddenCount = shelfBoxes.length - 30;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mt-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
            <PackageSearch size={16} className="text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Planogram Layout Preview</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{shelfBoxes.length} total facings on shelf</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] mb-8">
        {items.map((item, index) => {
          const itemSku = item.sku || item.product_id || 'UNK';
          const prod = products.find(p => p.sku === itemSku || p._id === itemSku);
          const name = prod?.productName || itemSku;
          return (
            <div key={index} className="flex items-center gap-1.5 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
              <div className={`w-3 h-3 rounded-full border ${colors[index % colors.length]}`}></div>
              <span className="truncate max-w-[140px] font-medium text-slate-600">{name} (x{item.facings})</span>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-200 h-4 w-full rounded-xl relative mt-12 bg-opacity-60">
        <div className="absolute bottom-3 left-0 flex items-end px-3 w-full h-12 gap-[2px]">
          {displayBoxes.map((box, i) => (
            <div key={i} className={`flex-1 h-10 rounded-md shadow-sm border border-black/5 ${box.color}`} title={box.name} />
          ))}
          {hiddenCount > 0 && <span className="text-xs font-black text-slate-400 mb-1 ml-2 self-center">+{hiddenCount}</span>}
        </div>
      </div>
    </motion.div>
  );
};

/* ─── StatCard ──────────────────────────────────────────────────── */
const StatCard = ({ label, value, unit, accent, formulaHint }) => (
  <div className={`rounded-2xl border p-5 flex flex-col gap-1 transition-all ${accent}`}>
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">{label}</p>
      {unit && <span className="text-[9px] font-black bg-white/40 border border-current/10 px-2 py-0.5 rounded-full uppercase">{unit}</span>}
    </div>
    <p className="text-2xl font-black">{value}</p>
    {formulaHint && <p className="text-[9px] mt-2 font-mono opacity-50 border-t border-current/5 pt-2">{formulaHint}</p>}
  </div>
);

/* ─── How It Works Panel ────────────────────────────────────────── */
const HowItWorksPanel = ({ onClose }) => (
  <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
    className="fixed right-0 top-0 h-full w-full max-w-md bg-white border-l border-slate-200 shadow-2xl z-50 overflow-y-auto">
    <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-5 flex items-center justify-between z-10">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-[#1B4F72]/10 flex items-center justify-center">
          <BookOpen size={18} className="text-[#1B4F72]" />
        </div>
        <div>
          <p className="font-black text-slate-800 text-base leading-tight">Scenario Methodology</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Logic & Calculation Engine</p>
        </div>
      </div>
      <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition">
        <X size={16} />
      </button>
    </div>

    <div className="p-6 space-y-8 text-sm">
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ArrowRightLeft size={16} className="text-[#17A2B8]" />
          <span className="font-black text-slate-700 uppercase tracking-widest text-xs">Planogram + Promo Causal Link</span>
        </div>
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <p className="text-slate-600 text-xs leading-relaxed">
              This simulator evaluates the <strong>interaction effect</strong> between physical shelf presence (facings) and price depth.
              Changing facings adjusts the visibility factor, while discount triggers the price-elasticity uplift derived from the S-Learner XGBoost model.
            </p>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Units Sold', formula: 'Baseline × (1 + uplift_rate × facings_factor)', unit: 'units' },
              { label: 'Revenue', formula: 'Units × Price × (1 − Discount)', unit: 'LKR' },
              { label: 'Profit', formula: 'Units × (Price × (1−Discount) − Cost)', unit: 'LKR' },
            ].map(({ label, formula, unit }) => (
              <div key={label} className="bg-white border border-slate-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700 text-xs">{label}</span>
                  <span className="text-[9px] bg-slate-50 text-slate-400 font-bold px-2 py-0.5 rounded-full uppercase">{unit}</span>
                </div>
                <code className="text-[10px] font-mono text-[#1B4F72] block bg-slate-50/50 p-2 rounded-lg">{formula}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-[#17A2B8]" />
          <span className="font-black text-slate-700 uppercase tracking-widest text-xs">Hybrid Demand Forecaster</span>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4">
          <p className="text-slate-600 text-xs leading-relaxed">
            The forecaster utilizes a 300-tree Random Forest pipeline trained on LKR-denominated historical sales.
            It accounts for seasonality (Fourier transforms), lag features (1, 7, 30 days), and external event markers.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'price_index', desc: 'vs category avg' },
            { name: 'lag_1 / 7', desc: 'Recency bias' },
            { name: 'rolling_30', desc: 'Momentum' },
            { name: 'event_sin', desc: 'Seasonality' },
          ].map(({ name, desc }) => (
            <div key={name} className="bg-white border border-slate-100 rounded-xl p-3">
              <code className="text-[10px] font-mono font-bold text-[#1B4F72]">{name}</code>
              <p className="text-[9px] text-slate-400 mt-0.5 font-medium">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={15} className="text-amber-500" />
          <span className="font-black text-amber-700 text-xs uppercase tracking-widest">AI Disclaimer</span>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed font-medium">
          Statistical estimates are based on historical patterns. Actual market performance may vary due to competitor actions, supply chain disruptions, or macro-economic shifts. <strong>Always validate with domain experts.</strong>
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

  const selectedProduct = getFullProductDetails(compareSim.skuId);
  const basePrice = selectedProduct.base_price;
  const costPrice = selectedProduct.cost_price;
  const currPromoPrice = basePrice * (1 - compareSim.currDiscount / 100);
  const propPromoPrice = basePrice * (1 - compareSim.propDiscount / 100);

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showHowItWorks && <HowItWorksPanel onClose={() => setShowHowItWorks(false)} />}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 px-6 max-w-7xl mx-auto">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-[#1B4F72] flex items-center justify-center shadow-lg shadow-[#1B4F72]/20">
              <Beaker size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Scenario Lab</h1>
          </div>
          <p className="text-sm text-slate-500 font-medium">Experiment with \"What-If\" promotional strategies and store layouts.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm flex items-center gap-3">
            <MapPin size={16} className="text-[#17A2B8]" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Store</p>
              <p className="text-xs font-black text-slate-800">{storeLocation}</p>
            </div>
          </div>
          <button onClick={() => setShowHowItWorks(true)}
            className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#1B4F72] hover:border-[#1B4F72]/30 hover:bg-[#1B4F72]/5 transition-all shadow-sm">
            <Info size={20} />
          </button>
        </div>
      </div>

      <div className="px-6 max-w-7xl mx-auto">
        <div className="bg-white p-1.5 rounded-3xl shadow-sm border border-slate-200 inline-flex w-full gap-1.5">
          {[
            { id: 'compare', label: 'Planogram + Promo', icon: ArrowRightLeft },
            { id: 'trend', label: 'Demand Forecast', icon: TrendingUp }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 text-sm font-black rounded-2xl transition-all ${activeTab === tab.id ? 'bg-[#1B4F72] text-white shadow-xl shadow-[#1B4F72]/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-6 pb-12 pt-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'compare' && (
            <motion.div key="compare" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
              {/* Left Configuration Panel */}
              <div className="space-y-6">
                <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 space-y-6">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[.2em] text-slate-400 mb-5">Simulator Input</p>
                    
                    <div className="space-y-2 mb-4">
                      <label className="block text-xs font-bold text-slate-700">1. Baseline Planogram</label>
                      <select className="w-full p-4 border border-slate-200 rounded-2xl text-sm bg-white focus:outline-none focus:ring-4 focus:ring-[#1B4F72]/5 focus:border-[#1B4F72] transition-all"
                        onChange={e => handleLoadPlanogram(e.target.value)} defaultValue="">
                        <option value="" disabled>Select configuration...</option>
                        {planograms.map(plan => (
                          <option key={plan._id} value={plan._id}>
                            {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : 'Unknown'} (Score: {(plan.bestScore || 0).toFixed(1)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {compareSim.loadedPlanogramItems.length > 0 && (
                      <div className="space-y-2 mb-4 pb-4 border-b border-slate-100">
                        <label className="block text-xs font-bold text-slate-700">2. Active Shelf Row</label>
                        <select className="w-full p-4 border border-slate-200 rounded-2xl text-sm bg-white focus:outline-none focus:ring-4 focus:ring-[#1B4F72]/5 focus:border-[#1B4F72] transition-all"
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
                          <option value="All">All Combined Shelves</option>
                          {[...new Set(compareSim.loadedPlanogramItems.map(item => item.level_id || 'Level 1'))].sort().map(lvl => <option key={lvl} value={lvl}>Shelf ID: {lvl.substring(0, 8)}</option>)}
                        </select>
                      </div>
                    )}

                    <div className="space-y-2 mb-6 p-4 bg-[#1B4F72]/5 rounded-2xl border border-[#1B4F72]/10">
                      <label className="block text-xs font-black text-[#1B4F72] uppercase tracking-widest">3. Test Product</label>
                      <select className="w-full p-4 border border-[#1B4F72]/20 rounded-2xl text-sm bg-white focus:outline-none focus:ring-4 focus:ring-[#1B4F72]/10 focus:border-[#1B4F72] transition-all font-bold text-slate-700"
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
                          if (optionsToMap.length === 0) return <option value="" disabled>No products detected</option>;
                          return optionsToMap.map(prod => <option key={prod._id} value={prod.sku || prod._id}>{prod.productName}</option>);
                        })()}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[.15em]">Baseline Setup</p>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 mb-2 block">Facings</label>
                          <input type="number" className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-slate-400"
                            value={compareSim.currFacings} onChange={e => setCompareSim({ ...compareSim, currFacings: Number(e.target.value) })} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 mb-2 block">Discount %</label>
                          <input type="number" className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-slate-400"
                            value={compareSim.currDiscount} onChange={e => setCompareSim({ ...compareSim, currDiscount: Number(e.target.value) })} />
                        </div>
                      </div>
                      <PlanogramShelf facings={compareSim.currFacings} colorClass="bg-slate-400" />
                    </div>

                    <div className="bg-[#1B4F72]/5 p-5 rounded-[24px] border border-[#1B4F72]/15">
                      <p className="text-[10px] font-black text-[#1B4F72] mb-4 uppercase tracking-[.15em]">Proposed Setup</p>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-[10px] font-bold text-[#1B4F72] mb-2 block">Facings</label>
                          <input type="number" className="w-full p-3 border border-[#1B4F72]/20 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1B4F72]"
                            value={compareSim.propFacings} onChange={e => setCompareSim({ ...compareSim, propFacings: Number(e.target.value) })} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-[#1B4F72] mb-2 block">Discount %</label>
                          <input type="number" className="w-full p-3 border border-[#1B4F72]/20 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1B4F72]"
                            value={compareSim.propDiscount} onChange={e => setCompareSim({ ...compareSim, propDiscount: Number(e.target.value) })} />
                        </div>
                      </div>
                      <PlanogramShelf facings={compareSim.propFacings} colorClass="bg-[#1B4F72]" />
                    </div>
                  </div>

                  <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={handleCompare} disabled={loading}
                    className="w-full bg-[#1B4F72] hover:bg-[#164060] text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-[#1B4F72]/20 flex items-center justify-center gap-3">
                    {loading ? <><Loader2 size={20} className="animate-spin" />Running Simulation...</> : <><FlaskConical size={20} /> Evaluate Setups</>}
                  </motion.button>
                </div>
              </div>

              {/* Right Results Panel */}
              <div className="space-y-8">
                {compareSim.loadedPlanogramItems?.length > 0 && (
                  <FullPlanogramShelf
                    items={compareSim.selectedLevel === 'All' ? compareSim.loadedPlanogramItems : compareSim.loadedPlanogramItems.filter(item => (item.level_id || 'Level 1').toString() === compareSim.selectedLevel.toString())}
                    products={products}
                  />
                )}

                <AnimatePresence mode="wait">
                  {!compareResult && !loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[32px] border-2 border-dashed border-slate-200 h-[500px] flex flex-col items-center justify-center text-slate-300">
                      <Sparkles size={64} strokeWidth={1} className="mb-6 opacity-40" />
                      <p className="text-lg font-black text-slate-400">Ready for Simulation</p>
                      <p className="text-sm mt-1 text-slate-400">Adjust parameters on the left to see causal uplift</p>
                    </motion.div>
                  )}

                  {compareResult && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                      <div className="bg-emerald-50 border border-emerald-100 rounded-[32px] p-8 flex items-start gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={24} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-600/70 mb-2">Simulated Verdict</p>
                          <h3 className="text-xl font-black text-emerald-900 leading-tight">Recommended: {compareResult.verdict?.recommended_setup}</h3>
                          <p className="text-sm text-emerald-700/80 mt-2 font-medium leading-relaxed">{compareResult.verdict?.justification}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <StatCard label="Current Setup" value={`${fmt(compareResult.current?.units)} units`}
                          unit="Projected Vol" formulaHint="Baseline × (1 + uplift_rate × facings_factor)"
                          accent={compareResult.verdict?.recommended_setup === 'Current Setup' ? 'bg-[#1B4F72] text-white border-transparent shadow-xl shadow-[#1B4F72]/20' : 'bg-white text-slate-800 border-slate-100'} />
                        <StatCard label="Proposed Setup" value={`${fmt(compareResult.proposed?.units)} units`}
                          unit="Projected Vol" formulaHint="Baseline × (1 + uplift_rate × new_facings_factor)"
                          accent={compareResult.verdict?.recommended_setup === 'Proposed Setup' ? 'bg-[#1B4F72] text-white border-transparent shadow-xl shadow-[#1B4F72]/20' : 'bg-white text-slate-800 border-slate-100'} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Economic Impact</p>
                              <h4 className="text-lg font-black text-slate-800">Revenue Lift</h4>
                            </div>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isPos(compareResult.delta?.revenue) ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                              {isPos(compareResult.delta?.revenue) ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                            </div>
                          </div>
                          <p className={`text-4xl font-black ${isPos(compareResult.delta?.revenue) ? 'text-emerald-600' : 'text-red-500'}`}>
                            {sign(compareResult.delta?.revenue)}Rs. {fmt(compareResult.delta?.revenue)}
                          </p>
                          <p className="text-xs text-slate-400 mt-4 font-bold uppercase tracking-wider">Net Change vs Baseline (LKR)</p>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Economic Impact</p>
                              <h4 className="text-lg font-black text-slate-800">Profit Lift</h4>
                            </div>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isPos(compareResult.delta?.profit) ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                              {isPos(compareResult.delta?.profit) ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                            </div>
                          </div>
                          <p className={`text-4xl font-black ${isPos(compareResult.delta?.profit) ? 'text-emerald-600' : 'text-red-500'}`}>
                            {sign(compareResult.delta?.profit)}Rs. {fmt(compareResult.delta?.profit)}
                          </p>
                          <p className="text-xs text-slate-400 mt-4 font-bold uppercase tracking-wider">Gross Margin Delta (LKR)</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeTab === 'trend' && (
            <motion.div key="trend" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-10">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mb-10 pb-8 border-b border-slate-100">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 leading-tight">Demand Forecast Map</h2>
                    <p className="text-sm text-slate-500 font-medium mt-2">ML-powered day-by-day prediction with seasonal intelligence.</p>
                  </div>
                  <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                    <div className="flex-1 lg:flex-none">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Product</label>
                      <select className="w-full p-4 border border-slate-200 rounded-2xl text-sm bg-white focus:ring-4 focus:ring-[#1B4F72]/5 font-bold text-slate-700"
                        value={trendSkuId} onChange={e => setTrendSkuId(e.target.value)}>
                        {products.map(p => <option key={p._id} value={p.sku || p._id}>{p.productName}</option>)}
                      </select>
                    </div>
                    <div className="flex-1 lg:flex-none">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Horizon</label>
                      <select className="w-full p-4 border border-slate-200 rounded-2xl text-sm bg-white focus:ring-4 focus:ring-[#1B4F72]/5 font-bold text-slate-700"
                        value={trendDays} onChange={e => setTrendDays(Number(e.target.value))}>
                        <option value={14}>14 Days</option>
                        <option value={30}>30 Days</option>
                        <option value={90}>90 Days</option>
                        <option value={180}>180 Days</option>
                        <option value={365}>365 Days</option>
                      </select>
                    </div>
                    <div className="w-full lg:w-auto self-end">
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleFetchTrend} disabled={loading}
                        className="w-full bg-[#1B4F72] text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-[#1B4F72]/20 flex items-center justify-center gap-3">
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <TrendingUp size={18} />}
                        Fetch Maps
                      </motion.button>
                    </div>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {trendResult ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                      <div className={`p-6 rounded-2xl border flex gap-4 ${trendResult.events?.length > 0 ? 'bg-amber-50 border-amber-100 text-amber-900' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                        {trendResult.events?.length > 0 ? <AlertCircle size={24} className="text-amber-500 shrink-0" /> : <Bot size={24} className="text-[#1B4F72] shrink-0" />}
                        <div>
                          <p className="text-base font-black leading-tight">{trendResult.readiness_status}</p>
                          <p className="text-sm mt-1.5 opacity-80 font-medium leading-relaxed">{trendResult.event_narrative}</p>
                        </div>
                      </div>

                      <div className="h-[450px] bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendResult.trend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="date" tickFormatter={(str) => { const d = new Date(str); return `${d.getMonth() + 1}/${d.getDate()}`; }} stroke="#94A3B8" fontSize={12} />
                            <YAxis stroke="#94A3B8" fontSize={12} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                            <Line type="monotone" dataKey="predicted_demand" stroke="#1B4F72" strokeWidth={4} dot={false} activeDot={{ r: 8 }} />
                            {trendResult.events?.map((evt, i) => (
                              <ReferenceLine key={i} x={evt.date} stroke="#F59E0B" strokeDasharray="3 3"
                                label={{ value: evt.name, position: 'top', fill: '#D97706', fontSize: 10, fontWeight: 'bold' }} />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-96 flex flex-col items-center justify-center text-slate-300">
                      <Calendar size={64} strokeWidth={1} className="mb-4 opacity-40" />
                      <p className="text-lg font-black text-slate-400">Horizon Map Pending</p>
                      <p className="text-sm mt-1 text-slate-400">Generate a forecast to see daily demand projections</p>
                    </div>
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