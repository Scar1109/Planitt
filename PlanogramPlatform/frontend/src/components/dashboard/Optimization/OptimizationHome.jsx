import React from 'react';

const OptimizationHome = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Optimization Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Active Planogram Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Active Planogram</h3>
                    <p className="text-xl font-bold text-slate-800">Summer 2024</p>
                    <button className="mt-4 text-indigo-600 text-sm font-medium hover:text-indigo-700">View Planogram &rarr;</button>
                </div>

                {/* Last Run Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Last Optimization Run</h3>
                    <div className="flex items-end space-x-2">
                        <span className="text-2xl font-bold text-green-600">85%</span>
                        <span className="text-sm text-slate-400 mb-1">Score</span>
                    </div>
                </div>

                {/* Data Health Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Data Health</h3>
                    <div className="flex items-center text-amber-500">
                        <span className="font-bold">2 Issues</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Missing dimensions for 5 products</p>
                </div>

                {/* Alerts Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Alerts</h3>
                    <p className="text-sm text-slate-600">No critical alerts.</p>
                </div>
            </div>

            {/* Quick Actions */}
            <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
            <div className="flex space-x-4">
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                    Create New Planogram
                </button>
                <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                    Add Shelf Fixture
                </button>
                <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                    Run Optimization
                </button>
            </div>
        </div>
    );
};

export default OptimizationHome;
