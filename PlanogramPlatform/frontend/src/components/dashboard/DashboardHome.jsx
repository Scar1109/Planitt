import React from 'react';

const DashboardHome = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Total Sales</h3>
                <p className="text-3xl font-bold text-indigo-600">$24,500</p>
                <p className="text-sm text-green-500 mt-2">+12% from last month</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Active Planograms</h3>
                <p className="text-3xl font-bold text-purple-600">8</p>
                <p className="text-sm text-slate-500 mt-2">2 pending review</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Compliance Score</h3>
                <p className="text-3xl font-bold text-green-600">94%</p>
                <p className="text-sm text-indigo-500 mt-2">Top tier performance</p>
            </div>

            <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-slate-100 mt-6 h-64 flex items-center justify-center">
                <p className="text-slate-400">Analytics Chart Placeholder</p>
            </div>
        </div>
    );
};

export default DashboardHome;
