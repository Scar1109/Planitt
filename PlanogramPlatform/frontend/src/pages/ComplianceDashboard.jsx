import React, { useState } from 'react';
import api from '../services/api';
import { FaCheckCircle, FaExclamationTriangle, FaChartLine, FaRobot, FaSearch, FaCamera } from 'react-icons/fa';
import ShelfCompliance from './ShelfCompliance';

const ComplianceDashboard = () => {
    const [activeTab, setActiveTab] = useState('shelf'); // 'global' or 'shelf'
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [report, setReport] = useState(null);
    const [agentInsight, setAgentInsight] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Real Data State
    const [planograms, setPlanograms] = useState([]);
    const [metadata, setMetadata] = useState(null);
    const [currentId, setCurrentId] = useState('');
    const [optimizedId, setOptimizedId] = useState('');

    // Fetch Planogram List & Metadata on Mount
    React.useEffect(() => {
        const loadInitialData = async () => {
            try {
                // 1. Fetch Planograms
                const resPlano = await api.get('/planograms');
                setPlanograms(resPlano.data.data.planograms);

                // 2. Fetch System Metadata (for Accuracy display)
                const resMeta = await api.get('/compliance/metadata');
                setMetadata(resMeta.data);
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            }
        };
        loadInitialData();
    }, []);

    const runCheck = async () => {
        if (!currentId || !optimizedId) {
            setErrorMessage("Please select both a Current and Optimized planogram.");
            setStatus('error');
            return;
        }

        setStatus('loading');
        setErrorMessage('');
        try {
            // 1. Fetch full details for both selected planograms
            const [currentRes, optimizedRes] = await Promise.all([
                api.get(`/planograms/${currentId}`),
                api.get(`/planograms/${optimizedId}`)
            ]);

            const currentData = currentRes.data.data;
            const optimizedData = optimizedRes.data.data;

            // 2. Construct Payload
            const payload = {
                current_planogram: {
                    _id: currentData.planogram._id,
                    placements: currentData.placements // Already formatted by backend controller
                },
                optimized_planogram: {
                    placements: optimizedData.placements
                }
            };

            // 3. Send to Compliance Engine
            const response = await api.post('/compliance/check', payload);

            if (response.data.save_error) {
                console.error("Save Error:", response.data.save_error);
            }

            setReport(response.data);
            setAgentInsight(response.data.agent_summary);
            setStatus('success');
        } catch (error) {
            console.error("Compliance Check Failed:", error);
            setStatus('error');
            const msg = error.response?.data?.message || error.message || "Unknown error occurred";
            setErrorMessage(msg);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <header className="mb-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Compliance Intelligence Layer</h1>
                        <p className="text-gray-500 italic">Academic Audit & Economic Impact Engine</p>
                    </div>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="flex gap-4 mb-6 border-b border-gray-200">
                <button 
                    onClick={() => setActiveTab('shelf')}
                    className={`pb-3 px-2 font-bold transition-all flex items-center gap-2 ${activeTab === 'shelf' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <FaCamera size={14} /> Shelf-Level Visual Audit
                </button>
                <button 
                    onClick={() => setActiveTab('global')}
                    className={`pb-3 px-2 font-bold transition-all flex items-center gap-2 ${activeTab === 'global' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <FaSearch size={14} /> Global Compliance Map
                </button>
            </div>

            {activeTab === 'global' ? (
                <>
                    {/* Control Panel */}
                    <div className="bg-white p-6 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border border-gray-100">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Implementation (Floor Scan)</label>
                                <select
                                    className="w-full border-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 border"
                                    value={currentId}
                                    onChange={(e) => setCurrentId(e.target.value)}
                                >
                                    <option value="">-- Select Planogram --</option>
                                    {planograms.map(p => (
                                        <option key={p._id} value={p._id}>{p.name} ({p.status})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Optimized Model (Target)</label>
                                <select
                                    className="w-full border-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 border"
                                    value={optimizedId}
                                    onChange={(e) => setOptimizedId(e.target.value)}
                                >
                                    <option value="">-- Select Planogram --</option>
                                    {planograms.map(p => (
                                        <option key={p._id} value={p._id}>{p.name} ({p.status})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={runCheck}
                            disabled={status === 'loading'}
                            className={`px-8 py-2.5 rounded-lg font-bold text-white transition h-fit shadow-md ${status === 'loading' ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
                        >
                            {status === 'loading' ? 'Calculating...' : 'Run Global Audit'}
                        </button>
                    </div>

                    {/* Error Display */}
                    {status === 'error' && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg ring-1 ring-red-100">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <FaExclamationTriangle className="h-5 w-5 text-red-500" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-bold text-red-800">Analysis Failed</h3>
                                    <div className="mt-1 text-sm text-red-700">
                                        <p>{errorMessage}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {status === 'success' && report && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Scorecards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-green-500">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <FaCheckCircle className="text-green-500 text-xl" />
                                        <h4 className="text-gray-500 font-bold uppercase text-xs tracking-wider">Compliance Score</h4>
                                    </div>
                                    <span className="text-4xl font-black text-gray-800">{report.score}%</span>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-red-500">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <FaExclamationTriangle className="text-red-500 text-xl" />
                                        <h4 className="text-gray-500 font-bold uppercase text-xs tracking-wider">Deviations Found</h4>
                                    </div>
                                    <span className="text-4xl font-black text-gray-800">{report.deviations.length}</span>
                                </div>
                                <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 ${report.total_revenue_opportunity < 0 ? 'border-red-500' : 'border-yellow-500'}`}>
                                    <div className="flex items-center space-x-3 mb-2">
                                        <FaChartLine className={`${report.total_revenue_opportunity < 0 ? 'text-red-500' : 'text-yellow-500'} text-xl`} />
                                        <h4 className="text-gray-500 font-bold uppercase text-xs tracking-wider">
                                            {report.total_revenue_opportunity < 0 ? 'Revenue Loss' : 'Revenue Opportunity'}
                                        </h4>
                                    </div>
                                    <span className={`text-4xl font-black ${report.total_revenue_opportunity < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                                        {report.total_revenue_opportunity < 0 
                                            ? `${report.total_revenue_opportunity} ${report.currency}`
                                            : `${report.total_revenue_opportunity > 0 ? '+' : ''}${report.total_revenue_opportunity} ${report.currency}`}
                                    </span>
                                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Predicted Monthly Impact</p>
                                </div>
                            </div>

                            {/* Agent Insight */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-xl text-white shadow-lg shadow-blue-200">
                                <div className="flex items-start space-x-4">
                                    <div className="bg-white/20 p-3 rounded-full backdrop-blur-md">
                                        <FaRobot size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2 mb-2">
                                            <h3 className="font-black uppercase tracking-widest text-xs text-blue-100">AI Agent Intelligence Report</h3>
                                        </div>
                                        <p className="text-lg font-medium leading-relaxed italic opacity-95">
                                            "{agentInsight}"
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Audit Table */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 border-b bg-gray-50/50 flex justify-between items-center">
                                    <h3 className="font-black text-gray-800 uppercase tracking-tighter">Deviation Audit Log</h3>
                                    <span className="text-xs font-bold text-gray-400">{report.deviations.length} items flagged</span>
                                </div>
                                <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/80 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Status & Type</th>
                                            <th className="px-6 py-4">SKU Code</th>
                                            <th className="px-6 py-4">Issue Narrative</th>
                                            <th className="px-6 py-4 text-right">Predicted Loss</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {report.deviations.map((dev, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50 transition">
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${dev.type === 'MISPLACED_ITEM' ? 'bg-orange-100 text-orange-700' :
                                                        dev.type === 'MISSING_ITEM' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {dev.type.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-sm text-gray-500">{dev.sku}</td>
                                                <td className="px-6 py-4 text-gray-600 text-sm font-medium">{dev.description}</td>
                                                <td className="px-6 py-4 text-right font-black text-gray-800 text-sm">
                                                    -{dev.impact_prediction?.revenue_opportunity || 0} <span className="text-[10px] font-bold opacity-50">{report.currency}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <ShelfCompliance />
                </div>
            )}
        </div>
    );
};

export default ComplianceDashboard;
