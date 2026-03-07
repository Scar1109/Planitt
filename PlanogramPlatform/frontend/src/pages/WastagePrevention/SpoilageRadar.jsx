import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    AlertTriangle,
    ThermometerSun,
    ArrowDownToLine,
    ShieldAlert,
    RefreshCw,
    Clock,
    Info,
    CheckCircle2
} from 'lucide-react';

function SpoilageRadar() {
    const [riskData, setRiskData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchRiskData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get('http://localhost:3000/api/wastage/index-scores');
            setRiskData(response.data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Failed to fetch spoliage data:', err);
            setError("Unable to connect to the Wastage Prevention AI Service. Please ensure the Python models are running.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRiskData();
        // Optional: set up polling for live dashboard feel
        // const interval = setInterval(fetchRiskData, 60000); // 1 minute
        // return () => clearInterval(interval);
    }, []);

    const getRiskBadgeColor = (score) => {
        if (score >= 8) return 'bg-rose-500 text-white shadow-rose-200';
        if (score >= 5) return 'bg-amber-500 text-white shadow-amber-200';
        return 'bg-emerald-500 text-white shadow-emerald-200';
    };

    const getRowColor = (score) => {
        if (score >= 8) return 'bg-rose-50/30 hover:bg-rose-50/80';
        if (score >= 5) return 'bg-amber-50/30 hover:bg-amber-50/80';
        return 'hover:bg-slate-50 border-transparent';
    };

    const maxQ10Penalty = riskData.length > 0 ? Math.max(...riskData.map(d => d.q10_penalty_days)) : 0;
    const fifoViolationsCount = riskData.filter(d => d.fifo_violation_risk).length;
    const criticalItemsCount = riskData.filter(d => d.sai_score >= 8).length;

    return (
        <div className="p-4 lg:p-8 min-h-screen font-sans max-w-7xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                            <ShieldAlert className="w-7 h-7" />
                        </div>
                        Spoilage Radar
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm lg:text-base max-w-2xl">
                        AI-powered monitoring of environmental thermodynamics and inventory flow anomalies to prevent physical wastage before it occurs.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {lastUpdated && (
                        <div className="hidden md:flex items-center text-xs text-slate-500 font-medium">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            Updated: {lastUpdated.toLocaleTimeString()}
                        </div>
                    )}
                    <button
                        onClick={fetchRiskData}
                        disabled={loading}
                        className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
                        Refresh Scan
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-4">
                    <div className="bg-rose-100 rounded-full p-2 mt-0.5">
                        <AlertTriangle className="text-rose-600 w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-rose-800 font-semibold text-sm">Service Disconnected</h3>
                        <p className="text-rose-600/90 text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            {!error && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 transition-all hover:shadow-md relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <ThermometerSun className="w-24 h-24 text-amber-600 transform translate-x-4 -translate-y-4" />
                            </div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="bg-gradient-to-br from-amber-100 to-orange-100 p-3.5 rounded-xl shadow-sm border border-amber-200/50">
                                    <ThermometerSun className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Highest Thermal Penalty</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <h3 className="text-3xl font-extrabold text-slate-800">
                                            {loading ? '-' : maxQ10Penalty}
                                        </h3>
                                        <span className="text-sm font-medium text-slate-500">days lost</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 transition-all hover:shadow-md relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <ArrowDownToLine className="w-24 h-24 text-rose-600 transform translate-x-4 -translate-y-4" />
                            </div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="bg-gradient-to-br from-rose-100 to-red-100 p-3.5 rounded-xl shadow-sm border border-rose-200/50">
                                    <ArrowDownToLine className="w-6 h-6 text-rose-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">FIFO Violations</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <h3 className="text-3xl font-extrabold text-slate-800">
                                            {loading ? '-' : fifoViolationsCount}
                                        </h3>
                                        <span className="text-sm font-medium text-slate-500">hidden batches</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 transition-all hover:shadow-md relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <ShieldAlert className="w-24 h-24 text-indigo-600 transform translate-x-4 -translate-y-4" />
                            </div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="bg-gradient-to-br from-indigo-100 to-blue-100 p-3.5 rounded-xl shadow-sm border border-indigo-200/50">
                                    <ShieldAlert className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Critical SAI Items</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <h3 className="text-3xl font-extrabold text-slate-800">
                                            {loading ? '-' : criticalItemsCount}
                                        </h3>
                                        <span className="text-sm font-medium text-slate-500">require action</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col">
                        <div className="px-6 py-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-slate-800">Active Spoilage Index</h2>
                                <div className="group relative cursor-help">
                                    <Info className="w-4 h-4 text-slate-400 hover:text-indigo-500 transition-colors" />
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-50">
                                        Items scored 1-10 based on thermodynamic decay probability and human stocking errors. Higher scores require immediate intervention.
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div> Live Connection
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            {loading ? (
                                <div className="grid gap-4 p-6">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="animate-pulse flex space-x-4 bg-slate-50 h-16 rounded-xl"></div>
                                    ))}
                                </div>
                            ) : riskData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-16 text-center">
                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-slate-800 font-bold text-lg">All Clear!</h3>
                                    <p className="text-slate-500 max-w-sm mt-1">No active inventory batches are currently flagging high spoilage or thermal decay risks.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider">
                                            <th className="px-6 py-4 font-bold border-b border-slate-100">Product Identity</th>
                                            <th className="px-6 py-4 font-bold border-b border-slate-100">SAI Score</th>
                                            <th className="px-6 py-4 font-bold border-b border-slate-100">Expiry Shift</th>
                                            <th className="px-6 py-4 font-bold border-b border-slate-100">AI Diagnosis & Prescription</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {riskData.map((item, index) => (
                                            <tr key={index} className={`transition-colors duration-200 border-l-4 ${getRowColor(item.sai_score)} ${item.sai_score >= 8 ? 'border-l-rose-500' : item.sai_score >= 5 ? 'border-l-amber-400' : 'border-l-transparent'}`}>
                                                <td className="px-6 py-5 align-top">
                                                    <div className="font-bold text-slate-800 text-sm">{item.product_name}</div>
                                                    <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                                                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{item.sku}</span>
                                                        {item.category}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 align-top">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <span className={`px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm ${getRiskBadgeColor(item.sai_score)}`}>
                                                            {item.sai_score} / 10
                                                        </span>
                                                        {item.sai_score >= 8 && <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Critical</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 align-top">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <span className="text-slate-400 line-through decoration-slate-300">{item.original_expiry_days}d</span>
                                                            <span className="text-slate-300">→</span>
                                                            <span className={`font-bold ${item.effective_remaining_days < item.original_expiry_days ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                {item.effective_remaining_days}d
                                                            </span>
                                                        </div>
                                                        {item.q10_penalty_days > 0 && (
                                                            <div className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded w-max">
                                                                -{item.q10_penalty_days} days lost
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 align-top">
                                                    <div className="space-y-2">
                                                        {item.fifo_violation_risk && (
                                                            <div className="inline-flex items-start gap-2 bg-rose-50 border border-rose-100 text-rose-700 px-3 py-2 rounded-lg text-sm font-medium">
                                                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-500" />
                                                                <div>
                                                                    <strong className="block text-rose-800">Shelving Anomaly Detected</strong>
                                                                    Sales velocity is abnormally low. Inspect shelf physically to ensure older stock is accessible at the front.
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="text-sm text-slate-600 leading-relaxed border-l-2 border-slate-200 pl-3">
                                                            {item.reasoning}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default SpoilageRadar;
