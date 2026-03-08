import React, { useState, useEffect } from 'react';
import OptimizationContext from './components/OptimizationContext';
import OptimizationConfig from './components/OptimizationConfig';
import OptimizationExecutionModal from './components/OptimizationExecutionModal';
import PlanogramViewer from './components/PlanogramViewer';
import { FaPlay, FaInfoCircle, FaShieldAlt } from 'react-icons/fa';
import api from '../../../services/api';

const OptimizationHome = () => {
    // Data State
    const [products, setProducts] = useState([]);
    const [fixtures, setFixtures] = useState([]);
    const [levels, setLevels] = useState([]);
    const [constraintCount, setConstraintCount] = useState(0);

    // UI State
    const [loading, setLoading] = useState(true);
    const [viewingResult, setViewingResult] = useState(false);

    // State
    const [config, setConfig] = useState({
        runType: 'balanced',
        objectiveWeights: { sales: 0.7, space: 0.3 },
        constraints: { categoryGrouping: true },
        scope: { type: 'all', fixtureId: null, levelId: null }
    });

    const [data, setData] = useState({
        fixtures: [],
        levels: [],
        productsCount: 0,
        issueCount: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [shelvesRes, productsRes, constraintsRes] = await Promise.all([
                    api.get('/planograms/shelves'),
                    api.get('/products?isActive=true'),
                    api.get('/constraints').catch(() => ({ data: { results: 0 } }))
                ]);

                const fixtures = shelvesRes.data || [];
                const products = productsRes.data || [];

                // Extract all levels for easier lookup
                const allLevels = fixtures.flatMap(f => f.levels.map(l => ({ ...l, fixtureName: f.aisleBaySide, fixtureId: f._id })));

                let issues = 0;
                products.forEach(p => {
                    if (!p.widthCm || !p.heightCm || !p.depthCm) issues++;
                });

                setData({
                    fixtures: fixtures,
                    levels: allLevels,
                    products: products, // SAVE THE FULL LIST!
                    productsCount: products.length,
                    issueCount: issues
                });

                setConstraintCount(constraintsRes?.data?.results || (constraintsRes?.data?.data || []).filter(c => c.isActive).length || 0);

            } catch (error) {
                console.error("Failed to fetch optimization data", error);
            }
        };
        fetchData();
    }, []);

    // Execution State
    const [execStatus, setExecStatus] = useState('idle'); // idle, running, success, failed
    const [execResult, setExecResult] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Run Handler
    const handleRun = async () => {
        setIsModalOpen(true);
        setExecStatus('running');
        setExecResult(null);

        try {
            // Include dummy planogramId for now as per controller update
            // Generate a readable timestamp for versioning: Planogram_YYYY-MM-DD_HH-mm-ss
            const timestamp = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');

            const payload = {
                planogramId: "Planogram_" + timestamp,
                config: config
            };

            const res = await api.post('/planograms/optimize', payload);

            // Simulating a delay for UX if response is too fast
            setTimeout(() => {
                setExecResult(res.data);
                setExecStatus('success');
            }, 1000);

        } catch (error) {
            console.error("Optimization failed", error);
            setExecStatus('failed');
            setExecResult({ error: error.message });
        }
    };

    return (
        <div className="flex flex-col p-6 min-h-[600px]">
            {/* Header */}
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Planogram Control Room</h1>
                    <p className="text-slate-500 text-sm">Configure and launch optimization runs.</p>
                </div>
            </div>

            {/* 3-Column Layout */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8">

                {/* LEFT: Context (3 cols) */}
                <div className="lg:col-span-3 h-full">
                    <OptimizationContext stats={{
                        fixtures: data.fixtures.length,
                        products: data.productsCount,
                        issues: data.issueCount
                    }} />
                </div>

                {/* CENTER: Config (6 cols) */}
                <div className="lg:col-span-6 h-full">
                    <OptimizationConfig
                        config={config}
                        setConfig={setConfig}
                        fixtures={data.fixtures}
                        levels={data.levels}
                    />
                </div>

                {/* RIGHT: Preview & Actions (3 cols) */}
                <div className="lg:col-span-3 h-full flex flex-col gap-6">

                    {/* Run Preview Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex-1">
                        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <span className="w-1 h-6 bg-green-500 rounded-full"></span>
                            Run Preview
                        </h2>

                        <div className="space-y-4 mb-8">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Strategy</p>
                                <p className="text-sm font-bold text-[#1B4F72] capitalize">
                                    {config.runType} Optimization
                                </p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Est. Runtime</p>
                                <p className="text-sm font-medium text-slate-700">
                                    {config.runType === 'fast' ? '< 10 Seconds' : config.runType === 'deep' ? '~ 2 Minutes' : '~ 30 Seconds'}
                                </p>
                            </div>
                        </div>

                        <div className="bg-[#17A2B8]/10 p-4 rounded-lg flex gap-3 text-xs text-[#1B4F72] leading-relaxed mb-4">
                            <FaInfoCircle className="shrink-0 text-[#17A2B8] mt-0.5" />
                            <p>
                                System will prioritize <strong>{config.objectiveWeights.sales > config.objectiveWeights.space ? 'Sales Performance' : 'Space Efficiency'}</strong> using {config.runType} solver logic.
                            </p>
                        </div>

                        {/* Constraint Summary */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-[#17A2B8]/10 flex items-center justify-center">
                                <FaShieldAlt className="text-[#17A2B8] text-sm" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold text-slate-700">Active Constraints</p>
                                <p className="text-[10px] text-slate-400">
                                    {constraintCount > 0
                                        ? `${constraintCount} rule${constraintCount > 1 ? 's' : ''} will be enforced during optimization`
                                        : 'No constraints defined — optimizer runs unconstrained'}
                                </p>
                            </div>
                            <span className="text-lg font-bold text-[#1B4F72]">{constraintCount}</span>
                        </div>

                        <button
                            onClick={handleRun}
                            className="w-full bg-gradient-to-r from-[#1B4F72] to-[#17A2B8] hover:from-[#163d58] hover:to-[#138f9e] text-white py-4 rounded-xl font-bold shadow-lg shadow-[#17A2B8]/20 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <FaPlay /> RUN OPTIMIZATION
                        </button>
                    </div>
                </div>
            </div>

            {/* Execution Modal */}
            {/* Execution Modal */}
            <OptimizationExecutionModal
                isOpen={isModalOpen}
                status={execStatus}
                result={execResult}
                onClose={() => {
                    // Close logic
                    setIsModalOpen(false);
                    if (execStatus === 'failed') setExecStatus('idle');
                    if (execStatus === 'success') {
                        // Optional: Reset or keep success state. 
                        // Usually we might want to keep it 'success' so if they re-open? 
                        // But here we are mostly closing the modal.
                        // setExecStatus('idle'); 
                    }
                }}
                onViewResult={() => {
                    setIsModalOpen(false);
                    setViewingResult(true);
                }}
            />

            {/* Planogram Result Viewer */}
            {viewingResult && (
                <PlanogramViewer
                    onClose={() => setViewingResult(false)}
                    result={execResult}
                    fixtures={data.fixtures}
                    levels={data.levels}
                    products={data.products}
                />
            )}
        </div>
    );
};

export default OptimizationHome;
