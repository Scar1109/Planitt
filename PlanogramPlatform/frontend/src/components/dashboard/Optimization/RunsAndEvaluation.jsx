import React, { useState, useEffect } from 'react';
import { FaTrash, FaEye, FaClock, FaChartLine, FaArrowUp, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import api from '../../../services/api';
import PlanogramViewer from './components/PlanogramViewer';

const ConvergenceChart = ({ history }) => {
    if (!history || history.length < 2) return null;

    const scores = history.map(h => h.score);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const range = maxScore - minScore || 1;

    const width = 400;
    const height = 120;
    const padding = { top: 10, right: 10, bottom: 25, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const points = history.map((h, i) => {
        const x = padding.left + (i / (history.length - 1)) * chartW;
        const y = padding.top + chartH - ((h.score - minScore) / range) * chartH;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                <FaChartLine className="text-[#17A2B8]" /> Convergence History
            </p>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                    const y = padding.top + chartH * (1 - pct);
                    const val = (minScore + range * pct).toFixed(0);
                    return (
                        <g key={pct}>
                            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
                            <text x={padding.left - 5} y={y + 3} textAnchor="end" className="fill-slate-400" style={{ fontSize: '7px' }}>{val}</text>
                        </g>
                    );
                })}
                {/* Gradient fill */}
                <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#17A2B8" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#17A2B8" stopOpacity="0.02" />
                    </linearGradient>
                </defs>
                <polygon
                    points={`${padding.left},${padding.top + chartH} ${points} ${width - padding.right},${padding.top + chartH}`}
                    fill="url(#areaGrad)"
                />
                {/* Line */}
                <polyline points={points} fill="none" stroke="#17A2B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {/* Dots */}
                {history.map((h, i) => {
                    const x = padding.left + (i / (history.length - 1)) * chartW;
                    const y = padding.top + chartH - ((h.score - minScore) / range) * chartH;
                    return i % Math.max(1, Math.floor(history.length / 8)) === 0 || i === history.length - 1 ? (
                        <circle key={i} cx={x} cy={y} r="2.5" fill="#1B4F72" stroke="white" strokeWidth="1" />
                    ) : null;
                })}
                {/* X-axis label */}
                <text x={width / 2} y={height - 2} textAnchor="middle" className="fill-slate-400" style={{ fontSize: '7px' }}>Iteration</text>
            </svg>
        </div>
    );
};

const RunsAndEvaluation = () => {
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewingRun, setViewingRun] = useState(null);
    const [expandedRun, setExpandedRun] = useState(null);
    const [fixtures, setFixtures] = useState([]);
    const [products, setProducts] = useState([]);

    useEffect(() => {
        fetchRuns();
        fetchContextData();
    }, []);

    const fetchRuns = async () => {
        try {
            const res = await api.get('/planograms/optimization/runs');
            setRuns(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch runs", error);
            setLoading(false);
        }
    };

    const fetchContextData = async () => {
        try {
            const [shelvesRes, productsRes] = await Promise.all([
                api.get('/planograms/shelves'),
                api.get('/products?isActive=true')
            ]);
            setFixtures(shelvesRes.data || []);
            setProducts(productsRes.data || []);
        } catch (error) {
            console.error("Failed to fetch context", error);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this run?")) return;
        try {
            await api.delete(`/planograms/optimization/runs/${id}`);
            setRuns(runs.filter(r => r._id !== id));
        } catch (error) {
            console.error("Failed to delete run", error);
            alert("Failed to delete run");
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return '--';
        return new Date(isoString).toLocaleString();
    };

    const formatRuntime = (ms) => {
        if (!ms) return '--';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Runs & Evaluation</h1>
                    <p className="text-slate-500 text-sm">History, scoring, and convergence analysis for optimization experiments.</p>
                </div>
                <button onClick={fetchRuns} className="text-[#17A2B8] hover:text-[#1B4F72] font-semibold text-sm transition-colors">Refresh List</button>
            </div>

            <div className="flex-1 overflow-auto space-y-4">
                {loading ? (
                    <div className="text-center py-10 text-slate-400">Loading runs...</div>
                ) : runs.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <p className="text-slate-500">No optimization runs found.</p>
                        <p className="text-sm text-slate-400">Run an optimization from the Dashboard first.</p>
                    </div>
                ) : (
                    runs.map(run => (
                        <div key={run._id} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow overflow-hidden">
                            {/* Main Row */}
                            <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                {/* Run Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                                            ${run.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                                                run.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {run.status}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">ID: {run._id.slice(-6)}</span>
                                    </div>
                                    <h3 className="font-bold text-slate-800">{run.runType} Optimization</h3>
                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-4 flex-wrap">
                                        <span><FaClock className="inline mr-1" /> {formatTime(run.createdAt)}</span>
                                        {run.bestScore && <span>Score: <span className="font-mono text-[#1B4F72] font-bold">{run.bestScore.toFixed(2)}</span></span>}
                                        {run.heuristicScore > 0 && (
                                            <span className="text-emerald-600 flex items-center gap-1">
                                                <FaArrowUp className="text-[10px]" />
                                                {((run.bestScore - run.heuristicScore) / run.heuristicScore * 100).toFixed(1)}% improvement
                                            </span>
                                        )}
                                    </p>
                                </div>

                                {/* Score Comparison Badges */}
                                <div className="hidden lg:flex items-center gap-3">
                                    {run.heuristicScore > 0 && (
                                        <div className="text-center px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">Heuristic</p>
                                            <p className="text-sm font-bold text-slate-600">{run.heuristicScore?.toFixed(1)}</p>
                                        </div>
                                    )}
                                    {run.bestScore && (
                                        <div className="text-center px-3 py-1.5 bg-gradient-to-b from-[#17A2B8]/10 to-transparent rounded-lg border border-[#17A2B8]/20">
                                            <p className="text-[10px] text-[#17A2B8] uppercase font-bold">Best</p>
                                            <p className="text-sm font-bold text-[#1B4F72]">{run.bestScore?.toFixed(1)}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                                    {(run.convergenceHistory?.length > 0 || run.constraintViolations?.length > 0) && (
                                        <button
                                            onClick={() => setExpandedRun(expandedRun === run._id ? null : run._id)}
                                            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 font-medium text-sm transition-colors"
                                        >
                                            <FaChartLine /> Details
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setViewingRun(run)}
                                        disabled={run.status !== 'success'}
                                        className="flex items-center gap-1.5 px-3.5 py-2 bg-[#17A2B8]/10 text-[#1B4F72] rounded-lg hover:bg-[#17A2B8]/20 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <FaEye /> View
                                    </button>
                                    <button
                                        onClick={() => handleDelete(run._id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Run"
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Details Panel */}
                            {expandedRun === run._id && (
                                <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/50">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {/* Convergence Chart */}
                                        {run.convergenceHistory?.length > 1 && (
                                            <ConvergenceChart history={run.convergenceHistory} />
                                        )}

                                        {/* Metrics & Violations */}
                                        <div className="space-y-3">
                                            {/* Runtime & Score Comparison */}
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="bg-white rounded-lg p-3 border border-slate-200 text-center">
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Runtime</p>
                                                    <p className="text-sm font-bold text-slate-700 mt-0.5">{formatRuntime(run.runtimeMs)}</p>
                                                </div>
                                                <div className="bg-white rounded-lg p-3 border border-slate-200 text-center">
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Placements</p>
                                                    <p className="text-sm font-bold text-slate-700 mt-0.5">
                                                        {Array.isArray(run.resultingPlacements) ? run.resultingPlacements.length : 0}
                                                    </p>
                                                </div>
                                                <div className="bg-white rounded-lg p-3 border border-slate-200 text-center">
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Improvement</p>
                                                    <p className="text-sm font-bold text-emerald-600 mt-0.5">
                                                        {run.heuristicScore > 0
                                                            ? `+${((run.bestScore - run.heuristicScore) / run.heuristicScore * 100).toFixed(1)}%`
                                                            : '--'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Constraint Violations */}
                                            {run.constraintViolations?.length > 0 && (
                                                <div className="bg-[#17A2B8]/10 rounded-lg p-3 border border-[#17A2B8]/20">
                                                    <p className="text-xs font-bold text-[#1B4F72] flex items-center gap-1 mb-2">
                                                        <FaExclamationTriangle /> {run.constraintViolations.length} Constraint Violation{run.constraintViolations.length > 1 ? 's' : ''}
                                                    </p>
                                                    <div className="space-y-1">
                                                        {run.constraintViolations.slice(0, 5).map((v, i) => (
                                                            <p key={i} className="text-xs text-[#17A2B8]">
                                                                <span className="font-mono bg-[#17A2B8]/10 px-1 rounded">{v.ruleType}</span> {v.message}
                                                            </p>
                                                        ))}
                                                        {run.constraintViolations.length > 5 && (
                                                            <p className="text-xs text-[#17A2B8]">...and {run.constraintViolations.length - 5} more</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {run.constraintViolations?.length === 0 && (
                                                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                                                    <p className="text-xs font-bold text-emerald-600">✓ All constraints satisfied</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Viewer Modal */}
            {viewingRun && (
                <PlanogramViewer
                    onClose={() => setViewingRun(null)}
                    result={viewingRun}
                    fixtures={fixtures}
                    levels={fixtures.flatMap(f => f.levels.map(l => ({ ...l, fixtureName: f.aisleBaySide, fixtureId: f._id })))}
                    products={products}
                />
            )}
        </div>
    );
};

export default RunsAndEvaluation;
