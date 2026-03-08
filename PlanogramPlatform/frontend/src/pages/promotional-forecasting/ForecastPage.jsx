import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaChartLine, FaSpinner, FaExclamationTriangle, FaCheckCircle, FaRobot, FaMagic, FaBullhorn, FaSearchDollar, FaSave } from 'react-icons/fa';

const ForecastPage = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [products, setProducts] = useState([]);
    const [explanation, setExplanation] = useState("");
    const [isExplaining, setIsExplaining] = useState(false);
    const [isFindingOptimal, setIsFindingOptimal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [top5Optimal, setTop5Optimal] = useState(null);
    const [formData, setFormData] = useState({
        sku_id: '',
        category: '',
        brand: '',
        base_price: 0,
        cost_price: 0,
        forecast_duration: 7,
        stock_level: 0,
        test_discount: 0.10
    });

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axios.get('http://localhost:3000/api/products', { withCredentials: true });
                setProducts(response.data);
                // Pre-populate with first product if available
                if (response.data && response.data.length > 0) {
                    handleProductSelection(response.data[0]);
                }
            } catch (err) {
                console.error("Failed to fetch products:", err);
            }
        };
        fetchProducts();
    }, []);

    const handleProductSelection = (prod) => {
        setFormData(prev => ({
            ...prev,
            sku_id: prod.sku || prod._id, // fallback to id if sku undefined
            category: prod.category || 'General',
            brand: prod.brand || 'Unknown',
            base_price: prod.baseUnitPriceLKR || prod.price || 0,
            cost_price: prod.unitCostLKR || prod.costPrice || (prod.baseUnitPriceLKR ? prod.baseUnitPriceLKR * 0.7 : 0),
            stock_level: prod.currentStock || prod.quantity || 0,
            forecast_duration: 7
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'sku_id' || name === 'category' || name === 'brand' ? value : parseFloat(value)
        }));
    };

    const handleForecast = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);
        setTop5Optimal(null);

        const payload = {
            sku: {
                sku_id: formData.sku_id,
                category: formData.category,
                brand: formData.brand,
                base_price: formData.base_price,
                cost_price: formData.cost_price,
                stock_level: formData.stock_level
            },
            duration_days: formData.forecast_duration,
            test_discount: formData.test_discount
        };

        try {
            const response = await axios.post('http://localhost:3000/api/promotions/simulate', payload, {
                withCredentials: true
            });
            setResult(response.data);
            fetchExplanation(response.data, formData.test_discount);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || err.message || 'Failed to forecast');
        } finally {
            setLoading(false);
        }
    };

    const fetchExplanation = async (simData, discountSent) => {
        setIsExplaining(true);
        setExplanation("");
        try {
            const payload = {
                sku_id: formData.sku_id,
                discount: discountSent,
                duration_days: formData.forecast_duration,
                uplift: simData.uplift,
                revenue_lift: simData.revenue_lift,
                profit_lift: simData.profit_lift
            };
            const response = await axios.post('http://localhost:3000/api/promotions/simulate/explain', payload, { withCredentials: true });
            setExplanation(response.data.explanation);
        } catch (err) {
            console.error("Explanation failed:", err);
            setExplanation("Could not generate AI explanation at this time.");
        } finally {
            setIsExplaining(false);
        }
    };

    const handleFindOptimal = async () => {
        setIsFindingOptimal(true);
        setError(null);
        setResult(null);
        setExplanation("");
        setSaveSuccess(false);
        setTop5Optimal(null);

        const payload = {
            sku: {
                sku_id: formData.sku_id,
                category: formData.category,
                brand: formData.brand,
                base_price: formData.base_price,
                cost_price: formData.cost_price,
                stock_level: formData.stock_level
            },
            duration_days: formData.forecast_duration
        };

        try {
            const response = await axios.post('http://localhost:3000/api/promotions/simulate/optimal', payload, {
                withCredentials: true
            });
            setFormData(prev => ({ ...prev, test_discount: response.data.optimal_discount }));
            setResult(response.data.simulation);
            setTop5Optimal(response.data.top_5);
            fetchExplanation(response.data.simulation, response.data.optimal_discount);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || err.message || 'Failed to find optimal');
        } finally {
            setIsFindingOptimal(false);
        }
    };

    const handleSaveSimulation = async () => {
        if (!result) return;
        setIsSaving(true);
        setSaveSuccess(false);

        const payload = {
            skuId: formData.sku_id,
            productName: products.find(p => p._id === formData.sku_id || p.sku === formData.sku_id)?.productName || formData.sku_id,
            basePrice: formData.base_price,
            costPrice: formData.cost_price,
            durationDays: formData.forecast_duration,
            discount: formData.test_discount,
            baseline: result.baseline,
            uplift: result.uplift,
            revenueLift: result.revenue_lift,
            profitLift: result.profit_lift,
            aiExplanation: explanation,
            risks: result.risks
        };

        try {
            await axios.post('http://localhost:3000/api/promotions/simulate/save', payload, { withCredentials: true });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error("Save failed:", err);
            alert("Failed to save simulation.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                    <FaRobot className="mr-3 text-[#1B4F72]" />
                    Promotional Uplift Forecast
                </h1>
                <p className="text-slate-500 mt-2">
                    Use AI to predict the performance of your next promotion in the Sri Lankan market.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Simulation Parameters</h2>
                        <form onSubmit={handleForecast} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Select Product to Simulate</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#17A2B8] focus:border-[#17A2B8] text-sm mb-4"
                                    onChange={(e) => {
                                        const selected = products.find(p => p._id === e.target.value);
                                        if (selected) handleProductSelection(selected);
                                    }}
                                >
                                    {products.map(p => (
                                        <option key={p._id} value={p._id}>{p.productName} ({p.sku})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">SKU ID</label>
                                    <input type="text" name="sku_id" value={formData.sku_id} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#17A2B8] focus:border-[#17A2B8] text-sm bg-slate-50" readOnly />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                                    <input type="text" name="category" value={formData.category} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#17A2B8] focus:border-[#17A2B8] text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Brand</label>
                                    <input type="text" name="brand" value={formData.brand} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#17A2B8] focus:border-[#17A2B8] text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Base Price (LKR)</label>
                                    <input type="number" step="1" name="base_price" value={formData.base_price} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#17A2B8] focus:border-[#17A2B8] text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Cost Price (LKR)</label>
                                    <input type="number" step="1" name="cost_price" value={formData.cost_price} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#17A2B8] focus:border-[#17A2B8] text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Stock Level</label>
                                    <input type="number" name="stock_level" value={formData.stock_level} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#17A2B8] focus:border-[#17A2B8] text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Forecast Duration (Days)</label>
                                    <input type="number" name="forecast_duration" min="1" max="90" value={formData.forecast_duration} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#17A2B8] focus:border-[#17A2B8] text-sm" />
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="block text-xs font-medium text-slate-700 mb-1">Proposed Discount: {(formData.test_discount * 100).toFixed(0)}%</label>
                                <input
                                    type="range"
                                    name="test_discount"
                                    min="0.05"
                                    max="0.80"
                                    step="0.01"
                                    value={formData.test_discount}
                                    onChange={handleChange}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1B4F72]"
                                />
                                <div className="flex justify-between text-xs text-slate-400 mt-1">
                                    <span>5%</span>
                                    <span>80%</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={loading || isFindingOptimal}
                                    className="flex-1 bg-[#1B4F72] hover:bg-[#164060] text-white font-medium py-2.5 rounded-lg transition-all shadow-md shadow-[#17A2B8]/30 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                                >
                                    {loading ? <FaSpinner className="animate-spin mr-2" /> : <FaMagic className="mr-2" />}
                                    Predict
                                </button>
                                <button
                                    type="button"
                                    onClick={handleFindOptimal}
                                    disabled={loading || isFindingOptimal}
                                    className="flex-1 bg-[#17A2B8] hover:bg-[#17A2B8]/10 text-white font-medium py-2.5 rounded-lg transition-all shadow-md shadow-[#17A2B8]/20 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                                >
                                    {isFindingOptimal ? <FaSpinner className="animate-spin mr-2" /> : <FaSearchDollar className="mr-2" />}
                                    Find Optimal
                                </button>
                            </div>
                            <p className="text-center text-xs text-slate-400 mt-2">
                                Forecast Duration: {formData.forecast_duration} Days
                            </p>
                        </form>
                    </div>
                </div>

                {/* Results Section */}
                <div className="lg:col-span-2 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-start">
                            <FaExclamationTriangle className="mt-1 mr-3 flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold">Simulation Failed</h3>
                                <p className="text-sm">{error}</p>
                            </div>
                        </div>
                    )}

                    {!result && !loading && !error && (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 bg-white/50 border-2 border-dashed border-slate-200 rounded-xl">
                            <FaChartLine className="w-16 h-16 mb-4 text-slate-200" />
                            <p className="text-lg font-medium">Ready to Simulate</p>
                            <p className="text-sm">Enter SKU details and discount to see AI predictions.</p>
                        </div>
                    )}

                    {result && (
                        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden animate-fade-in-up">
                            <div className="bg-[#1B4F72] p-6 text-white">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold flex items-center">
                                            <FaCheckCircle className="mr-2 text-green-300" />
                                            Forecast Ready
                                        </h2>
                                        <p className="opacity-90 mt-1">
                                            Analysis for {result.sku_id} with {(formData.test_discount * 100).toFixed(0)}% Discount
                                        </p>
                                    </div>
                                    <div className={`bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-center border ${result.profit_lift >= 0 ? 'border-green-400/30' : 'border-red-400/30'}`}>
                                        <span className="text-xs uppercase tracking-wider opacity-75 block mb-1">Profit Lift</span>
                                        <span className={`text-xl font-bold ${result.profit_lift >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                            {result.profit_lift >= 0 ? '+' : ''}Rs. {result.profit_lift?.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-3 gap-6 mb-8">
                                    <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="text-sm text-slate-500 mb-1">Baseline Sales</div>
                                        <div className="text-2xl font-bold text-slate-700">{result.baseline?.toFixed(1)} <span className="text-sm font-normal text-slate-400">units</span></div>
                                    </div>
                                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                                        <div className="text-sm text-green-600 mb-1">Predicted Uplift</div>
                                        <div className="text-2xl font-bold text-green-700">+{result.uplift?.toFixed(1)} <span className="text-sm font-normal text-green-500">units</span></div>
                                    </div>
                                    <div className="text-center p-4 bg-[#17A2B8]/5 rounded-lg border border-[#17A2B8]/10">
                                        <div className="text-sm text-[#1B4F72] mb-1">Revenue Lift</div>
                                        <div className="text-2xl font-bold text-[#164060]">{result.revenue_lift >= 0 ? '+' : ''} Rs. {result.revenue_lift?.toLocaleString()}</div>
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div className="mb-6 flex justify-end">
                                    <button
                                        onClick={handleSaveSimulation}
                                        disabled={isSaving || isExplaining || saveSuccess}
                                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saveSuccess ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                                    >
                                        {isSaving ? <FaSpinner className="animate-spin mr-2" /> : saveSuccess ? <FaCheckCircle className="mr-2" /> : <FaSave className="mr-2 text-[#1B4F72]" />}
                                        {saveSuccess ? 'Saved to Suggested' : 'Save to Suggested'}
                                    </button>
                                </div>

                                {/* AI Explanation */}
                                <div className="bg-gradient-to-r from-[#17A2B8]/5 to-white border border-[#17A2B8]/10 rounded-xl p-5 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center mb-2">
                                        <FaBullhorn className="text-[#17A2B8] mr-2" />
                                        AI Strategic Explanation
                                    </h3>
                                    {isExplaining ? (
                                        <div className="flex items-center text-slate-500 text-sm py-2">
                                            <FaSpinner className="animate-spin mr-2" />
                                            Generating narrative...
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-700 leading-relaxed">
                                            {explanation}
                                        </p>
                                    )}
                                </div>

                                {/* Top 5 Optimal Rankings (Only shown on "Find Optimal") */}
                                {top5Optimal && (
                                    <div className="mt-6 border border-emerald-200 bg-emerald-50/30 rounded-xl p-5 shadow-sm">
                                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center">
                                            <FaSearchDollar className="text-emerald-600 mr-2" />
                                            Top 5 Profit-Maximizing Discounts
                                        </h3>
                                        <div className="space-y-3">
                                            {top5Optimal.map((opt, idx) => (
                                                <div key={idx} className="bg-white border text-sm border-slate-200 p-3 rounded-lg flex items-center justify-between shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:border-emerald-300 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${idx === 0 ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200' :
                                                            idx < 3 ? 'bg-blue-50 text-blue-600' :
                                                                'bg-slate-100 text-slate-500'
                                                            }`}>
                                                            #{idx + 1}
                                                        </span>
                                                        <span className="font-semibold text-slate-800">{(opt.discount * 100).toFixed(0)}% Off</span>
                                                    </div>
                                                    <div className="text-right flex items-center gap-4">
                                                        <div>
                                                            <div className={`font-bold ${opt.profit_lift >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                                {opt.profit_lift >= 0 ? '+' : ''}Rs. {opt.profit_lift?.toLocaleString()}
                                                            </div>
                                                            <div className="text-xs text-slate-400 font-normal">Profit Lift</div>
                                                        </div>
                                                        <div className="text-right hidden sm:block">
                                                            <div className="font-bold text-[#1B4F72]">Rs. {opt.simulation.revenue_lift?.toLocaleString()}</div>
                                                            <div className="text-xs text-slate-400 font-normal">Rev. Lift</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {result.risks && result.risks.length > 0 && (
                                    <div className="mt-6">
                                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center">
                                            <FaExclamationTriangle className="text-[#17A2B8] mr-2" />
                                            Risk Assessment
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="bg-[#17A2B8]/10 text-[#1B4F72] p-3 rounded-md text-sm border-l-4 border-[#17A2B8]/20">
                                                {JSON.stringify(result.risks)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default ForecastPage;
