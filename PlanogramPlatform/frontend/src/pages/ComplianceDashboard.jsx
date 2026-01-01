import React, { useState } from 'react';
import axios from 'axios';
import { FaCheckCircle, FaExclamationTriangle, FaChartLine, FaRobot } from 'react-icons/fa';

const ComplianceDashboard = () => {
    // Mock Data for "Current" and "Optimized" Planograms (In real app, fetch from DB)
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [report, setReport] = useState(null);
    const [agentInsight, setAgentInsight] = useState('');

    const runCheck = async () => {
        setStatus('loading');
        try {
            // Simulated Payload
            const payload = {
                current_planogram: {
                    placements: [
                        { sku: "LOC-COCO-500ML", fixtureId: "G1", levelIndex: 1, facings: 1 },
                        { sku: "LOC-SOAP-BAR", fixtureId: "G1", levelIndex: 1, facings: 2 }
                    ]
                },
                optimized_planogram: {
                    placements: [
                        { sku: "LOC-COCO-500ML", fixtureId: "G1", levelIndex: 4, facings: 2 }, // Higher shelf!
                        { sku: "LOC-SOAP-BAR", fixtureId: "G1", levelIndex: 1, facings: 2 }
                    ]
                }
            };

            const response = await axios.post('http://localhost:3000/api/compliance/check', payload, { withCredentials: true });

            setReport(response.data);
            setAgentInsight(response.data.agent_summary);
            setStatus('success');
        } catch (error) {
            console.error("Compliance Check Failed:", error);
            setStatus('error');
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Compliance Intelligence Layer</h1>
                <p className="text-gray-500">Academic Validation & Economic Impact Analysis</p>
            </header>

            {/* Control Panel */}
            <div className="bg-white p-6 rounded-lg shadow-sm mb-6 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-lg">Active Session</h3>
                    <p className="text-sm text-gray-500">Comparing: <span className="font-mono bg-gray-100 px-2 rounded">Current-Floor-Scan-001</span> vs <span className="font-mono bg-gray-100 px-2 rounded">Opt-Model-v4</span></p>
                </div>
                <button
                    onClick={runCheck}
                    disabled={status === 'loading'}
                    className={`px-6 py-3 rounded-lg font-bold text-white transition ${status === 'loading' ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {status === 'loading' ? 'Analyzing...' : 'Run Compliance Check'}
                </button>
            </div>

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
                                <h3 className="font-bold text-indigo-900 mb-2">AI Agent Executive Summary</h3>
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
