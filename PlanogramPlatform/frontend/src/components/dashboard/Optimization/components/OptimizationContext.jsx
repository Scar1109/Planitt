import React, { useState, useEffect } from 'react';
import { FaLayerGroup, FaBox, FaCheckCircle, FaExclamationTriangle, FaDatabase } from 'react-icons/fa';
import api from '../../../../services/api';

const OptimizationContext = ({ stats }) => {
    // Stats passed from parent
    if (!stats) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                Context & Scope
            </h2>

            {/* Scope Card */}
            <div className="mb-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Optimization Scope</h3>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
                                <FaLayerGroup />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800 leading-none">{stats.fixtures}</p>
                                <p className="text-xs font-medium text-slate-500">Active Fixtures</p>
                            </div>
                        </div>
                    </div>
                    <div className="h-px bg-slate-200 w-full"></div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
                                <FaBox />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800 leading-none">{stats.products}</p>
                                <p className="text-xs font-medium text-slate-500">Products Considered</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Health */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Data Readiness</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-green-100 bg-green-50/50">
                        <div className="flex items-center gap-3">
                            <FaDatabase className="text-green-600" />
                            <span className="text-sm font-medium text-slate-700">Sales Data</span>
                        </div>
                        <FaCheckCircle className="text-green-500" />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border border-green-100 bg-green-50/50">
                        <div className="flex items-center gap-3">
                            <FaLayerGroup className="text-green-600" />
                            <span className="text-sm font-medium text-slate-700">Shelf Models</span>
                        </div>
                        <FaCheckCircle className="text-green-500" />
                    </div>

                    {stats.issues > 0 ? (
                        <div className="flex items-center justify-between p-3 rounded-lg border border-amber-100 bg-amber-50/50">
                            <div className="flex items-center gap-3">
                                <FaExclamationTriangle className="text-amber-500" />
                                <span className="text-sm font-medium text-slate-700">Product dims missing</span>
                            </div>
                            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">{stats.issues}</span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-3 rounded-lg border border-green-100 bg-green-50/50">
                            <div className="flex items-center gap-3">
                                <FaBox className="text-green-600" />
                                <span className="text-sm font-medium text-slate-700">Product Data</span>
                            </div>
                            <FaCheckCircle className="text-green-500" />
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-auto pt-6 text-xs text-slate-400 text-center">
                Ready to optimize.
            </div>
        </div>
    );
};

export default OptimizationContext;
