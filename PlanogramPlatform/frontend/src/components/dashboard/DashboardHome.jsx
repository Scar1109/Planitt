import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutGrid, TrendingUp, TrendingDown, ShieldCheck, Package,
    BarChart3, AlertTriangle, Zap, ArrowRight, Activity, Clock,
    Eye, Layers, Target, Leaf, DollarSign, CheckCircle2,
    LineChart, PieChart, Boxes, ShoppingCart, Sparkles, BrainCircuit,
    CalendarDays, Timer, Gauge, ArrowUpRight, Megaphone, FlaskConical
} from 'lucide-react';

// ─── Animated Counter Hook ───────────────────────────
function useCounter(target, duration = 1800) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    useEffect(() => {
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(Math.floor(start));
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration]);
    return count;
}

// ─── Mini Sparkline Component ────────────────────────
const Sparkline = ({ data, color = '#6366f1', height = 32 }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const w = 100;
    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
    }).join(' ');
    return (
        <svg width={w} height={height} className="shrink-0">
            <defs>
                <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
            <polygon fill={`url(#sg-${color.replace('#', '')})`}
                points={`0,${height} ${points} ${w},${height}`} />
        </svg>
    );
};

// ─── Circular Progress Gauge ─────────────────────────
const CircleGauge = ({ value, max = 100, size = 56, strokeWidth = 5, color = '#6366f1' }) => {
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;
    const pct = Math.min(value / max, 1);
    return (
        <svg width={size} height={size} className="shrink-0 -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
                strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
                className="transition-all duration-1000 ease-out" />
        </svg>
    );
};

// ─── KPI Stat Card ──────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, suffix = '', trend, trendValue, gradient, delay = 0 }) => {
    const animatedValue = useCounter(typeof value === 'number' ? value : 0, 2000);
    const displayValue = typeof value === 'number' ? animatedValue.toLocaleString() : value;
    return (
        <div className="group relative bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-500 hover:-translate-y-1 overflow-hidden"
            style={{ animationDelay: `${delay}ms` }}>
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-[60px] opacity-10 ${gradient}`} />
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${gradient} mb-3`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <div className="flex items-end gap-1.5">
                <span className="text-2xl font-bold text-slate-800">{displayValue}{suffix}</span>
                {trend && (
                    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full mb-0.5 ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {trendValue}
                    </span>
                )}
            </div>
        </div>
    );
};

// ─── Module Card ────────────────────────────────────
const ModuleCard = ({ icon: Icon, title, subtitle, gradient, iconBg, stats, link, linkLabel = 'View Details', delay = 0 }) => {
    const navigate = useNavigate();
    return (
        <div className="group relative bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500 hover:-translate-y-1 cursor-pointer"
            onClick={() => navigate(link)} style={{ animationDelay: `${delay}ms` }}>
            {/* Top gradient bar */}
            <div className={`h-1 ${gradient}`} />
            <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${iconBg}`}>
                        <Icon className="w-5.5 h-5.5 text-white" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#17A2B8] group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-0.5">{title}</h3>
                <p className="text-xs text-slate-400 mb-4">{subtitle}</p>
                <div className="space-y-2.5">
                    {stats.map((stat, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <span className="text-xs text-slate-500">{stat.label}</span>
                            <div className="flex items-center gap-1.5">
                                {stat.bar && (
                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${stat.barColor || 'bg-[#1B4F72]'}`}
                                            style={{ width: `${stat.bar}%`, transition: 'width 1.5s ease-out' }} />
                                    </div>
                                )}
                                <span className={`text-xs font-semibold ${stat.valueColor || 'text-slate-700'}`}>{stat.value}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* Bottom link */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between group-hover:bg-[#17A2B8]/10 transition-colors duration-300">
                <span className="text-xs font-semibold text-slate-500 group-hover:text-[#1B4F72] transition-colors">{linkLabel}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#17A2B8] transition-colors" />
            </div>
        </div>
    );
};

// ─── Activity Item ──────────────────────────────────
const ActivityItem = ({ icon: Icon, color, title, time, tag }) => (
    <div className="flex items-start gap-3 group">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
            <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-700 font-medium truncate">{title}</p>
            <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-400">{time}</span>
                {tag && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{tag}</span>}
            </div>
        </div>
    </div>
);

// ─── Quick Stat Pill ────────────────────────────────
const StatPill = ({ icon: Icon, label, value, color }) => (
    <div className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-slate-100 hover:shadow-md transition-all duration-300 shrink-0">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${color}`}>
            <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
            <p className="text-[10px] text-slate-400 font-medium leading-tight">{label}</p>
            <p className="text-xs font-bold text-slate-700">{value}</p>
        </div>
    </div>
);


// ═══════════════════════════════════════════════════
// ─── MAIN DASHBOARD HOME ────────────────────────────
// ═══════════════════════════════════════════════════
const DashboardHome = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loaded, setLoaded] = useState(false);
    const [stats, setStats] = useState({
        activePlanograms: 0,
        allProducts: 0,
        lowStockCount: 0,
        upcomingEvents: 0,
        modules: {
            optimization: { score: 87, lastRun: '2h ago' },
            promotional: { activeCount: 5, lift: 18, scenarios: 23 },
            compliance: { score: 94, violations: 3, lastScan: '1h ago' },
            inventory: { accuracy: 94.2, stockHealth: 'Good' }
        }
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.getDashboardKpis();
                if (res.success) {
                    setStats(res.data);
                }
            } catch (err) {
                console.error("Failed to load dashboard stats", err);
            }
        };

        fetchStats();
        const t = setTimeout(() => setLoaded(true), 100);
        return () => clearTimeout(t);
    }, []);

    const now = new Date();
    const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    return (
        <div className={`space-y-6 transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

            {/* ── Welcome Header ──────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 p-6 text-white shadow-xl shadow-cyan-900/20">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0aDR2MWgtNHYtMXptMC0yaDF2NGgtMXYtNHptMiAwaDF2NGgtMXYtNHptLTUgNWg0djFoLTR2LTF6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24 blur-3xl" />
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">{greeting}</h1>
                        <p className="text-teal-100 text-sm mt-1 flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5" /> {dateStr}
                            {user?.storeName && <span className="ml-2 px-2 py-0.5 bg-white/10 rounded-full text-xs">📍 {user.storeName}</span>}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-xl flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-xs font-medium">All Systems Online</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── KPI Stats Row ────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={Layers} label="Active Planograms" value={stats.activePlanograms} suffix="" trend="up" trendValue="+15%"
                    gradient="bg-gradient-to-br from-teal-500 to-emerald-600" delay={0} />
                <KpiCard icon={Package} label="All Product Count" value={stats.allProducts} trend="up" trendValue="+8"
                    gradient="bg-gradient-to-br from-cyan-500 to-blue-600" delay={100} />
                <KpiCard icon={AlertTriangle} label="Low Stock Count" value={stats.lowStockCount} trend="down" trendValue="-3"
                    gradient="bg-gradient-to-br from-blue-500 to-[#1B4F72]" delay={200} />
                <KpiCard icon={CalendarDays} label="Upcoming Events" value={stats.upcomingEvents} trend="neutral" trendValue="Next 30 Days"
                    gradient="bg-gradient-to-br from-slate-600 to-slate-800" delay={300} />
            </div>





            {/* ── Module Section ────────────────────────── */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <LayoutGrid className="w-4.5 h-4.5 text-blue-500" />
                        <h2 className="text-base font-bold text-slate-800">System Modules</h2>
                    </div>
                    <span className="text-xs text-slate-400">4 modules active</span>
                </div>

                {/* System Modules Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <ModuleCard
                        icon={Boxes} title="Planogram Optimization"
                        subtitle="AI-powered shelf layout engine"
                        gradient="bg-gradient-to-r from-teal-500 to-cyan-500"
                        iconBg="bg-gradient-to-br from-teal-500 to-cyan-600"
                        link="/dashboard/optimization"
                        stats={[
                            { label: 'Active Planograms', value: stats.activePlanograms, valueColor: 'text-teal-600' },
                            { label: 'Improvement', value: `${stats.modules.optimization.score}%`, bar: stats.modules.optimization.score, barColor: 'bg-teal-500' },
                            { label: 'Last Run', value: stats.modules.optimization.lastRun, valueColor: 'text-slate-500' },
                        ]}
                        delay={0}
                    />
                    <ModuleCard
                        icon={Megaphone} title="Promotional Forecasting"
                        subtitle="Predict promotion impact & ROI"
                        gradient="bg-gradient-to-r from-cyan-500 to-blue-500"
                        iconBg="bg-gradient-to-br from-cyan-500 to-blue-600"
                        link="/dashboard/promotional-forecasting/forecast"
                        stats={[
                            { label: 'Active Promotions', value: stats.modules.promotional.activeCount, valueColor: 'text-cyan-600' },
                            { label: 'Predicted Lift', value: `+${stats.modules.promotional.lift}%`, valueColor: 'text-emerald-600' },
                            { label: 'Scenarios Tested', value: stats.modules.promotional.scenarios, valueColor: 'text-slate-500' },
                        ]}
                        delay={100}
                    />
                    <ModuleCard
                        icon={ShieldCheck} title="Compliance Intelligence"
                        subtitle="Automated planogram audit & scoring"
                        gradient="bg-gradient-to-r from-blue-500 to-[#1B4F72]"
                        iconBg="bg-gradient-to-br from-blue-500 to-[#1B4F72]"
                        link="/dashboard/compliance"
                        stats={[
                            { label: 'Compliance Score', value: `${stats.modules.compliance.score}%`, bar: stats.modules.compliance.score, barColor: 'bg-blue-500' },
                            { label: 'Violations', value: stats.modules.compliance.violations, valueColor: 'text-slate-600' },
                            { label: 'Last Scan', value: stats.modules.compliance.lastScan, valueColor: 'text-slate-500' },
                        ]}
                        delay={200}
                    />
                    <ModuleCard
                        icon={LineChart} title="Inventory Forecasting"
                        subtitle="ML demand prediction & stock planning"
                        gradient="bg-gradient-to-r from-slate-600 to-slate-800"
                        iconBg="bg-gradient-to-br from-slate-600 to-slate-800"
                        link="/dashboard/forecasting"
                        stats={[
                            { label: 'Items Tracked', value: stats.allProducts?.toLocaleString(), valueColor: 'text-slate-700' },
                            { label: 'Forecast Accuracy', value: `${stats.modules.inventory.accuracy}%`, bar: stats.modules.inventory.accuracy, barColor: 'bg-slate-600' },
                            { label: 'Stock Health', value: stats.modules.inventory.stockHealth, valueColor: 'text-emerald-600' },
                        ]}
                        delay={300}
                    />
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;
