import React from 'react';
import { FaCog, FaCheckCircle, FaTimesCircle, FaPlay } from 'react-icons/fa';

const OptimizationExecutionModal = ({ isOpen, status, onClose, result, logs, onViewResult }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-slate-900 p-6 text-white text-center">
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
                                <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <FaCog className="text-slate-300 text-2xl animate-pulse" />
                                </div>
                            </div>
                            <div className="space-y-3 w-full max-w-xs">
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <FaCheckCircle className="text-green-500" /> Initializing Data
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-800 font-bold">
                                    <FaPlay className="text-indigo-500 animate-pulse" /> Running Heuristic Construction
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

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Score</p>
                                    <p className="text-2xl font-bold text-slate-800">{result?.score?.toFixed(1) || 'N/A'}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Placements</p>
                                    <p className="text-2xl font-bold text-slate-800">{result?.placementCount || 0}</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={onClose} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors">
                                    Close
                                </button>
                                <button onClick={onViewResult} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors">
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
