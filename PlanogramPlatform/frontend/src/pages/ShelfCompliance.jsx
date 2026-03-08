import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FaUpload, FaChevronRight, FaExclamationCircle, FaLightbulb, FaRobot, FaMoneyBillWave, FaBoxOpen } from 'react-icons/fa';

const ShelfCompliance = () => {
    const [runs, setRuns] = useState([]);
    const [shelves, setShelves] = useState([]);
    const [selectedRun, setSelectedRun] = useState('');
    const [selectedFixture, setSelectedFixture] = useState('');
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [report, setReport] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [loadingData, setLoadingData] = useState(false);
    const [fetchError, setFetchError] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoadingData(true);
            setFetchError(false);
            try {
                const [runRes, shelfRes] = await Promise.all([
                    api.get('/planograms/optimization/runs'),
                    api.get('/planograms/shelves')
                ]);
                console.log("[ShelfCompliance] Fetched runs:", runRes.data?.length);
                setRuns(runRes.data || []);
                setShelves(shelfRes.data || []);
            } catch (err) {
                console.error("Failed to fetch initial data", err);
                setFetchError(true);
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedRun && selectedFixture) {
            const run = runs.find(r => r._id === selectedRun);
            if (run && run.resultingPlacements) {
                const fixtureIds = run.resultingPlacements.map(p => p.fixtureId || p.fixture_id);
                if (!fixtureIds.includes(selectedFixture)) {
                    setSelectedFixture('');
                }
            }
        }
    }, [selectedRun, runs, selectedFixture]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const runAnalysis = async () => {
        if (!selectedRun || !selectedFixture || !image) {
            setErrorMessage("Please select a run, a fixture, and upload an image.");
            setStatus('error');
            return;
        }

        setStatus('loading');
        setErrorMessage('');
        
        const formData = new FormData();
        formData.append('optimizationRunId', selectedRun);
        formData.append('fixtureId', selectedFixture);
        formData.append('image', image);

        try {
            const res = await api.post('/compliance/shelf-scan', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setReport(res.data);
            setStatus('success');
        } catch (err) {
            console.error("Analysis failed", err);
            setStatus('error');
            setErrorMessage(err.response?.data?.message || "Analysis failed. Please check backend logs.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Control Panel */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FaUpload className="text-blue-500" /> Shelf Scan Configuration
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Target Optimization Run</label>
                            <select 
                                className={`w-full border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/20 border transition ${fetchError ? 'border-red-300 bg-red-50' : ''}`}
                                value={selectedRun}
                                onChange={(e) => setSelectedRun(e.target.value)}
                                disabled={loadingData || fetchError}
                            >
                                <option value="">
                                    {loadingData ? "Loading runs..." : fetchError ? "Error loading runs" : runs.length === 0 ? "No successful runs found" : "-- Select Run --"}
                                </option>
                                {(runs || []).map(r => (
                                    <option key={r._id} value={r._id}>
                                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'N/A'} - {r.runType} (Score: {r.bestScore?.toFixed(0) || 'N/A'})
                                    </option>
                                ))}
                            </select>
                            {fetchError && <p className="text-[10px] text-red-500 mt-1">Failed to fetch optimization data. Check backend connection.</p>}
                            {!loadingData && !fetchError && runs.length === 0 && (
                                <p className="text-[10px] text-orange-500 mt-1">You must complete at least one optimization run first.</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Active Fixture (Shelf)</label>
                            <select 
                                className="w-full border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/20 border transition"
                                value={selectedFixture}
                                onChange={(e) => setSelectedFixture(e.target.value)}
                                disabled={!selectedRun}
                            >
                                <option value="">-- {selectedRun ? "Select Fixture" : "Select a Run First"} --</option>
                                {shelves
                                    .filter(s => {
                                        if (!selectedRun) return true;
                                        const run = runs.find(r => r._id === selectedRun);
                                        if (!run || !run.resultingPlacements) return false;
                                        const fixtureIds = run.resultingPlacements.map(p => p.fixtureId || p.fixture_id);
                                        return fixtureIds.includes(s._id);
                                    })
                                    .map(s => (
                                        <option key={s._id} value={s._id}>{s.aisleBaySide} ({s.fixtureType})</option>
                                    ))
                                }
                            </select>
                            {selectedRun && shelves.filter(s => {
                                const run = runs.find(r => r._id === selectedRun);
                                const fids = run?.resultingPlacements?.map(p => p.fixtureId || p.fixture_id) || [];
                                return fids.includes(s._id);
                            }).length === 0 && (
                                <p className="text-[10px] text-orange-500 mt-1 font-bold">This run contains no shelf data from your available fixtures.</p>
                            )}
                        </div>

                        <div className="relative group">
                            <label className="block text-sm font-medium text-gray-600 mb-1">Upload Shelf Image</label>
                            <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition ${preview ? 'border-blue-300 bg-blue-50/10' : 'border-gray-300 hover:border-blue-400'}`}>
                                <div className="space-y-1 text-center">
                                    {preview ? (
                                        <img src={preview} alt="Preview" className="mx-auto h-48 w-full object-contain rounded-md" />
                                    ) : (
                                        <FaUpload className="mx-auto h-12 w-12 text-gray-400 group-hover:text-blue-500 transition" />
                                    )}
                                    <div className="flex text-sm text-gray-600">
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                                            <span>{preview ? "Change image" : "Upload a file"}</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageChange} accept="image/*" />
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={runAnalysis}
                            disabled={status === 'loading'}
                            className={`w-full py-3 rounded-lg font-bold text-white transition-all transform active:scale-95 shadow-lg ${status === 'loading' ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}`}
                        >
                            {status === 'loading' ? 'Running Intelligence Analysis...' : 'Analyze Shelf Compliance'}
                        </button>
                    </div>
                </div>

                {/* Quick Academic Overview (Before/After Report) */}
                <div className="flex flex-col gap-6">
                    {status === 'idle' && (
                        <div className="bg-blue-50 p-8 rounded-xl border border-blue-100 h-full flex flex-col justify-center items-center text-center">
                            <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                                <FaBoxOpen className="text-4xl text-blue-500" />
                            </div>
                            <h4 className="text-xl font-bold text-blue-900 mb-2">Intelligence Audit System</h4>
                            <p className="text-blue-700 max-w-md">
                                Upload a photo of your physical shelf implementation to compare against the optimized planogram model. 
                                Our specialized system detects deviations, stockout risks, and revenue recovery opportunities.
                            </p>
                        </div>
                    )}

                    {status === 'loading' && (
                        <div className="bg-white p-8 rounded-xl border border-gray-100 h-full flex flex-col justify-center items-center">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
                            <h4 className="mt-4 font-bold text-gray-800">Processing Visual Information</h4>
                            <p className="text-gray-500 text-sm">Identifying SKUs and measuring facings...</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="bg-red-50 p-6 rounded-xl border border-red-100 h-full">
                            <div className="flex items-center gap-2 text-red-800 font-bold mb-2">
                                <FaExclamationCircle /> Analysis Error
                            </div>
                            <p className="text-red-700">{errorMessage}</p>
                        </div>
                    )}

                    {status === 'success' && report && (
                        <div className="bg-gradient-to-br from-indigo-900 to-blue-900 p-6 rounded-xl text-white shadow-xl h-full flex flex-col justify-between">
                            <div>
                                <h4 className="flex items-center gap-2 text-indigo-200 font-bold uppercase text-xs tracking-widest mb-4">
                                    <FaBoxOpen /> Compliance Executive Summary
                                </h4>
                                <p className="text-lg italic leading-relaxed opacity-90">
                                    "{report.audit_insight}"
                                </p>
                            </div>
                            
                            <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                                <div className="bg-white/10 p-4 rounded-lg">
                                    <div className="text-xs text-indigo-200 mb-1">Stockout Risks</div>
                                    <div className="text-2xl font-bold">{report.metrics.stockoutRisks.length} <span className="text-xs font-normal">Items</span></div>
                                </div>
                                <div className="bg-white/10 p-4 rounded-lg">
                                    <div className="text-xs text-indigo-200 mb-1">Audit Score (PAS)</div>
                                    <div className="text-2xl font-bold transition-all" style={{ color: report.metrics.pas > 80 ? '#4ade80' : '#f87171' }}>
                                        {report.metrics.pas}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {status === 'success' && report && (
                <div className="space-y-6 animate-in fade-in duration-700">
                    {/* Metric Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-blue-500">
                            <div className="text-xs font-medium text-gray-500 uppercase">Revenue Recovery</div>
                            <div className="text-2xl font-bold text-gray-800 mt-1 flex items-center gap-2">
                                <FaMoneyBillWave className="text-green-500" /> {report.metrics.revenueRecovery} LKR
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">Daily potential gain from fixes</div>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-red-500">
                            <div className="text-xs font-medium text-gray-500 uppercase">Deviation Rate</div>
                            <div className="text-2xl font-bold text-gray-800 mt-1">{report.metrics.deviationPct}%</div>
                            <div className="text-[10px] text-gray-400 mt-1">Volume delta vs optimized model</div>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-orange-500">
                            <div className="text-xs font-medium text-gray-500 uppercase">Out of Stocks</div>
                            <div className="text-2xl font-bold text-gray-800 mt-1 flex items-center gap-2">
                                <FaBoxOpen className="text-orange-500" /> {report.metrics.oosCount} SKUs
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">Critical gaps needing attention</div>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-indigo-500">
                            <div className="text-xs font-medium text-gray-500 uppercase">Compliance Fidelity</div>
                            <div className="text-2xl font-bold text-gray-800 mt-1">Precision</div>
                            <div className="text-[10px] text-gray-400 mt-1">Grounded analysis methodology</div>
                        </div>
                    </div>

                    {/* Roadmap & Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Improvement Roadmap */}
                        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FaLightbulb className="text-yellow-500" /> Improvement Roadmap
                            </h4>
                            <div className="space-y-4">
                                {report.suggestions.map((s, i) => (
                                    <div key={i} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg border-l-2 border-indigo-300">
                                        <div className="bg-indigo-100 text-indigo-700 rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                            {i + 1}
                                        </div>
                                        <p className="text-sm text-gray-700 leading-tight">{s}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Comparison Table */}
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
                                <h4 className="font-bold text-gray-800">Adherence Verification Table</h4>
                                <div className="text-xs text-gray-500">Comparing Physical vs Model</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="text-xs font-bold text-gray-400 uppercase bg-gray-50/80">
                                        <tr>
                                            <th className="px-6 py-4">Product / SKU</th>
                                            <th className="px-6 py-4 text-center">Expected (Facings)</th>
                                            <th className="px-6 py-4 text-center">Detected</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {report.comparison.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-blue-50/30 transition">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-800 text-sm">{item.productName}</div>
                                                    <div className="text-xs font-mono text-gray-400">{item.sku}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="text-sm font-bold text-slate-700">{item.expected}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-sm text-blue-600">{item.detected}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center">
                                                        {item.deviation === 0 ? (
                                                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold">COMPLIANT</span>
                                                        ) : item.detected === 0 ? (
                                                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold">STOCKOUT</span>
                                                        ) : (
                                                            <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                                {item.deviation > 0 ? `+${item.deviation}` : item.deviation} UNITS
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ShelfCompliance;
