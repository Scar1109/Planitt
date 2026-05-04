import React from 'react';
import { FaRocket, FaBalanceScale, FaBrain, FaInfoCircle } from 'react-icons/fa';

const OptimizationConfig = ({ config, setConfig, fixtures = [], levels = [] }) => {

    const handleWeightChange = (key, val) => {
        setConfig(prev => ({
            ...prev,
            objectiveWeights: {
                ...prev.objectiveWeights,
                [key]: parseFloat(val)
            }
        }));
    };

    const handleConstraintChange = (key) => {
        setConfig(prev => ({
            ...prev,
            constraints: {
                ...prev.constraints, // Ensure constraints object exists
                [key]: !prev.constraints?.[key]
            }
        }));
    };

    const handleModeSelect = (mode) => {
        setConfig(prev => ({ ...prev, runType: mode }));
    };

    const handleScopeTypeChange = (type) => {
        setConfig(prev => ({
            ...prev,
            scope: { type, fixtureId: null, levelId: null }
        }));
    };

    const handleScopeIdChange = (key, val) => {
        setConfig(prev => ({
            ...prev,
            scope: { ...prev.scope, [key]: val }
        }));
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-[#17A2B8] rounded-full"></span>
                Configuration
            </h2>

            {/* Section 0: Scope */}
            <div className="mb-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Optimization Scope</h3>
                <div className="space-y-4">
                    {/* Scope Type Selection */}
                    <div className="flex gap-2 p-1 bg-slate-100/50 rounded-xl border border-slate-200">
                        {['all', 'fixture', 'level'].map(type => (
                            <button
                                key={type}
                                onClick={() => handleScopeTypeChange(type)}
                                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all capitalize ${config.scope?.type === type
                                    ? 'bg-white text-[#1B4F72] shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-500 hover:bg-slate-200/50'
                                    }`}
                            >
                                {type === 'all' ? 'Full Planogram' : type === 'fixture' ? 'Single Fixture' : 'Single Level'}
                            </button>
                        ))}
                    </div>

                    {/* Conditional Dropdowns */}
                    {config.scope?.type === 'fixture' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                            <label className="text-xs font-medium text-slate-700 mb-1 block">Select Fixture</label>
                            <select
                                className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#17A2B8]/20 focus:border-[#17A2B8] outline-none"
                                value={config.scope.fixtureId || ''}
                                onChange={(e) => handleScopeIdChange('fixtureId', e.target.value)}
                            >
                                <option value="">-- Choose a Fixture --</option>
                                {fixtures.length > 0 ? fixtures.map(f => (
                                    <option key={f._id} value={f._id}>{f.aisleBaySide} ({f.fixtureType})</option>
                                )) : <option disabled>No fixtures found</option>}
                            </select>
                        </div>
                    )}

                    {config.scope?.type === 'level' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                            <label className="text-xs font-medium text-slate-700 mb-1 block">Select Shelf Level</label>
                            <select
                                className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#17A2B8]/20 focus:border-[#17A2B8] outline-none"
                                value={config.scope.levelId || ''}
                                onChange={(e) => handleScopeIdChange('levelId', e.target.value)}
                            >
                                <option value="">-- Choose a Level --</option>
                                {fixtures.length > 0 ? fixtures.map(f => (
                                    <optgroup key={f._id} label={f.aisleBaySide}>
                                        {levels.filter(l => l.fixtureId === f._id).map(l => (
                                            <option key={l._id} value={l._id}>
                                                Level {l.levelIndex + 1}
                                            </option>
                                        ))}
                                    </optgroup>
                                )) : <option disabled>No levels found</option>}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Section 1: Mode */}
            <div className="mb-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Optimization Mode</h3>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => handleModeSelect('fast')}
                        className={`p-4 rounded-xl border text-left transition-all ${config.runType === 'fast' ? 'border-[#17A2B8] bg-[#17A2B8]/5 ring-1 ring-[#17A2B8]' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <FaRocket className={`mb-2 ${config.runType === 'fast' ? 'text-[#17A2B8]' : 'text-slate-400'}`} />
                        <div className="font-bold text-sm text-slate-800">Fast</div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-1">Heuristic Only. Quick feasible layout.</div>
                    </button>

                    <button
                        onClick={() => handleModeSelect('balanced')}
                        className={`p-4 rounded-xl border text-left transition-all ${config.runType === 'balanced' ? 'border-[#17A2B8] bg-[#17A2B8]/5 ring-1 ring-[#17A2B8]' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <FaBalanceScale className={`mb-2 ${config.runType === 'balanced' ? 'text-[#17A2B8]' : 'text-slate-400'}`} />
                        <div className="font-bold text-sm text-slate-800">Balanced</div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-1">Hybrid. Best for general use.</div>
                    </button>

                    <button
                        onClick={() => handleModeSelect('deep')}
                        className={`p-4 rounded-xl border text-left transition-all ${config.runType === 'deep' ? 'border-[#17A2B8] bg-[#17A2B8]/5 ring-1 ring-[#17A2B8]' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <FaBrain className={`mb-2 ${config.runType === 'deep' ? 'text-[#17A2B8]' : 'text-slate-400'}`} />
                        <div className="font-bold text-sm text-slate-800">Deep</div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-1">Metaheuristic. Max quality.</div>
                    </button>
                </div>
            </div>

            {/* Section 2: Objectives */}
            <div className="mb-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Objective Priorities</h3>
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">Sales Demand</span>
                            <span className="text-xs font-bold text-[#1B4F72]">{config.objectiveWeights.sales * 100}%</span>
                        </div>
                        <input
                            type="range" min="0" max="1" step="0.1"
                            value={config.objectiveWeights.sales}
                            onChange={(e) => handleWeightChange('sales', e.target.value)}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#1B4F72]"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">Space Utilization</span>
                            <span className="text-xs font-bold text-[#1B4F72]">{config.objectiveWeights.space * 100}%</span>
                        </div>
                        <input
                            type="range" min="0" max="1" step="0.1"
                            value={config.objectiveWeights.space}
                            onChange={(e) => handleWeightChange('space', e.target.value)}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#1B4F72]"
                        />
                    </div>
                </div>
            </div>

            {/* Section 3: Constraints */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Active Constraints</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg bg-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <div>
                                <p className="text-sm font-bold text-slate-700">Physical Dimensions</p>
                                <p className="text-[10px] text-slate-400">Hard Constraint</p>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-slate-400">Always On</span>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg bg-white">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#17A2B8]"></div>
                            <div>
                                <p className="text-sm font-bold text-slate-700">Category Grouping</p>
                                <p className="text-[10px] text-slate-400">Soft Constraint</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={config.constraints?.categoryGrouping || false}
                                onChange={() => handleConstraintChange('categoryGrouping')}
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-[#1B4F72] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                        </label>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default OptimizationConfig;
