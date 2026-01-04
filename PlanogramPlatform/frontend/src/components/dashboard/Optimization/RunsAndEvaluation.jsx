import React, { useState, useEffect } from 'react';
import { FaTrash, FaEye, FaCheckCircle, FaTimesCircle, FaClock, FaSearch } from 'react-icons/fa';
import api from '../../../services/api';
import PlanogramViewer from './components/PlanogramViewer';

const RunsAndEvaluation = () => {
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewingRun, setViewingRun] = useState(null);
    const [fixtures, setFixtures] = useState([]);
    const [products, setProducts] = useState([]);

    // Fetch Runs on Mount
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

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Runs & Evaluation</h1>
                    <p className="text-slate-500">History of your optimization experiments.</p>
                </div>
                <button onClick={fetchRuns} className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">Refresh List</button>
            </div>

            {/* Run List Table - Card Style for Modern Look */}
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
                        <div key={run._id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow">

                            {/* Run Info */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                                        ${run.status === 'success' ? 'bg-green-100 text-green-700' :
                                            run.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {run.status}
                                    </span>
                                    <span className="text-xs text-slate-400 font-mono">ID: {run._id.slice(-6)}</span>
                                </div>
                                <h3 className="font-bold text-slate-800">{run.runType} Optimization</h3>
                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-4">
                                    <span><FaClock className="inline mr-1" /> {formatTime(run.createdAt)}</span>
                                    {run.bestScore && <span>Score: <span className="font-mono text-indigo-600">{run.bestScore.toFixed(2)}</span></span>}
                                </p>
                            </div>

                            {/* Details Grid (Mini) */}
                            <div className="hidden lg:grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-slate-500 border-l border-slate-100 pl-6">
                                <div><span className="font-medium text-slate-700">Weights:</span> Sales {(run.objectiveWeights?.sales * 100).toFixed(0)}%</div>
                                <div><span className="font-medium text-slate-700">Placements:</span> {Array.isArray(run.resultingPlacements) ? run.resultingPlacements.length : 0}</div>
                                <div className="col-span-2 truncate max-w-[200px]" title={run.logsRef}>{run.logsRef || 'No description'}</div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
                                <button
                                    onClick={() => setViewingRun(run)}
                                    disabled={run.status !== 'success'}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    ))
                )}
            </div>

            {/* Viewer Modal */}
            {viewingRun && (
                <PlanogramViewer
                    onClose={() => setViewingRun(null)}
                    result={viewingRun}
                    fixtures={fixtures}
                    levels={fixtures.flatMap(f => f.levels.map(l => ({ ...l, fixtureName: f.aisleBaySide, fixtureId: f._id })))} // Reconstruct levels flat map
                    products={products}
                />
            )}
        </div>
    );
};

export default RunsAndEvaluation;
