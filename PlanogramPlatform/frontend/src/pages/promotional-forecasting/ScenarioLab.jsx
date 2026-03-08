import React, { useState, useEffect } from 'react';
import { FaFlask, FaMapMarkerAlt, FaChartLine, FaRobot, FaExclamationTriangle, FaCheckCircle, FaExchangeAlt } from 'react-icons/fa';
import classNames from 'classnames';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const PlanogramShelf = ({ facings, colorClass = "bg-[#17A2B8]" }) => (
    <div className="mt-3">
        <div className="flex justify-between items-end mb-1">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Visual Shelf</p>
            <p className="text-xs font-medium text-slate-500">{facings} Facing{facings !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-slate-200 h-2 w-full rounded-full relative mt-8">
            <div className="absolute bottom-2 left-0 flex items-end gap-[2px] px-2 overflow-hidden w-full">
                {Array.from({ length: Math.min(facings, 15) }).map((_, i) => (
                    <div key={i} className={`w-4 h-6 rounded-sm shadow-sm border border-black/10 ${colorClass}`} />
                ))}
                {facings > 15 && <span className="text-xs text-slate-500 mb-1 ml-1 font-medium">+{facings - 15}</span>}
                {facings === 0 && <span className="text-xs text-slate-400 mb-1 italic">Empty Shelf</span>}
            </div>
        </div>
    </div>
);

const FullPlanogramShelf = ({ items = [], products = [] }) => {
    // Generate a list of uniform boxes, colored by brand/category based on product logic
    // We'll just generate simple pastel colors from string hashes or fixed array
    const colors = [
        "bg-[#E0F7FA] text-[#006064] border-[#B2EBF2]", // Light Cyan
        "bg-[#F1F8E9] text-[#33691E] border-[#DCEDC8]", // Light Light Green
        "bg-[#FCE4EC] text-[#880E4F] border-[#F8BBD0]", // Light Pink
        "bg-[#FFF8E1] text-[#FF6F00] border-[#FFECB3]", // Light Amber
        "bg-[#E8EAF6] text-[#1A237E] border-[#C5CAE9]", // Light Indigo
        "bg-[#F3E5F5] text-[#4A148C] border-[#E1BEE7]", // Light Purple
        "bg-[#E3F2FD] text-[#0D47A1] border-[#BBDEFB]", // Light Blue
        "bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]"  // Light Orange
    ];

    // Flatten items into individual boxed rendered
    const shelfBoxes = [];
    items.forEach((item, index) => {
        const itemSku = item.sku || item.product_id || 'UNK';
        const prod = products.find(p =>
            (item.product_id && p._id === item.product_id) ||
            (p.sku && item.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) ||
            (p.sku === itemSku || p._id === itemSku)
        );
        const color = colors[index % colors.length];
        const name = prod?.productName || itemSku;

        for (let i = 0; i < item.facings; i++) {
            shelfBoxes.push({ color, name, sku: itemSku });
        }
    });

    // Cap display length so UI doesn't blow up
    const displayBoxes = shelfBoxes.slice(0, 30);
    const hiddenCount = shelfBoxes.length - 30;

    if (items.length === 0) return null;

    return (
        <div className="mt-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-end mb-2">
                <p className="text-sm font-semibold text-slate-700">Loaded Planogram Sequence</p>
                <p className="text-xs font-medium text-slate-500">{shelfBoxes.length} Total Facings</p>
            </div>

            <div className="flex flex-wrap gap-2 text-[10px] mb-4">
                {items.map((item, index) => {
                    const itemSku = item.sku || item.product_id || 'UNK';
                    const prod = products.find(p =>
                        (item.product_id && p._id === item.product_id) ||
                        (p.sku && item.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) ||
                        (p.sku === itemSku || p._id === itemSku)
                    );
                    const name = prod?.productName || itemSku;
                    return (
                        <div key={index + '-' + itemSku} className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            <div className={`w-3 h-3 rounded-full border ${colors[index % colors.length]}`}></div>
                            <span className="truncate max-w-[120px]" title={name}>{name} (x{item.facings})</span>
                        </div>
                    );
                })}
            </div>

            <div className="bg-slate-300 h-3 w-full rounded-full relative mt-12 bg-opacity-70">
                <div className="absolute bottom-2 left-0 flex items-end px-3 overflow-hidden w-full h-10 gap-[2px]">
                    {displayBoxes.map((box, i) => (
                        <div
                            key={i}
                            className={`flex-1 h-8 rounded-sm shadow-sm border border-black/5 ${box.color} flex-shrink-1 relative group overflow-hidden`}
                            title={box.name}
                        >
                            <div className="absolute font-semibold text-[8px] transform -rotate-90 origin-left top-1 left-2 opacity-70 whitespace-nowrap overflow-hidden line-clamp-1 w-full text-inherit">
                                {(box.sku ? String(box.sku) : 'UNK').substring(0, 5)}
                            </div>
                        </div>
                    ))}
                    {hiddenCount > 0 && <span className="text-xs font-bold text-slate-600 mb-1 ml-2 self-center flex-shrink-0">+{hiddenCount}</span>}
                </div>
            </div>
        </div>
    );
};

const ScenarioLab = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('compare');
    const [storeLocation, setStoreLocation] = useState('Colombo');
    const [loading, setLoading] = useState(false);


    // Planogram Compare State
    const [compareSim, setCompareSim] = useState({
        skuId: '',
        currDiscount: 0,
        currFacings: 4,
        propDiscount: 15,
        propFacings: 6,
        duration: 14,
        loadedPlanogramItems: [], // Store the full array for visualization
        selectedLevel: 'All' // The chosen shelf level
    });
    const [compareResult, setCompareResult] = useState(null);

    // Trend State
    const [trendDays, setTrendDays] = useState(30);
    const [trendSkuId, setTrendSkuId] = useState('');
    const [trendResult, setTrendResult] = useState(null);

    // Products and Planograms
    const [products, setProducts] = useState([]);
    const [planograms, setPlanograms] = useState([]);
    const [fixtures, setFixtures] = useState([]);

    useEffect(() => {
        // Attempt to extract location from the user's bound store profile
        if (user && user.store && user.store.location && user.store.location.city) {
            setStoreLocation(user.store.location.city);
        }
    }, [user]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch Products
                const prodResponse = await axios.get('http://localhost:3000/api/products', { withCredentials: true });
                setProducts(prodResponse.data);

                // Pre-populate
                if (prodResponse.data && prodResponse.data.length > 0) {
                    const firstProd = prodResponse.data[0];
                    const sku = firstProd.sku || firstProd._id;
                    setCompareSim(prev => ({ ...prev, skuId: sku }));
                    setTrendSkuId(sku);
                }

                // Fetch Planograms
                const planRes = await axios.get('http://localhost:3000/api/planograms/optimization/runs', { withCredentials: true });
                if (planRes.data && Array.isArray(planRes.data)) {
                    setPlanograms(planRes.data);
                }

                // Fetch Shelves
                const shelfRes = await axios.get('http://localhost:3000/api/planograms/shelves', { withCredentials: true });
                if (shelfRes.data && Array.isArray(shelfRes.data)) {
                    setFixtures(shelfRes.data);
                }
            } catch (err) {
                console.error("Failed to fetch initial scenario data:", err);
            }
        };
        fetchInitialData();
    }, []);

    const handleLoadPlanogram = (runId) => {
        const run = planograms.find(r => r._id === runId);
        if (!run || !run.resultingPlacements) {
            setCompareSim(prev => ({ ...prev, loadedPlanogramItems: [], selectedLevel: 'All' }));
            return;
        }

        // Set the valid items from the DB
        const items = Array.isArray(run.resultingPlacements) ? run.resultingPlacements : [];

        // Find the specific item relating to the currently selected product in compare tab (if applicable)
        const itemLayout = items.find(item => (item.sku || item.product_id) === compareSim.skuId);

        let newFacings = compareSim.currFacings;
        let newSkuId = compareSim.skuId;

        if (itemLayout && itemLayout.facings) {
            newFacings = itemLayout.facings;
        } else if (items.length > 0) {
            // Default select the first item on the planogram to prevent orphaned target products
            newSkuId = items[0].sku || items[0].product_id;
            newFacings = items[0].facings;
        }

        setCompareSim(prev => ({
            ...prev,
            skuId: newSkuId,
            currFacings: newFacings,
            loadedPlanogramItems: items,
            selectedLevel: 'All' // Reset to all shelves when a new planogram loads
        }));
    };

    const getFullProductDetails = (skuId) => {
        const prod = products.find(p => p.sku === skuId || p._id === skuId);
        if (prod) {
            return {
                sku_id: skuId,
                category: prod.category || 'General',
                brand: prod.brand || 'Unknown',
                base_price: prod.baseUnitPriceLKR || prod.price || 1000,
                cost_price: prod.unitCostLKR || prod.costPrice || (prod.baseUnitPriceLKR ? prod.baseUnitPriceLKR * 0.7 : 600),
                stock_level: prod.currentStock || prod.quantity || 100
            };
        }
        return { sku_id: skuId, category: "Test", brand: "Test", base_price: 1000, cost_price: 600, stock_level: 100 };
    };


    const handleCompare = async () => {
        setLoading(true);
        try {
            const payload = {
                sku: getFullProductDetails(compareSim.skuId),
                current_discount: compareSim.currDiscount / 100,
                current_facings: compareSim.currFacings,
                proposed_discount: compareSim.propDiscount / 100,
                proposed_facings: compareSim.propFacings,
                duration_days: compareSim.duration,
                location: storeLocation
            };
            const response = await axios.post('http://localhost:3000/api/scenario/planogram-promo', payload, { withCredentials: true });
            setCompareResult(response.data);
        } catch (error) {
            console.error("Error running compare:", error);
            alert("Comparison failed: " + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleFetchTrend = async () => {
        setLoading(true);
        try {
            const payload = {
                sku: getFullProductDetails(trendSkuId),
                days: trendDays,
                location: storeLocation
            };
            const response = await axios.post('http://localhost:3000/api/scenario/future-trend', payload, { withCredentials: true });
            setTrendResult(response.data);
        } catch (error) {
            console.error("Error fetching trend:", error);
            alert("Trend fetch failed: " + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FaFlask className="text-[#1B4F72]" />
                        Scenario Lab
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Experiment with what-if scenarios, planogram setups, and future trend planning.</p>
                </div>
                <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 flex items-center shadow-sm">
                    <FaMapMarkerAlt className="text-slate-400 mr-2" />
                    <span className="text-sm text-slate-600 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px]" title={storeLocation || 'Global Context'}>
                        Context: {storeLocation || 'Global Context'}
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex w-full overflow-x-auto">
                <button
                    onClick={() => setActiveTab('compare')}
                    className={classNames('flex-1 py-2.5 px-4 text-sm font-medium rounded-lg flex items-center justify-center transition-all whitespace-nowrap', {
                        'bg-[#17A2B8]/5 text-[#164060] shadow-sm': activeTab === 'compare',
                        'text-slate-500 hover:text-slate-700 hover:bg-slate-50': activeTab !== 'compare'
                    })}
                >
                    <FaExchangeAlt className="mr-2" /> Planogram + Promo
                </button>
                <button
                    onClick={() => setActiveTab('trend')}
                    className={classNames('flex-1 py-2.5 px-4 text-sm font-medium rounded-lg flex items-center justify-center transition-all whitespace-nowrap', {
                        'bg-[#17A2B8]/5 text-[#164060] shadow-sm': activeTab === 'trend',
                        'text-slate-500 hover:text-slate-700 hover:bg-slate-50': activeTab !== 'trend'
                    })}
                >
                    <FaChartLine className="mr-2" /> Future Trend View
                </button>
            </div>

            {/* Tab Contents */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px]">

                {/* 2. Compare */}
                {activeTab === 'compare' && (
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Setup Form */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 lg:col-span-1 space-y-4">
                            <h3 className="text-lg font-semibold text-slate-800 mb-1">Configure Setups</h3>

                            <div className="mb-4 space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">1. Select Store Planogram (Starting Point)</label>
                                    <select
                                        className="w-full p-1.5 border border-slate-300 rounded text-sm focus:ring-[#17A2B8] bg-white"
                                        onChange={e => handleLoadPlanogram(e.target.value)}
                                        defaultValue=""
                                        title="Choose a previously saved store layout to serve as your baseline."
                                    >
                                        <option value="" disabled>Select a Planogram Configuration...</option>
                                        {planograms.map(plan => (
                                            <option key={plan._id} value={plan._id}>
                                                Run: {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : 'Unknown Date'} - Score: {(plan.bestScore || 0).toFixed(2)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {compareSim.loadedPlanogramItems.length > 0 && (() => {
                                    const availableLevels = [...new Set(compareSim.loadedPlanogramItems.map(item => item.level_id || 'Level 1'))].sort();
                                    return (
                                        <div className="border-t border-slate-200 pt-3">
                                            <label className="block text-xs font-medium text-slate-700 mb-1">2. Pick a Shelf Level to Modify</label>
                                            <select
                                                className="w-full p-1.5 border border-slate-300 rounded text-sm focus:ring-[#17A2B8] bg-white"
                                                value={compareSim.selectedLevel}
                                                title="Filter the products by a specific shelf row, or view the whole layout combined."
                                                onChange={e => {
                                                    const lvl = e.target.value;
                                                    const filteredItems = lvl === 'All' ? compareSim.loadedPlanogramItems : compareSim.loadedPlanogramItems.filter(i => (i.level_id || 'Level 1').toString() === lvl);

                                                    let newSkuId = compareSim.skuId;
                                                    let newFacings = compareSim.currFacings;

                                                    // If current SKU is no longer on this shelf, select the first one that is
                                                    if (filteredItems.length > 0 && !filteredItems.find(i => (i.sku || i.product_id) === newSkuId)) {
                                                        newSkuId = filteredItems[0].sku || filteredItems[0].product_id;
                                                        newFacings = filteredItems[0].facings;
                                                    }

                                                    setCompareSim({ ...compareSim, selectedLevel: lvl, skuId: newSkuId, currFacings: newFacings });
                                                }}
                                            >
                                                <option value="All">All Shelves Combined</option>
                                                {availableLevels.map(lvl => {
                                                    const allLevelsList = (fixtures || []).flatMap(f => (f.levels || []).map(l => ({ ...l, fixtureName: f.aisleBaySide || 'Fixture' })));
                                                    const mappedLvl = allLevelsList.find(l => l._id === lvl);
                                                    const label = mappedLvl ? `${mappedLvl.fixtureName} - Level ${(mappedLvl.levelIndex || 0) + 1}` : `Shelf ID: ${String(lvl).substring(0, 8)}...`;
                                                    return (
                                                        <option key={lvl} value={lvl}>{label}</option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    );
                                })()}

                                <div className="border-t border-slate-200 pt-3 bg-[#17A2B8]/5 p-2 rounded border-l-4 border-l-[#17A2B8]">
                                    <label className="block text-xs font-bold text-[#0F3249] mb-1">3. Choose a Product to Test</label>
                                    <select
                                        className="w-full p-1.5 border border-[#17A2B8]/30 rounded text-sm focus:ring-[#17A2B8] bg-white shadow-sm"
                                        value={compareSim.skuId}
                                        title="Select the specific item you want to simulate a promotion or layout change for."
                                        onChange={e => {
                                            const newSku = e.target.value;
                                            const itemLayout = compareSim.loadedPlanogramItems.find(i => (i.sku || i.product_id) === newSku);
                                            setCompareSim({
                                                ...compareSim,
                                                skuId: newSku,
                                                currFacings: itemLayout ? itemLayout.facings : compareSim.currFacings
                                            });
                                        }}
                                    >
                                        {(() => {
                                            const displayedItems = compareSim.selectedLevel === 'All'
                                                ? compareSim.loadedPlanogramItems
                                                : compareSim.loadedPlanogramItems.filter(item => (item.level_id || 'Level 1').toString() === compareSim.selectedLevel.toString());

                                            let optionsToMap = products;
                                            if (compareSim.loadedPlanogramItems.length > 0) {
                                                // Unique SKUs bound to the selected display level
                                                const uniqueSkusOnLevel = [...new Set(displayedItems.map(i => i.sku || i.product_id))];
                                                optionsToMap = uniqueSkusOnLevel.map(sku => products.find(p => (p.sku && sku && p.sku.toLowerCase() === sku.toLowerCase()) || p._id === sku)).filter(Boolean);
                                            }

                                            if (optionsToMap.length === 0) {
                                                return <option value="" disabled>No products on this level</option>;
                                            }

                                            return optionsToMap.map(prod => (
                                                <option key={prod._id} value={prod.sku || prod._id}>{prod.productName || prod.sku}</option>
                                            ));
                                        })()}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-white p-3 rounded shadow-sm border border-slate-100">
                                <p className="font-medium text-sm text-slate-700 mb-2">Current Store Setup (Baseline)</p>
                                <div className="grid grid-cols-2 gap-3 mb-2">
                                    <div>
                                        <label className="block text-xs text-slate-500">Facings</label>
                                        <input type="number" className="w-full p-1.5 border border-slate-300 rounded text-sm" value={compareSim.currFacings} onChange={e => setCompareSim({ ...compareSim, currFacings: Number(e.target.value) })} title="Number of product boxes visible on the front of the requested shelf." />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500">Discount (%)</label>
                                        <input type="number" className="w-full p-1.5 border border-slate-300 rounded text-sm" value={compareSim.currDiscount} onChange={e => setCompareSim({ ...compareSim, currDiscount: Number(e.target.value) })} title="Current price reduction percentage (leave at 0 if regular price)." />
                                    </div>
                                </div>
                                <PlanogramShelf facings={compareSim.currFacings} colorClass="bg-slate-400" />
                            </div>

                            <div className="bg-[#17A2B8]/5 p-3 rounded shadow-sm border border-[#17A2B8]/10">
                                <p className="font-medium text-sm text-[#164060] mb-2">Proposed Promotion / Layout (What-If)</p>
                                <div className="grid grid-cols-2 gap-3 mb-2">
                                    <div>
                                        <label className="block text-xs text-[#1B4F72]">Facings</label>
                                        <input type="number" className="w-full p-1.5 border border-[#17A2B8]/30 rounded text-sm bg-white" value={compareSim.propFacings} onChange={e => setCompareSim({ ...compareSim, propFacings: Number(e.target.value) })} title="Change this to see the impact of adding or removing shelf space for this product." />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[#1B4F72]">Discount (%)</label>
                                        <input type="number" className="w-full p-1.5 border border-[#17A2B8]/30 rounded text-sm bg-white" value={compareSim.propDiscount} onChange={e => setCompareSim({ ...compareSim, propDiscount: Number(e.target.value) })} title="Change this to see the impact of running a sale on this product." />
                                    </div>
                                </div>
                                <PlanogramShelf facings={compareSim.propFacings} colorClass="bg-[#17A2B8]" />
                            </div>

                            <button
                                onClick={handleCompare}
                                disabled={loading}
                                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 rounded-lg transition-colors"
                            >
                                {loading ? 'Evaluating...' : 'Evaluate Setups'}
                            </button>
                        </div>

                        {/* Compare Results Header / Visual Plane */}
                        <div className="lg:col-span-2 flex flex-col gap-6">

                            {/* Render Full Planogram Shelf Filtered By Selected Level */}
                            {compareSim.loadedPlanogramItems && compareSim.loadedPlanogramItems.length > 0 && (
                                <FullPlanogramShelf
                                    items={compareSim.selectedLevel === 'All'
                                        ? compareSim.loadedPlanogramItems
                                        : compareSim.loadedPlanogramItems.filter(item => (item.level_id || 'Level 1').toString() === compareSim.selectedLevel.toString())
                                    }
                                    products={products}
                                />
                            )}

                            {!compareResult ? (
                                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                    <FaExchangeAlt className="text-3xl mb-2 opacity-50" />
                                    <p>Evaluate two setups to see a side-by-side breakdown</p>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-fadeIn">
                                    {/* Verdict Bandeau */}
                                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3">
                                        <FaCheckCircle className="text-emerald-500 text-xl mt-0.5" />
                                        <div>
                                            <h3 className="font-bold text-emerald-900">Recommended: {compareResult.verdict?.recommended_setup || 'Unknown'}</h3>
                                            <p className="text-sm text-emerald-800">{compareResult.verdict?.justification || ''}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        {/* Current Card */}
                                        <div className={`p-5 rounded-xl border ${compareResult.verdict?.recommended_setup === 'Current Setup' ? 'border-[#17A2B8] shadow-md bg-[#17A2B8]/5/10' : 'border-slate-200 bg-white'}`}>
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-semibold text-slate-700">Current Setup</h4>
                                                {compareResult.verdict?.recommended_setup === 'Current Setup' && <span className="text-xs bg-[#17A2B8]/10 text-[#164060] px-2 py-1 rounded-full font-bold uppercase tracking-wider">Winner</span>}
                                            </div>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs text-slate-500">Projected Units</p>
                                                    <p className="text-lg font-medium text-slate-800">{(compareResult.current?.units || 0).toFixed(1)} units</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500">Net Formatted Revenue</p>
                                                    <p className="text-lg font-medium text-slate-800">LKR {(compareResult.current?.revenue || 0).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Proposed Card */}
                                        <div className={`p-5 rounded-xl border ${compareResult.verdict?.recommended_setup === 'Proposed Setup' ? 'border-[#17A2B8] shadow-md bg-[#17A2B8]/5/10' : 'border-slate-200 bg-white'}`}>
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-semibold text-slate-700">Proposed Setup</h4>
                                                {compareResult.verdict?.recommended_setup === 'Proposed Setup' && <span className="text-xs bg-[#17A2B8]/10 text-[#164060] px-2 py-1 rounded-full font-bold uppercase tracking-wider">Winner</span>}
                                            </div>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs text-slate-500">Projected Units</p>
                                                    <p className="text-lg font-medium text-slate-800">{(compareResult.proposed?.units || 0).toFixed(1)} units</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500">Net Formatted Revenue</p>
                                                    <p className="text-lg font-medium text-slate-800">LKR {(compareResult.proposed?.revenue || 0).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Delta Card */}
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                        <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                                            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Revenue Delta</p>
                                            <p className={`text-lg font-bold ${(compareResult.delta?.revenue || 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {(compareResult.delta?.revenue || 0) > 0 ? '+' : ''}LKR {(compareResult.delta?.revenue || 0).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                                            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Profit Delta</p>
                                            <p className={`text-lg font-bold ${(compareResult.delta?.profit || 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {(compareResult.delta?.profit || 0) > 0 ? '+' : ''}LKR {(compareResult.delta?.profit || 0).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. Future Trend View */}
                {activeTab === 'trend' && (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-slate-800">Demand Horizon Map</h3>

                            <div className="flex gap-4">
                                <div className="flex items-center gap-2" title="Select the product you want to forecast future demand for.">
                                    <label className="text-sm font-medium text-slate-700">Product:</label>
                                    <select
                                        className="p-1.5 border border-slate-300 rounded text-sm focus:ring-[#17A2B8] bg-white shadow-sm"
                                        value={trendSkuId}
                                        onChange={e => setTrendSkuId(e.target.value)}
                                    >
                                        {products.length > 0 ? products.map(p => (
                                            <option key={p._id} value={p.sku || p._id}>{p.productName}</option>
                                        )) : <option value={trendSkuId}>Default Product</option>}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2" title="Select how many days into the future you want to predict.">
                                    <label className="text-sm font-medium text-slate-700">Horizon:</label>
                                    <select
                                        className="p-1.5 border border-slate-300 rounded text-sm shadow-sm"
                                        value={trendDays}
                                        onChange={e => setTrendDays(Number(e.target.value))}
                                    >
                                        <option value={14}>14 Days</option>
                                        <option value={30}>30 Days</option>
                                        <option value={90}>90 Days</option>
                                        <option value={180}>6 Months</option>
                                        <option value={365}>1 Year</option>
                                    </select>
                                </div>
                                <button
                                    onClick={handleFetchTrend}
                                    disabled={loading}
                                    className="bg-[#1B4F72] hover:bg-[#164060] text-white px-4 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-colors"
                                >
                                    {loading ? 'Fetching...' : 'Fetch Maps'}
                                </button>
                            </div>
                        </div>

                        {trendResult ? (
                            <div className="space-y-6 animate-fadeIn">
                                {/* The AI Event Narrative Box */}
                                <div className={`p-4 rounded-lg border flex gap-3 ${trendResult.events.length > 0 ? 'bg-[#17A2B8]/10 border-[#17A2B8]/20 text-[#1B4F72]' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                    {trendResult.events.length > 0 ? <FaExclamationTriangle className="text-[#17A2B8] mt-1 flex-shrink-0" /> : <FaRobot className="text-slate-400 mt-1 flex-shrink-0" />}
                                    <div>
                                        <h4 className="font-semibold text-sm mb-1">{trendResult.readiness_status}</h4>
                                        <p className="text-sm">{trendResult.event_narrative}</p>
                                    </div>
                                </div>

                                {/* Graph Rendering */}
                                {(() => {
                                    let chartData = trendResult.trend;
                                    // Aggregate to weekly data points for long horizons to remove visual clutter and daily noise
                                    if (trendDays >= 180 && chartData.length > 0) {
                                        const weeklyData = [];
                                        let sum = 0;
                                        let count = 0;
                                        let weekStart = chartData[0].date;
                                        for (let i = 0; i < chartData.length; i++) {
                                            sum += chartData[i].predicted_demand;
                                            count++;
                                            if (count === 7 || i === chartData.length - 1) {
                                                weeklyData.push({
                                                    date: weekStart,
                                                    predicted_demand: Number((sum / count).toFixed(2))
                                                });
                                                sum = 0;
                                                count = 0;
                                                if (i + 1 < chartData.length) {
                                                    weekStart = chartData[i + 1].date;
                                                }
                                            }
                                        }
                                        chartData = weeklyData;
                                    }

                                    return (
                                        <div className="h-72 w-full mt-4 bg-slate-50 p-2 rounded border border-slate-200">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                                    <XAxis
                                                        dataKey="date"
                                                        tickFormatter={(str) => {
                                                            const date = new Date(str);
                                                            return `${date.getMonth() + 1}/${date.getDate()}`;
                                                        }}
                                                        stroke="#94A3B8"
                                                        fontSize={12}
                                                    />
                                                    <YAxis stroke="#94A3B8" fontSize={12} domain={['auto', 'auto']} />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }}
                                                        labelFormatter={(val) => new Date(val).toLocaleDateString()}
                                                    />
                                                    <Line type="monotone" dataKey="predicted_demand" stroke="#4F46E5" strokeWidth={3} dot={false} activeDot={{ r: 8 }} />

                                                    {/* Render Event Markers (Staggered to prevent overlap + bound to chart points) */}
                                                    {(() => {
                                                        // When data is aggregated to weeks, exact daily dates for events might disappear from the X-axis.
                                                        // We snap each event to the closest date that actually exists in chartData so it renders.
                                                        const validChartDates = chartData.map(d => new Date(d.date).getTime());

                                                        return trendResult.events.map((evt, i) => {
                                                            const evtTime = new Date(evt.date).getTime();
                                                            let closestDateStr = evt.date;

                                                            if (validChartDates.length > 0) {
                                                                const closestTime = validChartDates.reduce((prev, curr) =>
                                                                    Math.abs(curr - evtTime) < Math.abs(prev - evtTime) ? curr : prev
                                                                );
                                                                const match = chartData.find(d => new Date(d.date).getTime() === closestTime);
                                                                if (match) closestDateStr = match.date;
                                                            }

                                                            const shortName = evt.name.length > 22 ? evt.name.substring(0, 20) + '..' : evt.name;
                                                            return (
                                                                <ReferenceLine
                                                                    key={i}
                                                                    x={closestDateStr}
                                                                    stroke="#F59E0B"
                                                                    strokeDasharray="3 3"
                                                                    label={({ viewBox }) => {
                                                                        if (!viewBox) return null;
                                                                        // Stagger vertically by 15px increments (4 levels) to prevent text bounding box collisions
                                                                        const yPos = viewBox.y + 12 + (i % 4) * 15;
                                                                        return (
                                                                            <text
                                                                                x={viewBox.x + 4}
                                                                                y={yPos}
                                                                                fill="#D97706"
                                                                                fontSize={10}
                                                                                fontWeight="600"
                                                                                textAnchor="start"
                                                                            >
                                                                                {shortName}
                                                                            </text>
                                                                        );
                                                                    }}
                                                                />
                                                            );
                                                        });
                                                    })()}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                <FaChartLine className="text-4xl mb-3 opacity-20" />
                                <p>Fetch the trend to visualize upcoming events locally in {storeLocation}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style jsx>{`
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default ScenarioLab;
