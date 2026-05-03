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

    <div className="p-6 space-y-6 text-sm">

      {/* Model Overview */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Cpu size={14} className="text-[#17A2B8]" />
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Prediction Engine</span>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#1B4F72] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <p className="font-semibold text-slate-700">Hybrid Forecaster (Random Forest)</p>
              <p className="text-slate-500 text-xs mt-1">A <strong>300-tree Random Forest</strong> trained on historical sales data. It uses a log-transform on demand (<code className="bg-slate-100 px-1 rounded text-[10px]">log(1 + demand)</code>) to handle skewed distributions, then predicts your <strong>baseline</strong> — what sales would be without any promotion.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#17A2B8] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <p className="font-semibold text-slate-700">Uplift Model (S-Learner / XGBoost)</p>
              <p className="text-slate-500 text-xs mt-1">A <strong>causal inference model</strong> trained on 135k+ control and 6k+ treatment samples. It estimates the <em>counterfactual</em> — how many extra units would sell <em>because</em> of the discount, not just during it.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulas */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical size={14} className="text-[#17A2B8]" />
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Formulas Used</span>
        </div>
        <div className="space-y-3">
          {[
            {
              label: 'Promo Price',
              formula: 'Base Price × (1 − Discount %)',
              example: 'Rs. 1000 × (1 − 0.15) = Rs. 850',
              unit: 'LKR'
            },
            {
              label: 'Revenue Lift',
              formula: '(Baseline + Uplift) × Promo Price − Baseline × Base Price',
              example: 'Shows net revenue change over the period',
              unit: 'LKR'
            },
            {
              label: 'Profit Lift',
              formula: '(Baseline + Uplift) × (Promo Price − Cost) − Baseline × (Base Price − Cost)',
              example: 'Accounts for cost of goods — the true bottom-line impact',
              unit: 'LKR'
            },
            {
              label: 'Uplift (Causal)',
              formula: 'E[Y | T=1, X] − E[Y | T=0, X]',
              example: 'Expected sales with promo minus expected sales without promo, holding all other factors constant',
              unit: 'units'
            }
          ].map(({ label, formula, example, unit }) => (
            <div key={label} className="bg-slate-50 rounded-xl border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-700 text-xs">{label}</span>
                <span className="text-[10px] bg-[#17A2B8]/10 text-[#17A2B8] font-semibold px-2 py-0.5 rounded-full">{unit}</span>
              </div>
              <code className="text-[11px] bg-white border border-slate-200 rounded-lg px-3 py-2 block text-slate-700 font-mono leading-relaxed">{formula}</code>
              <p className="text-[11px] text-slate-400 mt-2 italic">{example}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features Used */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 size={14} className="text-[#17A2B8]" />
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Key Input Features</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'price_index', desc: 'Relative price vs market' },
            { name: 'discount_depth', desc: 'Discount magnitude (0–1)' },
            { name: 'lag_1 / lag_7', desc: 'Recent sales history' },
            { name: 'rolling_mean_30', desc: '30-day average demand' },
            { name: 'event_impact', desc: 'Seasonal / holiday effect' },
            { name: 'is_rainy', desc: 'Weather demand shift' },
            { name: 'month_sin / dow_sin', desc: 'Cyclical time encoding' },
            { name: 'is_weekend', desc: 'Weekend demand uplift' },
          ].map(({ name, desc }) => (
            <div key={name} className="bg-white border border-slate-100 rounded-lg p-2.5">
              <code className="text-[10px] font-mono font-bold text-[#1B4F72]">{name}</code>
              <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Accuracy Note */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={13} className="text-amber-500" />
          <span className="font-bold text-amber-700 text-xs">Verify AI Outputs</span>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          All predictions are statistical estimates based on historical data. Actual results may vary due to competitor actions, supply disruptions, or unusual events. <strong>Always validate uplift projections against domain knowledge</strong> before running a promotion.
        </p>
      </div>
    </div>
  </motion.div>
);

/* ─── Confidence Badge ──────────────────────────────────────────── */
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

/* ─── Formula Tooltip ───────────────────────────────────────────── */
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

/* ─── StatCard ──────────────────────────────────────────────────── */
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

/* ─── Product Dropdown ──────────────────────────────────────────── */
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
    e.preventDefault();
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

      {/* ── page header ── */}
      <div className="px-6 pt-8 pb-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1B4F72] flex items-center justify-center shadow-lg shadow-[#1B4F72]/20">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Promotional Uplift Forecast</h1>
              <p className="text-sm text-slate-400">AI-powered promotion simulator for the Sri Lankan market</p>
            </div>
          </div>
          <button onClick={() => setShowAlgo(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-[#17A2B8] hover:text-[#17A2B8] transition-all shadow-sm">
            <BookOpen size={13} />
            How It Works
          </button>
        </div>
      </div>

      <div className="px-6 pb-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">

        {/* ── LEFT: Parameters ── */}
        <aside>
          <form onSubmit={handleForecast} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-5">
            <p className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">Simulation Setup</p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Product</label>
              <ProductDropdown products={products} onSelect={pick} />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
              <span className="text-xs text-slate-400 font-medium shrink-0">SKU</span>
              <span className="text-xs font-mono font-bold text-[#1B4F72] truncate">{formData.sku_id || '—'}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[['category', 'Category'], ['brand', 'Brand']].map(([n, l]) => (
                <div key={n}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{l}</label>
                  <input name={n} value={formData[n]} onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]/40 focus:border-[#17A2B8] transition" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[['base_price', 'Base Price (LKR)'], ['cost_price', 'Cost Price (LKR)']].map(([n, l]) => (
                <div key={n}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{l}</label>
                  <input type="number" step="1" name={n} value={formData[n]} onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]/40 focus:border-[#17A2B8] transition" />
                </div>
              ))}
            </div>

            {/* Price Preview */}
            {formData.base_price > 0 && (
              <div className="bg-[#1B4F72]/5 border border-[#1B4F72]/10 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Promo Price Preview</p>
                  <p className="text-lg font-black text-[#1B4F72]">Rs. {fmt(promoPrice)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">Base × (1 − {(formData.test_discount * 100).toFixed(0)}%)</p>
                  <p className="text-xs text-slate-500 font-mono">= {fmt(formData.base_price)} × {(1 - formData.test_discount).toFixed(2)}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {[['stock_level', 'Stock Units', 'number'], ['forecast_duration', 'Duration (Days)', 'number']].map(([n, l, t]) => (
                <div key={n}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{l}</label>
                  <input type={t} name={n} value={formData[n]} onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]/40 focus:border-[#17A2B8] transition" />
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-600">Proposed Discount</label>
                <span className="text-sm font-black text-[#1B4F72] tabular-nums">{(formData.test_discount * 100).toFixed(0)}%</span>
              </div>
              <input type="range" name="test_discount" min="0.05" max="0.80" step="0.01"
                value={formData.test_discount} onChange={handleChange}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#1B4F72] bg-slate-200" />
              <div className="flex justify-between text-[10px] text-slate-300 font-semibold mt-1">
                <span>5%</span><span>80%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button type="submit" disabled={busy}
                className="flex items-center justify-center gap-2 bg-[#1B4F72] hover:bg-[#164060] active:scale-[.97] text-white text-sm font-bold py-2.5 rounded-xl shadow-md shadow-[#1B4F72]/20 transition-all disabled:opacity-50 disabled:pointer-events-none">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Predict
              </button>
              <button type="button" onClick={handleFindOptimal} disabled={busy}
                className="flex items-center justify-center gap-2 bg-[#17A2B8] hover:bg-[#129ab0] active:scale-[.97] text-white text-sm font-bold py-2.5 rounded-xl shadow-md shadow-[#17A2B8]/20 transition-all disabled:opacity-50 disabled:pointer-events-none">
                {isFindingOpt ? <Loader2 size={14} className="animate-spin" /> : <SearchCheck size={14} />}
                Optimise
              </button>
            </div>
          </form>
        </aside>

        {/* ── RIGHT: Results ── */}
        <main className="space-y-5 min-w-0">
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex gap-3 items-start bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <div><span className="font-bold">Simulation failed — </span>{error}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {!result && !loading && !error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center min-h-[420px] bg-white/70 border-2 border-dashed border-slate-200 rounded-3xl text-slate-300">
                <TrendingUp size={48} strokeWidth={1.2} className="mb-4" />
                <p className="text-base font-bold text-slate-400">Ready to simulate</p>
                <p className="text-sm text-slate-300 mt-1">Configure parameters and hit Predict</p>
                <button onClick={() => setShowAlgo(true)}
                  className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#17A2B8] hover:underline">
                  <Info size={12} /> Learn how predictions are made
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {busy && !result && (
            <div className="bg-white rounded-3xl border border-slate-100 p-8 space-y-4 animate-pulse">
              <div className="h-6 bg-slate-100 rounded-full w-1/3" />
              <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl" />)}
              </div>
              <div className="h-24 bg-slate-100 rounded-2xl" />
            </div>
          )}

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

                {/* Hero strip */}
                <div className="bg-[#1B4F72] px-7 py-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 size={16} className="text-emerald-300" />
                      <span className="text-white font-black text-lg">Forecast Ready</span>
                    </div>
                    <p className="text-white/60 text-sm">
                      {result.sku_id} · <span className="font-semibold text-white/80">{(formData.test_discount * 100).toFixed(0)}% discount</span> · {formData.forecast_duration}d
                    </p>
                    <div className="mt-2">
                      <ConfidenceBadge uplift={result.uplift} baseline={result.baseline} />
                    </div>
                  </div>
                  <div className={`flex flex-col items-end px-5 py-3 rounded-2xl border ${result.profit_lift >= 0 ? 'bg-emerald-400/10 border-emerald-400/30' : 'bg-red-400/10 border-red-400/30'}`}>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-0.5">Profit Lift</span>
                    <span className={`text-2xl font-black ${result.profit_lift >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                      {sign(result.profit_lift)}Rs. {fmt(result.profit_lift)}
                    </span>
                    <span className="text-[10px] text-white/30 mt-1">LKR · {formData.forecast_duration} days</span>
                  </div>
                </div>

                {/* Stats row with formula tooltips */}
                <div className="grid grid-cols-3 gap-4 p-6 pb-0">
                  <StatCard label="Baseline Sales" value={`${result.baseline?.toFixed(1)} units`}
                    sub="Without promotion"
                    accent="border-slate-100 bg-slate-50 text-slate-700"
                    formula="Random Forest prediction · log(1+demand) transform" formulaLabel="Hybrid Forecaster" />
                  <StatCard label="Predicted Uplift" value={`+${result.uplift?.toFixed(1)} units`}
                    sub="Causal increment"
                    accent="border-emerald-100 bg-emerald-50 text-emerald-700"
                    formula="E[Y|T=1,X] − E[Y|T=0,X] via S-Learner XGBoost" formulaLabel="Uplift Model" />
                  <StatCard label="Revenue Lift" value={`${sign(result.revenue_lift)}Rs. ${fmt(result.revenue_lift)}`}
                    sub="Net revenue change"
                    accent="border-cyan-100 bg-cyan-50 text-[#1B4F72]"
                    formula="(Baseline+Uplift)×PromoPrice − Baseline×BasePrice" formulaLabel="Revenue Lift" />
                </div>

                {/* Computation breakdown */}
                <div className="px-6 pt-4">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Computation Breakdown</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      {[
                        { label: 'Base Price', val: `Rs. ${fmt(formData.base_price)}`, sub: 'per unit' },
                        { label: 'Promo Price', val: `Rs. ${fmt(promoPrice)}`, sub: `after ${(formData.test_discount * 100).toFixed(0)}% off` },
                        { label: 'Cost Price', val: `Rs. ${fmt(formData.cost_price)}`, sub: 'per unit' },
                        { label: 'Margin (Promo)', val: `Rs. ${fmt(promoPrice - formData.cost_price)}`, sub: 'per unit sold' },
                      ].map(({ label, val, sub }) => (
                        <div key={label} className="bg-white border border-slate-100 rounded-xl p-3">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{label}</p>
                          <p className="font-black text-slate-800 text-sm mt-1">{val}</p>
                          <p className="text-[10px] text-slate-400">{sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-[11px] text-slate-400 font-semibold">AI outputs are estimates — verify before applying</span>
                    </div>
                    <button onClick={handleSave} disabled={isSaving || saveSuccess}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${saveSuccess ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95'}`}>
                      {isSaving ? <Loader2 size={12} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={12} /> : <Save size={12} />}
                      {saveSuccess ? 'Saved!' : 'Save to Suggested'}
                    </button>
                  </div>

                  {/* AI Explanation */}
                  <div className="rounded-2xl bg-gradient-to-br from-[#17A2B8]/5 to-slate-50 border border-[#17A2B8]/15 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#17A2B8]/10 flex items-center justify-center">
                          <Megaphone size={12} className="text-[#17A2B8]" />
                        </div>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">AI Strategic Insight</span>
                      </div>
                      <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full font-semibold">GPT-4o · Verify independently</span>
                    </div>
                    {isExplaining ? (
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Loader2 size={13} className="animate-spin" /> Generating narrative…
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 leading-relaxed">{explanation}</p>
                    )}
                  </div>

                  {/* Top 5 */}
                  <AnimatePresence>
                    {top5 && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <SearchCheck size={14} className="text-emerald-600" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Top 5 Profit-Maximising Discounts</span>
                          <span className="text-[10px] text-slate-400 ml-auto">MIP Solver · Knapsack Optimisation</span>
                        </div>
                        <div className="space-y-2">
                          {top5.map((opt, idx) => (
                            <div key={idx}
                              className={`flex items-center justify-between bg-white border rounded-xl px-4 py-3 text-sm transition-colors ${idx === 0 ? 'border-amber-200 shadow-sm' : 'border-slate-100 hover:border-slate-200'}`}>
                              <div className="flex items-center gap-3">
                                <RankBadge idx={idx} />
                                <span className="font-bold text-slate-800">{(opt.discount * 100).toFixed(0)}% off</span>
                                {idx === 0 && <Pill variant="green">Best</Pill>}
                              </div>
                              <div className="flex items-center gap-6 text-right">
                                <div>
                                  <div className={`font-black text-sm ${opt.profit_lift >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {sign(opt.profit_lift)}Rs. {fmt(opt.profit_lift)}
                                  </div>
                                  <div className="text-[10px] text-slate-400">Profit Lift</div>
                                </div>
                                <div className="hidden sm:block">
                                  <div className="font-black text-sm text-[#1B4F72]">Rs. {fmt(opt.simulation?.revenue_lift)}</div>
                                  <div className="text-[10px] text-slate-400">Revenue Lift</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Risks */}
                  {result.risks?.length > 0 && (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={14} className="text-amber-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Risk Assessment</span>
                      </div>
                      <ul className="space-y-2">
                        {(Array.isArray(result.risks) ? result.risks : [result.risks]).map((r, i) => (
                          <li key={i} className="text-sm text-amber-800 bg-white border border-amber-100 rounded-xl px-4 py-2.5">
                            {typeof r === 'string' ? r : JSON.stringify(r)}
                          </li>
                        ))}
                      </ul>
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