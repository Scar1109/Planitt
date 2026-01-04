import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { FaRobot, FaArrowRight, FaArrowDown } from 'react-icons/fa';

const SystemAnalysis = () => {
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const res = await api.get('/compliance/metadata');
                setMetadata(res.data);
            } catch (err) {
                console.error("Failed to load metadata", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMetadata();
    }, []);

    if (loading) return <div className="p-8 text-gray-500">Loading System Diagnostics...</div>;
    if (!metadata) return <div className="p-8 text-red-500">System Offline</div>;

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                System Forensics & Model Diagnostics
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Model Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Active Model</h3>
                    <div className="text-lg font-bold text-blue-600 truncate" title={metadata.ml_model?.model_type}>
                        {metadata.ml_model?.model_type || "Unknown"}
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                        Training Date: <span className="font-mono text-gray-700">{metadata.ml_model?.timestamp ? new Date(metadata.ml_model.timestamp).toLocaleDateString() : "N/A"}</span>
                    </div>
                </div>

                {/* ML Accuracy Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Model Accuracy (R2)</h3>
                    <div className="text-3xl font-bold text-emerald-600">
                        {metadata.ml_model?.metrics?.R2_Score ? (metadata.ml_model.metrics.R2_Score * 100).toFixed(1) + "%" : "N/A"}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        RMSE: {metadata.ml_model?.metrics?.RMSE ? metadata.ml_model.metrics.RMSE.toFixed(2) : "0.00"} (Error Margin)
                    </div>
                </div>

                {/* Rules Accuracy Card (NEW) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Rules Precision</h3>
                    <div className="text-3xl font-bold text-indigo-600">
                        {metadata.rules_engine?.precision_guarantee || "100%"}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        Deterministic Logic Guarantee
                    </div>
                </div>

                {/* Architecture Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Architecture</h3>
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Rules Active:</span>
                            <span className="font-mono text-gray-800">{metadata.rules_engine?.active_rules?.length || 4}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Seed:</span>
                            <span className="font-mono text-gray-800">{metadata.ml_model?.params?.seed}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feature Importance Grid */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Feature Engineering Input</h3>
                <p className="text-gray-600 text-sm mb-4">
                    The following features are extracted from the Planogram State and used by the Random Forest Regressor to predict financial impact.
                </p>
                <div className="flex flex-wrap gap-2">
                    {metadata.ml_model?.features?.map(f => (
                        <span key={f} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-100">
                            {f}
                        </span>
                    ))}
                </div>
            </div>

            {/* Academic Architecture Diagram */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center mb-8">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center justify-center gap-2">
                    Compliance Intelligence Architecture
                </h3>

                <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm">
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 w-full md:w-auto hover:border-blue-300 transition-colors">
                        <div className="font-bold text-gray-700">Raw Planogram</div>
                        <div className="text-xs text-gray-400">MongoDB</div>
                    </div>
                    <FaArrowRight className="text-gray-300 hidden md:block" />
                    <FaArrowDown className="text-gray-300 md:hidden" />

                    <div className="p-4 border-l-4 border-blue-500 rounded bg-blue-50 shadow-sm w-full md:w-auto">
                        <div className="font-bold text-blue-900">Deterministic Engine</div>
                        <div className="text-xs text-blue-600">Rule-Based Detection</div>
                    </div>
                    <FaArrowRight className="text-gray-300 hidden md:block" />
                    <FaArrowDown className="text-gray-300 md:hidden" />

                    <div className="p-4 border-l-4 border-purple-500 rounded bg-purple-50 shadow-sm w-full md:w-auto">
                        <div className="font-bold text-purple-900">Impact Estimator</div>
                        <div className="text-xs text-purple-600">Stochastic Model (RF)</div>
                    </div>
                    <FaArrowRight className="text-gray-300 hidden md:block" />
                    <FaArrowDown className="text-gray-300 md:hidden" />

                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 w-full md:w-auto hover:border-green-300 transition-colors">
                        <div className="font-bold text-gray-700">Agent Recommendation</div>
                        <div className="text-xs text-gray-400">Qualitative Synthesis</div>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default SystemAnalysis;
