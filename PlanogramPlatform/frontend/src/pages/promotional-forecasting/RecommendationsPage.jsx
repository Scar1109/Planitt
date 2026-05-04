import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Download, Megaphone, Eye, X, TrendingUp, TrendingDown,
  Bot, AlertTriangle, Sparkles, BarChart3, Tag, Calendar,
  ChevronRight, PackageSearch, Zap, ArrowUpRight, ArrowDownRight,
  Info, BookOpen, FlaskConical, Cpu, ChevronDown, ChevronUp
} from 'lucide-react';

const fmt   = (n) => (n ?? 0).toLocaleString('en-LK', { maximumFractionDigits: 0 });
const sign  = (n) => (n >= 0 ? '+' : '');
const isPos = (n) => n >= 0;
const numberFrom = (...values) => {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
};

const getProductKey = (product) => String(product.sku || product._id || '');

const getApiErrorMessage = (err) => {
  const data = err.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const shown = data.errors.slice(0, 4).join('; ');
    const suffix = data.errors.length > 4 ? `; +${data.errors.length - 4} more` : '';
    return `${data.message || 'Request failed'}: ${shown}${suffix}`;
  }
  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    return data.detail.map(item => item.msg || JSON.stringify(item)).join('; ');
  }
  return data?.message || data?.error || err.message || 'Failed to generate plan';
};

/* ─── AlgoBanner ────────────────────────────────────────────────── */
const AlgoBanner = () => {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <Cpu size={18} className="text-indigo-600" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System Architecture</p>
            <p className="text-sm font-black text-slate-800">Hybrid Forecasting & MIP Architecture</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full font-semibold hidden sm:block">
            Verify outputs with domain experts
          </span>
          {expanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-5 pb-5 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-slate-100">
              {[
                {
                  step: '1', icon: <Cpu size={13} />, color: 'bg-[#1B4F72]/10 text-[#1B4F72]',
                  title: 'Baseline Forecast',
                  desc: 'Random Forest (300 trees) predicts demand without promotion using lag features, rolling averages, and seasonal signals.',
                  formula: 'log(1 + demand) → RF → expm1(pred)'
                },
                {
                  step: '2', icon: <FlaskConical size={13} />, color: 'bg-[#17A2B8]/10 text-[#17A2B8]',
                  title: 'Uplift Estimation',
                  desc: 'S-Learner XGBoost calculates causal uplift — the extra units sold because of the promotion, not just during it.',
                  formula: 'E[Y|T=1,X] − E[Y|T=0,X]'
                },
                {
                  step: '3', icon: <BarChart3 size={13} />, color: 'bg-emerald-50 text-emerald-600',
                  title: 'MIP Optimisation',
                  desc: 'Mixed Integer Programming (SCIP solver) selects the best promotions subject to slot, category, and margin constraints.',
                  formula: 'max Σ xᵢ·profitᵢ  s.t. Σxᵢ ≤ slots'
                },
                {
                  step: '4', icon: <Bot size={13} />, color: 'bg-purple-50 text-purple-600',
                  title: 'AI Narrative',
                  desc: 'GPT-4o generates strategic reasoning per SKU. This is a language model output — always validate against business context.',
                  formula: 'OpenAI GPT-4o · max_tokens=100'
                },
              ].map(({ step, icon, color, title, desc, formula }) => (
                <div key={step} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step {step}</span>
                  </div>
                  <p className="font-bold text-slate-700 text-xs mb-1">{title}</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-2">{desc}</p>
                  <code className="text-[10px] font-mono bg-white border border-slate-200 rounded-lg px-2 py-1.5 block text-slate-600">{formula}</code>
                </div>
              ))}
            </div>

            {/* Units explanation */}
            <div className="px-5 pb-5">
              <div className="bg-[#1B4F72]/5 border border-[#1B4F72]/10 rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#1B4F72] mb-2">Unit Reference — What Each Value Means</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  {[
                    { label: 'Discount %', unit: '0.0 – 1.0 (decimal)', ex: '0.15 = 15% off' },
                    { label: 'Uplift', unit: 'units over duration', ex: '+42 units in 7 days' },
                    { label: 'Revenue/Profit Lift', unit: 'LKR (Sri Lankan Rupees)', ex: 'Net change vs baseline' },
                    { label: 'Base Price', unit: 'LKR per unit', ex: 'Pre-promotion shelf price' },
                  ].map(({ label, unit, ex }) => (
                    <div key={label} className="bg-white border border-slate-100 rounded-lg p-2.5">
                      <p className="font-bold text-slate-700">{label}</p>
                      <p className="text-slate-500 mt-0.5">{unit}</p>
                      <p className="text-slate-400 italic mt-0.5">{ex}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ─── StatBox ───────────────────────────────────────────────────── */
const StatBox = ({ label, value, sub, tone = 'neutral', unit }) => {
  const tones = {
    neutral: 'bg-slate-50 border-slate-100 text-slate-800',
    green: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    red: 'bg-red-50 border-red-100 text-red-700',
    blue: 'bg-[#17A2B8]/5 border-[#17A2B8]/15 text-[#1B4F72]',
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 ${tones}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">{label}</p>
        {unit && <span className="text-[9px] font-semibold bg-white/60 border border-current/10 px-1.5 py-0.5 rounded-full opacity-60">{unit}</span>}
      </div>
      <p className="text-xl font-black leading-none">{value}</p>
      {sub && <p className="text-xs mt-1.5 opacity-60">{sub}</p>}
    </div>
  );
};

/* ─── Recommendation Card ───────────────────────────────────────── */
const RecCard = ({ rec, index }) => {
  const [showDetail, setShowDetail] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 260, damping: 24 }}
      className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md hover:border-slate-200 transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm truncate">{rec.name}</p>
          <p className="text-[11px] font-mono text-slate-400 mt-0.5">{rec.sku}</p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
          <Zap size={9} /> Ready
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-[#1B4F72]/5 rounded-xl p-3 border border-[#1B4F72]/10">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Discount</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-[#1B4F72]">{(rec.recommended_discount * 100).toFixed(0)}</span>
            <span className="text-sm font-bold text-[#1B4F72]/60">%</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">of base price</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">Uplift</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-700">+{rec.projected_uplift?.toFixed(0)}</span>
            <span className="text-xs font-bold text-emerald-500">units</span>
          </div>
          <p className="text-[10px] text-emerald-600/70 mt-1">causal estimate</p>
        </div>
      </div>

      {/* Pricing context */}
      {rec.current_price > 0 && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400">Base: </span>
            <span className="font-bold text-slate-700">Rs. {fmt(rec.current_price)}</span>
          </div>
          <ChevronRight size={12} className="text-slate-300" />
          <div>
            <span className="text-slate-400">Promo: </span>
            <span className="font-bold text-[#1B4F72]">Rs. {fmt(rec.current_price * (1 - rec.recommended_discount))}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <Tag size={11} className="text-slate-300" />
          <span className="text-[11px] text-slate-400 font-medium">{rec.category || 'General'}</span>
        </div>
        <button onClick={() => setShowDetail(v => !v)}
          className="text-[11px] font-semibold text-[#17A2B8] hover:text-[#1B4F72] flex items-center gap-1 transition-colors">
          <Info size={11} /> How calculated
        </button>
      </div>

      <AnimatePresence>
        {showDetail && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] space-y-1.5 text-slate-500">
              <p><strong className="text-slate-700">Baseline:</strong> Random Forest on historical demand</p>
              <p><strong className="text-slate-700">Uplift:</strong> S-Learner counterfactual — E[Y|T=1,X] − E[Y|T=0,X]</p>
              <p><strong className="text-slate-700">Selected by:</strong> MIP Solver (MAX_PROFIT objective)</p>
              <p className="text-amber-600 font-semibold">⚠ Statistical estimate — validate with store data</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ─── Saved Sim Row ─────────────────────────────────────────────── */
const SimRow = ({ sim, index, onView }) => (
  <motion.div
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.05 }}
    className="group flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-default"
  >
    <div className="w-12 h-12 rounded-2xl bg-[#1B4F72] flex flex-col items-center justify-center shrink-0 shadow-md shadow-[#1B4F72]/20">
      <span className="text-white font-black text-sm leading-none">{(sim.discount * 100).toFixed(0)}%</span>
      <span className="text-white/50 text-[9px] font-bold">OFF</span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-slate-800 text-sm truncate">{sim.productName}</p>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-[11px] font-mono text-slate-400">{sim.skuId}</span>
        <span className="text-slate-200">·</span>
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Calendar size={9} />
          {new Date(sim.createdAt).toLocaleDateString('en-LK', { day: 'numeric', month: 'short' })}
        </span>
        <span className="text-slate-200">·</span>
        <span className="text-[11px] text-slate-400">{sim.durationDays}d</span>
      </div>
    </div>
    <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black shrink-0 ${isPos(sim.profitLift) ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
      {isPos(sim.profitLift) ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {sign(sim.profitLift)}Rs. {fmt(sim.profitLift)}
      <span className="text-[9px] opacity-60 font-normal ml-0.5">LKR</span>
    </div>
    <button onClick={() => onView(sim)}
      className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-[11px] font-bold text-[#1B4F72] bg-[#17A2B8]/10 hover:bg-[#17A2B8]/20 px-3 py-2 rounded-xl transition-all shrink-0">
      <Eye size={12} /> View
    </button>
  </motion.div>
);

/* ─── Skeleton ──────────────────────────────────────────────────── */
const CardSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 animate-pulse space-y-4">
        <div className="flex justify-between">
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 bg-slate-100 rounded-full w-3/4" />
            <div className="h-2.5 bg-slate-100 rounded-full w-1/3" />
          </div>
          <div className="h-6 w-14 bg-slate-100 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-16 bg-slate-100 rounded-xl" />
          <div className="h-16 bg-slate-100 rounded-xl" />
        </div>
        <div className="h-3 bg-slate-100 rounded-full w-full" />
      </div>
    ))}
  </div>
);

/* ─── Main ──────────────────────────────────────────────────────── */
const RecommendationsPage = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [narrative, setNarrative] = useState('');
  const [savedSimulations, setSavedSimulations] = useState([]);
  const [selectedSim, setSelectedSim] = useState(null);

  const fetchSaved = async () => {
    try {
      const { data } = await axios.get('http://localhost:3000/api/promotions/simulate/saved', { withCredentials: true });
      setSavedSimulations(data);
    } catch { }
  };

  useEffect(() => { generatePlan(); fetchSaved(); }, []);

  const generatePlan = async () => {
    setLoading(true); setError(null);
    try {
      const { data: products } = await axios.get('http://localhost:3000/api/products', { withCredentials: true });
      const productBySku = new Map(products.map(p => [getProductKey(p), p]));
      const skusToPlan = products
        .map(p => {
          const basePrice = numberFrom(p.baseUnitPriceLKR, p.price, p.basePrice);
          const costPrice = numberFrom(p.unitCostLKR, p.costPrice, basePrice > 0 ? basePrice * 0.7 : 0);
          const stockLevel = numberFrom(p.currentStock, p.stockLevel, p.quantity, p.closingStock, 100);

          if (!getProductKey(p) || basePrice <= 0 || costPrice <= 0 || costPrice >= basePrice) return null;

          return {
            sku_id: getProductKey(p),
            category: p.category || 'General',
            brand: p.brand || 'Unknown',
            base_price: basePrice,
            cost_price: costPrice,
            stock_level: Math.max(0, Math.round(stockLevel)),
          };
        })
        .filter(Boolean)
        .slice(0, 20);

      if (skusToPlan.length === 0) {
        throw new Error('No eligible products found for planning. Products need positive baseUnitPriceLKR and unitCostLKR, with cost below price.');
      }

      const { data: planData } = await axios.post('http://localhost:3000/api/promotions/plan', {
        skus: skusToPlan,
        constraints: { max_slots: 10, max_per_category: 3, min_margin_pct: 0.10, allow_stockout_risk: false },
        objective: 'MAX_PROFIT',
      }, { withCredentials: true });

      setRecommendations(planData.recommendations.map((rec, i) => ({
        id: `REC-${new Date().getFullYear()}-${i + 1}`,
        sku: rec.sku_id,
        name: productBySku.get(rec.sku_id)?.productName || rec.sku_id,
        current_price: numberFrom(productBySku.get(rec.sku_id)?.baseUnitPriceLKR, productBySku.get(rec.sku_id)?.price),
        category: productBySku.get(rec.sku_id)?.category || 'General',
        recommended_discount: rec.discount_depth,
        projected_uplift: rec.uplift_forecast,
      })));
      setNarrative(planData.narrative_explanation || '');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const data = recommendations.length > 0 ? recommendations : savedSimulations;
    if (!data?.length) { alert('No data to export.'); return; }
    const headers = ['ID', 'SKU', 'Product', 'Current Price (LKR)', 'Discount', 'Uplift (units)', 'Status'];
    const rows = data.map(r => [
      r.id || r._id,
      `"${r.sku || r.skuId}"`,
      `"${(r.name || r.productName || '').replace(/"/g, '""')}"`,
      r.current_price || r.basePrice || 'N/A',
      r.recommended_discount != null ? `${(r.recommended_discount * 100).toFixed(0)}%` : r.discount != null ? `${(r.discount * 100).toFixed(0)}%` : 'N/A',
      r.projected_uplift != null ? `+${r.projected_uplift} units` : r.profitLift != null ? `Rs.${r.profitLift}` : 'N/A',
      r.status || 'Saved',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `promo-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const totalUplift = recommendations.reduce((s, r) => s + (r.projected_uplift || 0), 0);
  const avgDiscount = recommendations.length ? recommendations.reduce((s, r) => s + r.recommended_discount, 0) / recommendations.length : 0;
  const totalSavedPnL = savedSimulations.reduce((s, r) => s + (r.profitLift || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Loading overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#1B4F72]/95 backdrop-blur-md flex flex-col items-center justify-center gap-5">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
              className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Sparkles size={28} className="text-[#17A2B8]" />
            </motion.div>
            <div className="text-center">
              <p className="text-white text-xl font-black tracking-tight">Generating AI Plan</p>
              <p className="text-white/40 text-sm mt-1 max-w-xs">Running MIP solver + uplift models across your inventory…</p>
            </div>
            <div className="flex gap-2 mt-1">
              {[0, 1, 2].map(i => (
                <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-[#17A2B8]"
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1, 0.8] }}
                  transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.25 }} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page header */}
      <div className="px-6 pt-8 pb-0 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1B4F72] flex items-center justify-center shadow-lg shadow-[#1B4F72]/25">
              <BarChart3 size={19} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Optimization Opportunities</h1>
              <p className="text-xs text-slate-400">AI-driven campaign recommendations from live inventory</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={generatePlan} disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-40 shadow-sm">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Regenerate
            </button>
            <button onClick={exportReport}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1B4F72] hover:bg-[#164060] active:scale-95 rounded-xl text-sm font-semibold text-white transition-all shadow-md shadow-[#1B4F72]/20">
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>

        {/* Summary strip */}
        {(recommendations.length > 0 || savedSimulations.length > 0) && !loading && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Opportunities', value: recommendations.length, sub: 'MIP-selected', icon: <Sparkles size={14} />, color: 'text-[#1B4F72] bg-[#1B4F72]/8' },
              { label: 'Avg. Discount', value: `${(avgDiscount * 100).toFixed(0)}%`, sub: 'of base price', icon: <Tag size={14} />, color: 'text-[#17A2B8] bg-[#17A2B8]/8' },
              { label: 'Saved P&L', value: `${sign(totalSavedPnL)}Rs. ${fmt(totalSavedPnL)}`, sub: `${savedSimulations.length} simulations · LKR`, icon: isPos(totalSavedPnL) ? <TrendingUp size={14} /> : <TrendingDown size={14} />, color: isPos(totalSavedPnL) ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50' },
            ].map(({ label, value, sub, icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-100 px-5 py-4 flex items-center gap-4 shadow-sm">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                  <p className="text-lg font-black text-slate-900 leading-tight">{value}</p>
                  <p className="text-[10px] text-slate-400">{sub}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      <div className="px-6 pb-12 max-w-7xl mx-auto space-y-6">

        {/* Algorithm Banner — always visible */}
        <AlgoBanner />

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex gap-3 items-start bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <div><span className="font-bold">Planning failed — </span>{error}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Narrative */}
        <AnimatePresence>
          {narrative && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-[#17A2B8]/6 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#17A2B8]/10 flex items-center justify-center shrink-0">
                    <Megaphone size={14} className="text-[#17A2B8]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI Generated · GPT-4o</p>
                    <p className="text-sm font-bold text-slate-800">Strategic Narrative</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl">
                  <AlertTriangle size={11} className="text-amber-500" />
                  <span className="text-[10px] font-semibold text-amber-700">Verify with domain experts</span>
                </div>
              </div>
              <p className="px-6 py-5 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{narrative}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recommendation Cards */}
        {(recommendations.length > 0 || loading) && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#17A2B8]" />
                <span className="text-sm font-bold text-slate-700">AI Campaign Recommendations</span>
              </div>
              {recommendations.length > 0 && (
                <span className="text-[11px] font-semibold text-slate-400">
                  {totalUplift.toFixed(0)} units total projected uplift · causal estimate
                </span>
              )}
            </div>
            {loading ? <CardSkeleton /> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {recommendations.map((rec, i) => <RecCard key={rec.id} rec={rec} index={i} />)}
              </div>
            )}
          </div>
        )}

        {/* Saved Simulations */}
        {savedSimulations.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <PackageSearch size={15} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-800">Saved Micro-Simulations</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                {savedSimulations.length} records
              </span>
            </div>
            <div className="p-3 space-y-1">
              {savedSimulations.map((sim, i) => <SimRow key={sim._id} sim={sim} index={i} onView={setSelectedSim} />)}
            </div>
          </motion.div>
        )}

        {/* Empty */}
        {!loading && recommendations.length === 0 && savedSimulations.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center min-h-[360px] bg-white border-2 border-dashed border-slate-200 rounded-3xl text-slate-300">
            <BarChart3 size={48} strokeWidth={1.2} className="mb-4" />
            <p className="text-base font-bold text-slate-400">Nothing yet</p>
            <p className="text-sm mt-1 text-slate-300">Hit Regenerate to kick off the AI planner</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedSim && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedSim(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100">

              <div className="bg-[#1B4F72] px-6 py-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Simulation Detail</p>
                    <p className="text-white font-black text-lg leading-tight">{selectedSim.productName}</p>
                    <p className="text-white/50 font-mono text-xs mt-1">{selectedSim.skuId}</p>
                  </div>
                  <button onClick={() => setSelectedSim(null)}
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                    <X size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {[
                    { l: 'Discount', v: `${(selectedSim.discount * 100).toFixed(0)}%`, sub: 'of base price' },
                    { l: 'Duration', v: `${selectedSim.durationDays}d`, sub: 'campaign length' },
                    { l: 'Date', v: new Date(selectedSim.createdAt).toLocaleDateString('en-LK', { day: 'numeric', month: 'short' }), sub: 'simulated' },
                  ].map(({ l, v, sub }) => (
                    <div key={l} className="bg-white/10 rounded-xl px-3 py-2.5 border border-white/10">
                      <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">{l}</p>
                      <p className="text-white font-black text-base">{v}</p>
                      <p className="text-white/30 text-[9px]">{sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <StatBox label="Base Price" value={`Rs. ${fmt(selectedSim.basePrice)}`} unit="LKR" tone="neutral" />
                  <StatBox label="Promo Price" value={`Rs. ${fmt(selectedSim.basePrice * (1 - selectedSim.discount))}`} unit="LKR" tone="blue" sub="Base × (1 − discount)" />
                  <StatBox label="Unit Cost" value={`Rs. ${fmt(selectedSim.costPrice)}`} unit="LKR" tone="neutral" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StatBox label="Predicted Sales" value={`${(selectedSim.baseline + selectedSim.uplift).toFixed(1)} units`}
                    sub={`baseline + ${selectedSim.uplift?.toFixed(1)} uplift`} unit="units" tone="green" />
                  <StatBox label="Profit Lift" value={`${sign(selectedSim.profitLift)}Rs. ${fmt(selectedSim.profitLift)}`}
                    sub="Net economic impact" unit="LKR" tone={isPos(selectedSim.profitLift) ? 'green' : 'red'} />
                </div>

                {/* Formula breakdown */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs space-y-2">
                  <p className="font-bold text-slate-600 text-[10px] uppercase tracking-wider mb-2">Calculation Breakdown</p>
                  <div className="font-mono text-slate-500 space-y-1 text-[11px]">
                    <p>Promo Price = {fmt(selectedSim.basePrice)} × (1 − {(selectedSim.discount * 100).toFixed(0)}%) = <strong className="text-slate-700">Rs. {fmt(selectedSim.basePrice * (1 - selectedSim.discount))}</strong></p>
                    <p>Revenue Lift = (baseline+uplift)×promo − baseline×base</p>
                    <p>Profit Lift = (baseline+uplift)×(promo−cost) − baseline×(base−cost)</p>
                  </div>
                </div>

                {selectedSim.aiExplanation && (
                  <div className="rounded-2xl bg-gradient-to-br from-[#17A2B8]/5 to-slate-50 border border-[#17A2B8]/15 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#17A2B8]/10 flex items-center justify-center">
                          <Bot size={12} className="text-[#17A2B8]" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">AI Strategic Review · GPT-4o</span>
                      </div>
                      <span className="text-[9px] text-amber-600 font-semibold">Verify independently</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{selectedSim.aiExplanation}</p>
                  </div>
                )}
              </div>

              <div className="px-6 pb-6 flex justify-end">
                <button onClick={() => setSelectedSim(null)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1B4F72] hover:bg-[#164060] active:scale-95 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-[#1B4F72]/20">
                  Done <ChevronRight size={14} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RecommendationsPage;
