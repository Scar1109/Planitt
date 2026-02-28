import React, { useState } from 'react';
import api from '../services/api';
import { FaCheckCircle, FaExclamationTriangle, FaChartLine, FaRobot } from 'react-icons/fa';

const ComplianceDashboard = () => {
    // Mock Data for "Current" and "Optimized" Planograms (In real app, fetch from DB)
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
                // Optionally show toast or alert?
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
                        <p className="text-gray-500">Academic Validation & Economic Impact Analysis</p>
                    </div>
                    {/* System Status Badge
                    {metadata && (
                        <div className="hidden md:flex flex-col items-end">
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                                <div className="text-xs text-gray-500 text-right">
                                    <div className="font-bold text-gray-800">{metadata.ml_model?.params?.model || "Unknown Model"}</div>
                                    <div>RMSE: <span className="text-emerald-600 font-mono font-bold">{metadata.ml_model?.metrics?.RMSE?.toFixed(4) || "0.00"}</span></div>
                                </div>
                            </div>
                        </div>
                    )} */}
                </div>
            </header>

            {/* Control Panel */}
            <div className="bg-white p-6 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Implementation (Floor Scan)</label>
                        <select
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
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
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
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
                    className={`px-6 py-2.5 rounded-lg font-bold text-white transition h-fit ${status === 'loading' ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {status === 'loading' ? 'Analyzing...' : 'Run Compliance Check'}
                </button>
            </div>

            {/* Error Display */}
            {status === 'error' && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <FaExclamationTriangle className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Analysis Failed</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>{errorMessage}</p>
                                <p className="mt-1 font-mono text-xs">Backend: http://localhost:3000/api</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {status === 'success' && report && (
                <div className="space-y-6">
                    {/* Scorecards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                            <div className="flex items-center space-x-3 mb-2">
                                <FaCheckCircle className="text-green-500 text-xl" />
                                <h4 className="text-gray-600 font-medium">Compliance Score</h4>
                            </div>
                            <span className="text-4xl font-bold text-gray-800">{report.score}%</span>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500">
                            <div className="flex items-center space-x-3 mb-2">
                                <FaExclamationTriangle className="text-red-500 text-xl" />
                                <h4 className="text-gray-600 font-medium">Deviations</h4>
                            </div>
                            <span className="text-4xl font-bold text-gray-800">{report.deviations.length}</span>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
                            <div className="flex items-center space-x-3 mb-2">
                                <FaChartLine className="text-yellow-500 text-xl" />
                                <h4 className="text-gray-600 font-medium">Revenue Opportunity</h4>
                            </div>
                            <span className="text-4xl font-bold text-gray-800">{report.total_revenue_opportunity} {report.currency}</span>
                            <p className="text-xs text-gray-500 mt-1">Predicted monthly lift</p>
                        </div>
                    </div>

                    {/* Agent Insight */}
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-lg border border-indigo-100">
                        <div className="flex items-start space-x-4">
                            <div className="bg-indigo-600 p-2 rounded-full text-white">
                                <FaRobot size={24} />
                            </div>
                            <div>
                                <div className="flex items-center space-x-2 mb-2">
                                    <h3 className="font-bold text-indigo-900">AI Agent Executive Summary</h3>
                                </div>
                                <p className="text-indigo-800 leading-relaxed italic">
                                    "{agentInsight}"
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Audit Table */}
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b">
                            <h3 className="font-semibold text-gray-800">Deviation Audit Log</h3>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-600 text-sm">
                                <tr>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3">SKU</th>
                                    <th className="px-6 py-3">Issue Description</th>
                                    <th className="px-6 py-3">Predicted Loss</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {report.deviations.map((dev, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${dev.type === 'MISPLACED_ITEM' ? 'bg-orange-100 text-orange-700' :
                                                dev.type === 'MISSING_ITEM' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {dev.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm">{dev.sku}</td>
                                        <td className="px-6 py-4 text-gray-600">{dev.description}</td>
                                        <td className="px-6 py-4 font-bold text-gray-800">
                                            {dev.impact_prediction?.revenue_opportunity || 0} {report.currency}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComplianceDashboard;
