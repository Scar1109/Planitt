import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Loader2, AlertTriangle, CheckCircle2, Bot, Sparkles,
  Megaphone, SearchCheck, Save, ChevronDown, Package, Search,
  Info, ChevronRight, FlaskConical, Cpu, BarChart2, BookOpen, X
} from 'lucide-react';

const fmt  = (n) => (n ?? 0).toLocaleString('en-LK', { maximumFractionDigits: 0 });
const sign = (n) => (n >= 0 ? '+' : '');

/* ─── Algorithm Info Panel ──────────────────────────────────────── */
const AlgorithmPanel = ({ onClose }) => (
  <motion.div
    initial={{ opacity: 0, x: 40 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 40 }}
    className="fixed right-0 top-0 h-full w-full max-w-md bg-white border-l border-slate-200 shadow-2xl z-50 overflow-y-auto"
  >
    <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#1B4F72]/10 flex items-center justify-center">
          <BookOpen size={14} className="text-[#1B4F72]" />
        </div>
        <span className="font-bold text-slate-800 text-sm">How This Works</span>
      </div>
      <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition">
        <X size={14} />
      </button>
    </div>

    <div className="p-6 space-y-8 text-sm">
      <div className="bg-[#1B4F72]/5 rounded-2xl p-5 border border-[#1B4F72]/10">
        <p className="text-slate-600 leading-relaxed text-xs">
          The Promotional Uplift Forecaster uses a two-stage machine learning pipeline designed for high-volatility retail environments like Sri Lanka.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Cpu size={16} className="text-[#17A2B8]" />
          <span className="font-black text-slate-700 uppercase tracking-widest text-xs">Model Architecture</span>
        </div>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#1B4F72] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <p className="font-semibold text-slate-700 text-xs">Baseline Forecast (Random Forest)</p>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">Predicts what sales would be <em>without</em> any promotion. Trained on 300 decision trees using historical lags and seasonal trends.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#17A2B8] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <p className="font-semibold text-slate-700 text-xs">Uplift Estimation (S-Learner XGBoost)</p>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">Calculates the <em>causal uplift</em>. Uses counterfactual reasoning to determine the incremental sales specifically triggered by the discount.</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={16} className="text-[#17A2B8]" />
          <span className="font-black text-slate-700 uppercase tracking-widest text-xs">Primary Features</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { n: 'price_index', d: 'Relative market price' },
            { n: 'discount_depth', d: 'Promo magnitude' },
            { n: 'lag_1 / 7 / 30', d: 'Historical momentum' },
            { n: 'event_impact', d: 'Seasonal / Holidays' },
          ].map(({ n, d }) => (
            <div key={n} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <code className="text-[10px] font-mono font-bold text-[#1B4F72]">{n}</code>
              <p className="text-[9px] text-slate-400 mt-0.5">{d}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={15} className="text-amber-500" />
          <span className="font-black text-amber-700 text-xs uppercase tracking-widest">Accuracy Note</span>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed font-medium">
          All predictions are statistical estimates. The model achieves 89% accuracy on historical backtests, but real-time results can be affected by unmodeled macro factors.
        </p>
      </div>
    </div>
  </motion.div>
);

/* ─── Sub-components ────────────────────────────────────────────── */
const ConfidenceBadge = ({ uplift, baseline }) => {
  const ratio = baseline > 0 ? uplift / baseline : 0;
  const level = ratio > 0.5 ? 'High' : ratio > 0.2 ? 'Medium' : 'Low';
  const colors = {
    High: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Low: 'bg-slate-50 text-slate-500 border-slate-200',
  };
  const dots = { High: 3, Medium: 2, Low: 1 };
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${colors[level]}`}>
      {Array.from({ length: 3 }).map((_, i) => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < dots[level] ? 'opacity-100' : 'opacity-20'} ${level === 'High' ? 'bg-emerald-500' : level === 'Medium' ? 'bg-amber-500' : 'bg-slate-400'}`} />
      ))}
      {level} Signal
    </div>
  );
};

const FormulaTag = ({ label, formula }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="ml-1 text-slate-300 hover:text-[#17A2B8] transition-colors"
      >
        <Info size={11} />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 text-white text-[10px] rounded-xl p-3 z-50 shadow-xl"
          >
            <p className="font-bold mb-1 text-[#17A2B8]">{label}</p>
            <code className="text-slate-300 font-mono leading-relaxed">{formula}</code>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard = ({ label, value, sub, accent, formula, formulaLabel }) => (
  <div className={`rounded-2xl p-5 border ${accent}`}>
    <div className="flex items-center mb-1">
      <p className="text-xs font-semibold uppercase tracking-widest opacity-60">{label}</p>
      {formula && <FormulaTag label={formulaLabel} formula={formula} />}
    </div>
    <p className="text-2xl font-black leading-none">{value}</p>
    {sub && <p className="text-xs mt-1 opacity-50">{sub}</p>}
  </div>
);

const RankBadge = ({ idx }) => {
  if (idx === 0) return <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black bg-amber-400 text-white ring-2 ring-amber-200">1</span>;
  if (idx < 3) return <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-200 text-slate-600">#{idx + 1}</span>;
  return <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-100 text-slate-400">#{idx + 1}</span>;
};

const Pill = ({ children, variant = 'neutral' }) => {
  const cls = { neutral: 'bg-slate-100 text-slate-600', green: 'bg-emerald-100 text-emerald-700', blue: 'bg-cyan-100 text-[#17A2B8]', red: 'bg-red-100 text-red-600' }[variant];
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${cls}`}>{children}</span>;
};

const ProductDropdown = ({ products, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(products[0] || null);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (products.length && !active) { setActive(products[0]); onSelect(products[0]); }
  }, [products]);

  const filtered = products.filter(p => (p.productName + p.sku).toLowerCase().includes(search.toLowerCase()));
  const choose = (p) => { setActive(p); onSelect(p); setOpen(false); setSearch(''); };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${open ? 'border-[#17A2B8] ring-2 ring-[#17A2B8]/20 bg-white' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'}`}>
        <div className="w-8 h-8 rounded-lg bg-[#1B4F72]/10 flex items-center justify-center shrink-0">
          <Package size={14} className="text-[#1B4F72]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{active?.productName || 'Select a product'}</p>
          <p className="text-[11px] font-mono text-slate-400 truncate">{active?.sku || '—'}</p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={15} className="text-slate-400 shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-2 border-b border-slate-100">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                <Search size={13} className="text-slate-400 shrink-0" />
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
                  className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-300 outline-none" />
              </div>
            </div>
            <ul className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
              {filtered.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-300">No products found</li>}
              {filtered.map(p => {
                const isSelected = active?._id === p._id;
                return (
                  <li key={p._id}>
                    <button type="button" onClick={() => choose(p)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${isSelected ? 'bg-[#1B4F72] text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                        <Package size={12} className={isSelected ? 'text-white' : 'text-slate-400'} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>{p.productName}</p>
                        <p className={`text-[10px] font-mono truncate ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>{p.sku}</p>
                      </div>
                      {isSelected && <CheckCircle2 size={14} className="text-white/80 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Main Page ─────────────────────────────────────────────────── */
const ForecastPage = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [explanation, setExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [isFindingOpt, setIsFindingOpt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [top5, setTop5] = useState(null);
  const [showAlgo, setShowAlgo] = useState(false);
  const [formData, setFormData] = useState({
    sku_id: '', category: '', brand: '',
    base_price: 0, cost_price: 0, forecast_duration: 7,
    stock_level: 0, test_discount: 0.10,
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get('http://localhost:3000/api/products', { withCredentials: true });
        setProducts(data);
        if (data?.length) pick(data[0]);
      } catch { }
    })();
  }, []);

  const pick = (p) => setFormData(prev => ({
    ...prev,
    sku_id: p.sku || p._id,
    category: p.category || 'General',
    brand: p.brand || 'Unknown',
    base_price: p.baseUnitPriceLKR || p.price || 0,
    cost_price: p.unitCostLKR || p.costPrice || (p.baseUnitPriceLKR ? p.baseUnitPriceLKR * 0.7 : 0),
    stock_level: p.currentStock || p.quantity || 0,
    forecast_duration: 7,
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: ['sku_id', 'category', 'brand'].includes(name) ? value : parseFloat(value) }));
  };

  const skuPayload = () => ({
    sku_id: formData.sku_id, category: formData.category,
    brand: formData.brand, base_price: formData.base_price,
    cost_price: formData.cost_price, stock_level: formData.stock_level,
  });

  const getExplanation = async (sim, disc) => {
    setIsExplaining(true); setExplanation('');
    try {
      const { data } = await axios.post('http://localhost:3000/api/promotions/simulate/explain', {
        sku_id: formData.sku_id, discount: disc,
        duration_days: formData.forecast_duration,
        uplift: sim.uplift, revenue_lift: sim.revenue_lift, profit_lift: sim.profit_lift,
      }, { withCredentials: true });
      setExplanation(data.explanation);
    } catch { setExplanation('Could not generate AI explanation at this time.'); }
    finally { setIsExplaining(false); }
  };

  const handleForecast = async (e) => {
    if (e) e.preventDefault();
    setLoading(true); setError(null); setResult(null); setTop5(null);
    try {
      const { data } = await axios.post('http://localhost:3000/api/promotions/simulate',
        { sku: skuPayload(), duration_days: formData.forecast_duration, test_discount: formData.test_discount },
        { withCredentials: true });
      setResult(data);
      getExplanation(data, formData.test_discount);
    } catch (err) { setError(err.response?.data?.detail || err.message || 'Simulation failed'); }
    finally { setLoading(false); }
  };

  const handleFindOptimal = async () => {
    setIsFindingOpt(true); setError(null); setResult(null); setExplanation(''); setSaveSuccess(false); setTop5(null);
    try {
      const { data } = await axios.post('http://localhost:3000/api/promotions/simulate/optimal',
        { sku: skuPayload(), duration_days: formData.forecast_duration },
        { withCredentials: true });
      setFormData(prev => ({ ...prev, test_discount: data.optimal_discount }));
      setResult(data.simulation);
      setTop5(data.top_5);
      getExplanation(data.simulation, data.optimal_discount);
    } catch (err) { setError(err.response?.data?.detail || err.message || 'Optimisation failed'); }
    finally { setIsFindingOpt(false); }
  };

  const handleSave = async () => {
    if (!result) return;
    setIsSaving(true); setSaveSuccess(false);
    try {
      await axios.post('http://localhost:3000/api/promotions/simulate/save', {
        skuId: formData.sku_id,
        productName: products.find(p => p._id === formData.sku_id || p.sku === formData.sku_id)?.productName || formData.sku_id,
        basePrice: formData.base_price, costPrice: formData.cost_price,
        durationDays: formData.forecast_duration, discount: formData.test_discount,
        baseline: result.baseline, uplift: result.uplift,
        revenueLift: result.revenue_lift, profitLift: result.profit_lift,
        aiExplanation: explanation, risks: result.risks,
      }, { withCredentials: true });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch { alert('Failed to save simulation.'); }
    finally { setIsSaving(false); }
  };

  const busy = loading || isFindingOpt;
  const promoPrice = formData.base_price * (1 - formData.test_discount);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* Algorithm Panel Overlay */}
      <AnimatePresence>
        {showAlgo && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40"
              onClick={() => setShowAlgo(false)} />
            <AlgorithmPanel onClose={() => setShowAlgo(false)} />
          </>
        )}
      </AnimatePresence>

      {/* page header */}
      <div className="px-6 pt-8 pb-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1B4F72] flex items-center justify-center shadow-lg shadow-[#1B4F72]/20">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Uplift Forecast</h1>
              <p className="text-sm text-slate-500 font-medium">AI-powered promotion simulator for the Sri Lankan retail market</p>
            </div>
          </div>
          <button onClick={() => setShowAlgo(true)}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-600 hover:bg-slate-50 hover:border-[#17A2B8] hover:text-[#17A2B8] transition-all shadow-sm">
            <BookOpen size={14} />
            How It Works
          </button>
        </div>
      </div>

      <div className="px-6 pb-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">

        {/* LEFT: Parameters */}
        <aside>
          <form onSubmit={handleForecast} className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 space-y-6">
            <p className="text-[11px] font-black uppercase tracking-[.2em] text-slate-400">Simulation Setup</p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Select Product</label>
              <ProductDropdown products={products} onSelect={pick} />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">SKU ID</span>
              <span className="text-xs font-mono font-bold text-[#1B4F72] truncate">{formData.sku_id || '\u2014'}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[['category', 'Category'], ['brand', 'Brand']].map(([n, l]) => (
                <div key={n} className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">{l}</label>
                  <input name={n} value={formData[n]} onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#17A2B8]/5 focus:border-[#17A2B8] transition-all" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[['base_price', 'Base (LKR)'], ['cost_price', 'Cost (LKR)']].map(([n, l]) => (
                <div key={n} className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">{l}</label>
                  <input type="number" step="1" name={n} value={formData[n]} onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#17A2B8]/5 focus:border-[#17A2B8] transition-all" />
                </div>
              ))}
            </div>

            {/* Price Preview */}
            {formData.base_price > 0 && (
              <div className="bg-[#1B4F72]/5 border border-[#1B4F72]/10 rounded-[24px] p-5 flex items-center justify-between shadow-inner">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Promo Price</p>
                  <p className="text-2xl font-black text-[#1B4F72]">Rs. {fmt(promoPrice)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-bold">DISCOUNT {(formData.test_discount * 100).toFixed(0)}%</p>
                  <p className="text-[10px] text-[#1B4F72]/40 font-mono mt-1">Net per unit</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {[['stock_level', 'Stock Units'], ['forecast_duration', 'Duration (Days)']].map(([n, l]) => (
                <div key={n} className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">{l}</label>
                  <input type="number" name={n} value={formData[n]} onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#17A2B8]/5 focus:border-[#17A2B8] transition-all" />
                </div>
              ))}
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Proposed Discount</label>
                <span className="text-base font-black text-[#1B4F72] tabular-nums">{(formData.test_discount * 100).toFixed(0)}%</span>
              </div>
              <input type="range" name="test_discount" min="0.05" max="0.80" step="0.01"
                value={formData.test_discount} onChange={handleChange}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#1B4F72] bg-slate-200" />
              <div className="flex justify-between text-[10px] text-slate-300 font-black mt-2 uppercase tracking-tighter">
                <span>5% Min</span><span>80% Max</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button type="submit" disabled={busy}
                className="flex items-center justify-center gap-2.5 bg-[#1B4F72] hover:bg-[#164060] active:scale-95 text-white text-sm font-black py-4 rounded-2xl shadow-xl shadow-[#1B4F72]/20 transition-all disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Predict
              </button>
              <button type="button" onClick={handleFindOptimal} disabled={busy}
                className="flex items-center justify-center gap-2.5 bg-[#17A2B8] hover:bg-[#129ab0] active:scale-95 text-white text-sm font-black py-4 rounded-2xl shadow-xl shadow-[#17A2B8]/20 transition-all disabled:opacity-50">
                {isFindingOpt ? <Loader2 size={16} className="animate-spin" /> : <SearchCheck size={16} />}
                Optimise
              </button>
            </div>
          </form>
        </aside>

        {/* RIGHT: Results */}
        <main className="space-y-6 min-w-0">
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex gap-4 items-start bg-red-50 border border-red-100 text-red-700 p-6 rounded-[24px]">
                <AlertTriangle size={20} className="shrink-0" />
                <div>
                  <p className="font-black text-sm uppercase tracking-widest mb-1">Simulation Error</p>
                  <p className="text-sm font-medium opacity-80">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!result && !loading && !error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center min-h-[500px] bg-white rounded-[40px] border-2 border-dashed border-slate-200 text-slate-300">
              <TrendingUp size={64} strokeWidth={1} className="mb-6 opacity-30" />
              <p className="text-lg font-black text-slate-400 uppercase tracking-widest">Awaiting Inputs</p>
              <p className="text-sm text-slate-400 mt-1 font-medium">Select a product and duration to start</p>
            </motion.div>
          )}

          {busy && !result && (
            <div className="bg-white rounded-[40px] border border-slate-100 p-10 space-y-6 animate-pulse">
              <div className="h-8 bg-slate-100 rounded-full w-1/4" />
              <div className="grid grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-3xl" />)}
              </div>
              <div className="h-32 bg-slate-100 rounded-3xl" />
            </div>
          )}

          <AnimatePresence mode="wait">
            {result && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">

                {/* Hero strip */}
                <div className="bg-[#1B4F72] px-10 py-8 flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center">
                        <CheckCircle2 size={14} className="text-emerald-300" />
                      </div>
                      <span className="text-white font-black text-xl tracking-tight">Analysis Complete</span>
                    </div>
                    <p className="text-white/50 text-sm font-medium">
                      {result.sku_id} \u00B7 <span className="text-white/80">{(formData.test_discount * 100).toFixed(0)}% off</span> \u00B7 {formData.forecast_duration} days
                    </p>
                    <div className="mt-4">
                      <ConfidenceBadge uplift={result.uplift} baseline={result.baseline} />
                    </div>
                  </div>
                  <div className={`flex flex-col items-end px-8 py-5 rounded-3xl border-2 ${result.profit_lift >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <span className="text-[10px] font-black uppercase tracking-[.25em] text-white/40 mb-1">Profit Lift</span>
                    <span className={`text-4xl font-black ${result.profit_lift >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                      {sign(result.profit_lift)}Rs. {fmt(result.profit_lift)}
                    </span>
                    <span className="text-[11px] text-white/30 font-bold mt-2 uppercase tracking-widest">Net Economic Impact</span>
                  </div>
                </div>

                <div className="p-8 space-y-8">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-6">
                    <StatCard label="Baseline Sales" value={`${result.baseline?.toFixed(1)} units`}
                      sub="Normal expectation" accent="border-slate-100 bg-slate-50 text-slate-800"
                      formula="RF on historical demand lags" formulaLabel="Baseline Model" />
                    <StatCard label="Predicted Uplift" value={`+${result.uplift?.toFixed(1)} units`}
                      sub="Causal increment" accent="border-emerald-100 bg-emerald-50 text-emerald-700"
                      formula="Counterfactual XGBoost S-Learner" formulaLabel="Uplift Model" />
                    <StatCard label="Revenue Lift" value={`${sign(result.revenue_lift)}Rs. {fmt(result.revenue_lift)}`}
                      sub="Gross revenue delta" accent="border-cyan-100 bg-cyan-50 text-[#1B4F72]"
                      formula="(Base+Uplift)\u00D7Price \u2013 Base\u00D7OldPrice" formulaLabel="Revenue Lift" />
                  </div>

                  {/* Calculations strip */}
                  <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6">
                    <p className="text-[10px] font-black uppercase tracking-[.2em] text-slate-400 mb-5">Price Point Analysis</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      {[
                        { l: 'Base Price', v: `Rs. ${fmt(formData.base_price)}` },
                        { l: 'Promo Price', v: `Rs. ${fmt(promoPrice)}` },
                        { l: 'Unit Cost', v: `Rs. ${fmt(formData.cost_price)}` },
                        { l: 'Promo Margin', v: `Rs. ${fmt(promoPrice - formData.cost_price)}` },
                      ].map(({ l, v }) => (
                        <div key={l} className="bg-white border border-slate-200/50 rounded-2xl p-4 shadow-sm">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{l}</p>
                          <p className="font-black text-slate-800 text-sm">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                      <span className="text-[11px] text-slate-400 font-black uppercase tracking-wider">AI Estimate \u00B7 Verify Independently</span>
                    </div>
                    <button onClick={handleSave} disabled={isSaving || saveSuccess}
                      className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-xs font-black transition-all shadow-sm ${saveSuccess ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-800 active:scale-95'}`}>
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={14} /> : <Save size={14} />}
                      {saveSuccess ? 'Simulation Saved' : 'Save Suggestion'}
                    </button>
                  </div>

                  {/* AI Explanation */}
                  <div className="rounded-3xl bg-gradient-to-br from-cyan-500/5 to-slate-50 border border-cyan-500/10 p-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center shadow-inner">
                          <Megaphone size={16} className="text-cyan-600" />
                        </div>
                        <span className="text-sm font-black text-slate-800 uppercase tracking-widest">AI Strategic Review</span>
                      </div>
                      <Pill variant="neutral">GPT-4o Reasoning</Pill>
                    </div>
                    {isExplaining ? (
                      <div className="flex items-center gap-3 text-slate-400 text-sm py-4">
                        <Loader2 size={18} className="animate-spin" />
                        <span className="font-medium animate-pulse">Generating strategic narrative...</span>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">{explanation}</p>
                    )}
                  </div>

                  {/* Top 5 Optimization */}
                  <AnimatePresence>
                    {top5 && (
                      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-3xl border border-emerald-100 bg-emerald-50/30 p-8 shadow-inner">
                        <div className="flex items-center gap-3 mb-6">
                          <SearchCheck size={18} className="text-emerald-600" />
                          <span className="text-xs font-black uppercase tracking-[.25em] text-slate-500">Global Optimization Curve</span>
                          <div className="ml-auto flex items-center gap-1.5 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                            <span className="text-[10px] font-black text-emerald-700 uppercase">MIP SOLVER</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {top5.map((opt, idx) => (
                            <motion.div key={idx} whileHover={{ x: 4 }}
                              className={`flex items-center justify-between bg-white border rounded-[24px] px-6 py-4 transition-all ${idx === 0 ? 'border-amber-300 shadow-lg shadow-amber-500/5' : 'border-slate-100 hover:border-slate-200 shadow-sm'}`}>
                              <div className="flex items-center gap-4">
                                <RankBadge idx={idx} />
                                <span className="font-black text-slate-900 text-base">{(opt.discount * 100).toFixed(0)}% Off</span>
                                {idx === 0 && <Pill variant="green">OPTIMAL</Pill>}
                              </div>
                              <div className="flex items-center gap-8 text-right">
                                <div>
                                  <p className={`font-black text-base leading-tight ${opt.profit_lift >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {sign(opt.profit_lift)}Rs. {fmt(opt.profit_lift)}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Profit Lift</p>
                                </div>
                                <div className="hidden sm:block border-l border-slate-100 pl-8">
                                  <p className="font-black text-base text-[#1B4F72] leading-tight">Rs. {fmt(opt.simulation?.revenue_lift)}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Revenue Lift</p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Risk Assessment */}
                  {result.risks && (
                    <div className="rounded-3xl border border-red-100 bg-red-50/30 p-8">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle size={18} className="text-red-500" />
                        <span className="text-xs font-black uppercase tracking-[.25em] text-red-600/60">Risk Profile</span>
                      </div>
                      <div className="space-y-2">
                        {(Array.isArray(result.risks) ? result.risks : [result.risks]).map((r, i) => (
                          <div key={i} className="text-sm font-bold text-red-900/70 bg-white border border-red-100 rounded-2xl px-5 py-4 shadow-sm flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                            {typeof r === 'string' ? r : JSON.stringify(r)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default ForecastPage;