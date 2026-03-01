import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaArrowUp, FaArrowDown, FaCheck, FaTimes, FaFilter, FaDownload, FaSpinner, FaBullhorn, FaEye, FaRobot, FaChartLine } from 'react-icons/fa';

const RecommendationsPage = () => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [narrative, setNarrative] = useState("");
    const [savedSimulations, setSavedSimulations] = useState([]);
    const [selectedSim, setSelectedSim] = useState(null);

    const fetchSavedSimulations = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/promotions/simulate/saved', { withCredentials: true });
            setSavedSimulations(res.data);
        } catch (err) {
            console.error("Failed to fetch saved simulations", err);
        }
    };

    useEffect(() => {
        generatePlan();
        fetchSavedSimulations();
    }, []);

    const generatePlan = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch products
            const prodRes = await axios.get('http://localhost:3000/api/products', { withCredentials: true });
            const products = prodRes.data;

            // Optional: Limit or filter to active products, e.g. top 20
            const skusToPlan = products.slice(0, 20).map(p => ({
                sku_id: p.sku || p._id,
                category: p.category || 'General',
                brand: p.brand || 'Unknown',
                base_price: p.price || 0,
                cost_price: p.costPrice || (p.price ? p.price * 0.7 : 0),
                lead_time_days: 3,
                stock_level: p.stockLevel || p.quantity || 100
            }));

            // 2. Build explicit optimization payload
            const payload = {
                skus: skusToPlan,
                constraints: {
                    max_slots: 10,
                    max_per_category: 3,
                    min_margin_pct: 0.10,
                    allow_stockout_risk: false
                },
                objective: "MAX_PROFIT"
            };

            // 3. Request Plan via Node.js
            const response = await axios.post('http://localhost:3000/api/promotions/plan', payload, {
                withCredentials: true
            });

            // Map deterministic output to table state
            const planData = response.data;
            const mappedRecs = planData.recommendations.map((rec, i) => ({
                id: `REC-${new Date().getFullYear()}-${i + 1}`,
                sku: rec.sku_id,
                name: products.find(p => p.sku === rec.sku_id || p._id === rec.sku_id)?.productName || rec.sku_id,
                current_price: products.find(p => p.sku === rec.sku_id || p._id === rec.sku_id)?.price || 0,
                recommended_discount: `${(rec.discount_depth * 100).toFixed(0)}%`,
                projected_uplift: `+${rec.uplift_forecast?.toFixed(0)} units`,
                confidence: '95%',
                status: 'Ready'
            }));

            setRecommendations(mappedRecs);
            setNarrative(planData.narrative_explanation || "");

        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to generate plan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Optimization Opportunities</h1>
                    <p className="text-slate-500 mt-1">AI-driven campaign recommendations based on live database products.</p>
                </div>
                <div className="flex gap-3 mt-4 md:mt-0">
                    <button onClick={generatePlan} disabled={loading} className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
                        {loading ? <FaSpinner className="mr-2 animate-spin" /> : <FaFilter className="mr-2" />}
                        {loading ? 'Regenerating...' : 'Regenerate'}
                    </button>
                    <button className="flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm">
                        <FaDownload className="mr-2" /> Export Report
                    </button>
                </div>
            </header>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-start mb-6">
                    <FaTimes className="mt-1 mr-3 flex-shrink-0" />
                    <div>
                        <h3 className="font-semibold">Planning Failed</h3>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            )}

            {narrative && (
                <div className="bg-gradient-to-r from-indigo-50 flex to-white rounded-xl shadow-sm border border-indigo-100 p-6 mb-6">
                    <FaBullhorn className="text-2xl text-indigo-500 mr-4 mt-1 flex-shrink-0" />
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">Strategic Narrative</h2>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{narrative}</p>
                    </div>
                </div>
            )}

            {/* AI Recommendations Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-bold text-slate-800">Macro-Level AI Recommendations</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700">Reference ID</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Product</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Current Price (LKR)</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Optimization Strategy</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Projected Impact</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">AI Confidence</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recommendations.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">{item.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{item.name}</div>
                                        <div className="text-xs text-slate-500">{item.sku}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">Rs. {item.current_price.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {item.recommended_discount}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="flex items-center text-green-600 font-medium">
                                            <FaArrowUp className="mr-1.5 w-3 h-3" />
                                            {item.projected_uplift}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-16 h-2 bg-slate-100 rounded-full mr-3 overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500 rounded-full"
                                                    style={{ width: item.confidence }}
                                                ></div>
                                            </div>
                                            <span className="text-xs text-slate-600">{item.confidence}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {item.status === 'Ready' ? (
                                            <div className="flex items-center text-green-700 bg-green-50 px-2 py-1 rounded-md w-fit text-xs font-medium">
                                                <FaCheck className="mr-1.5" /> Approved
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-amber-700 bg-amber-50 px-2 py-1 rounded-md w-fit text-xs font-medium">
                                                <FaFilter className="mr-1.5" /> Pending Review
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="text-indigo-600 hover:text-indigo-900 font-medium text-xs">View Analysis</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Saved Simulations Table */}
            {savedSimulations.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <h2 className="font-bold text-slate-800">Saved Micro-Simulations</h2>
                        <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md">{savedSimulations.length} Records</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Product</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Planned Config</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Profit Lift</th>
                                    <th className="px-6 py-4 text-right font-semibold text-slate-700">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {savedSimulations.map((sim) => (
                                    <tr key={sim._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {new Date(sim.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{sim.productName}</div>
                                            <div className="text-xs text-slate-500">{sim.skuId}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                {(sim.discount * 100).toFixed(0)}% OFF ({sim.durationDays} Days)
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-semibold ${sim.profitLift >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {sim.profitLift >= 0 ? '+' : ''} Rs. {sim.profitLift.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedSim(sim)}
                                                className="inline-flex items-center justify-center text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors"
                                            >
                                                <FaEye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {selectedSim && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in-up border border-slate-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center">
                                <FaChartLine className="mr-2 text-indigo-500" />
                                Saved Simulation Details
                            </h2>
                            <button onClick={() => setSelectedSim(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors">
                                <FaTimes className="text-xl" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">Product</p>
                                    <p className="font-semibold text-slate-800 text-lg">{selectedSim.productName}</p>
                                    <p className="text-xs text-slate-400 font-mono mt-1">{selectedSim.skuId}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">Discount Config</p>
                                    <p className="font-bold text-indigo-600 text-2xl">{(selectedSim.discount * 100).toFixed(0)}% OFF</p>
                                    <p className="text-xs text-slate-500 mt-1">Duration: {selectedSim.durationDays} Days</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Base Price</p>
                                    <p className="font-semibold text-slate-700">Rs. {selectedSim.basePrice.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Promo Price</p>
                                    <p className="font-semibold text-indigo-600">Rs. {(selectedSim.basePrice * (1 - selectedSim.discount)).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Unit Cost</p>
                                    <p className="font-semibold text-slate-700">Rs. {selectedSim.costPrice.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-50 p-5 rounded-xl border border-green-100 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-100 rounded-full -mr-8 -mt-8 opacity-50"></div>
                                    <p className="text-xs text-green-700 mb-1 font-bold uppercase tracking-wider relative z-10">Predicted Sales</p>
                                    <p className="text-3xl font-bold text-green-800 relative z-10">{(selectedSim.baseline + selectedSim.uplift).toFixed(1)}</p>
                                    <p className="text-sm text-green-600 mt-1 relative z-10">+{selectedSim.uplift.toFixed(1)} Expected Uplift</p>
                                </div>
                                <div className={`p-5 rounded-xl border relative overflow-hidden ${selectedSim.profitLift >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-8 -mt-8 opacity-50 ${selectedSim.profitLift >= 0 ? 'bg-green-100' : 'bg-red-100'}`}></div>
                                    <p className={`text-xs mb-1 font-bold uppercase tracking-wider relative z-10 ${selectedSim.profitLift >= 0 ? 'text-green-700' : 'text-red-700'}`}>True Profit Lift</p>
                                    <p className={`text-3xl font-bold relative z-10 ${selectedSim.profitLift >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                                        {selectedSim.profitLift >= 0 ? '+' : ''}Rs. {selectedSim.profitLift.toLocaleString()}
                                    </p>
                                    <p className={`text-sm mt-1 relative z-10 ${selectedSim.profitLift >= 0 ? 'text-green-600' : 'text-red-600'}`}>Net Economic Impact</p>
                                </div>
                            </div>

                            {selectedSim.aiExplanation && (
                                <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-3 flex items-center">
                                        <FaRobot className="mr-2 text-indigo-500 text-base" /> AI Strategic Review
                                    </h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">{selectedSim.aiExplanation}</p>
                                </div>
                            )}
                        </div>
                        <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setSelectedSim(null)}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecommendationsPage;
