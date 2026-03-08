import React from 'react';
import { FaCog, FaCheckCircle, FaTimesCircle, FaPlay } from 'react-icons/fa';

const OptimizationExecutionModal = ({ isOpen, status, onClose, result, logs, onViewResult }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-gradient-to-r from-[#1B4F72] to-[#17A2B8] p-6 text-white text-center">
                    <div className="flex justify-between items-start">
                        <div className="w-8"></div> {/* Spacer for centering */}
                        <h3 className="text-xl font-bold mb-1">
                            {status === 'running' && 'Optimization in Progress'}
                            {status === 'success' && 'Optimization Complete'}
                            {status === 'failed' && 'Optimization Failed'}
                        </h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><FaTimesCircle size={20} /></button>
                    </div>
                    <p className="text-slate-400 text-sm">
                        {status === 'running' && 'Please wait while the engine finds the best layout...'}
                        {status === 'success' && 'A new planogram has been generated successfully.'}
                    </p>
                </div>

                {/* Body */}
                <div className="p-8">

                    {/* RUNNING STATE */}
                    {status === 'running' && (
                        <div className="flex flex-col items-center py-4">
                            <div className="relative w-24 h-24 mb-6">
                                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-[#17A2B8] rounded-full border-t-transparent animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <FaCog className="text-slate-300 text-2xl animate-pulse" />
                                </div>
                            </div>
                            <div className="space-y-3 w-full max-w-xs">
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <FaCheckCircle className="text-green-500" /> Initializing Data
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-800 font-bold">
                                    <FaPlay className="text-[#17A2B8] animate-pulse" /> Running Heuristic Construction
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-400">
                                    <div className="w-4 h-4 rounded-full border border-slate-300"></div> Refining Layout
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SUCCESS STATE */}
                    {status === 'success' && (
                        <div className="text-center">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FaCheckCircle size={40} />
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Heuristic Baseline</p>
                                    <p className="text-lg font-bold text-slate-600">{result?.heuristicScore?.toFixed(1) || '--'}</p>
                                </div>
                                <div className="bg-gradient-to-b from-[#17A2B8]/10 to-transparent p-3 rounded-xl border border-[#17A2B8]/20 text-center">
                                    <p className="text-[10px] text-[#17A2B8] uppercase font-bold">Best Score</p>
                                    <p className="text-lg font-bold text-[#1B4F72]">{result?.score?.toFixed(1) || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-6">
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Placements</p>
                                    <p className="text-base font-bold text-slate-800">{result?.placementCount || 0}</p>
                                </div>
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Improvement</p>
                                    <p className="text-base font-bold text-emerald-600">
                                        {result?.improvementPct ? `+${result.improvementPct.toFixed(1)}%` : '--'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Runtime</p>
                                    <p className="text-base font-bold text-slate-700">
                                        {result?.runtimeMs ? (result.runtimeMs < 1000 ? `${result.runtimeMs}ms` : `${(result.runtimeMs / 1000).toFixed(1)}s`) : '--'}
                                    </p>
                                </div>
                            </div>

                            {/* Constraint Status */}
                            {result?.constraintViolations?.length > 0 ? (
                                <div className="bg-[#17A2B8]/10 border border-[#17A2B8]/20 rounded-xl p-3 mb-4 text-xs text-[#1B4F72]">
                                    ⚠️ {result.constraintViolations.length} soft constraint violation{result.constraintViolations.length > 1 ? 's' : ''}
                                </div>
                            ) : (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 text-xs text-emerald-700">
                                    ✓ All constraints satisfied
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button onClick={onClose} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors">
                                    Close
                                </button>
                                <button onClick={onViewResult} className="w-full bg-gradient-to-r from-[#1B4F72] to-[#17A2B8] hover:from-[#163d58] hover:to-[#138f9e] text-white font-bold py-3 rounded-xl transition-all">
                                    View Planogram
                                </button>
                            </div>
                        </div>
                    )}

                    {/* FAILED STATE */}
                    {status === 'failed' && (
                        <div className="text-center">
                            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FaTimesCircle size={40} />
                            </div>
                            <p className="text-red-600 font-medium mb-6">
                                {result?.error || "Something went wrong. Please check your data and constraints."}
                            </p>
                            <button onClick={onClose} className="text-slate-500 hover:text-slate-800 font-medium">
                                Close
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default OptimizationExecutionModal;
