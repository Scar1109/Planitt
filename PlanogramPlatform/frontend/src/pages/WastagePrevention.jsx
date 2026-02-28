import React, { useState } from 'react';
import {
    FaTrashAlt, FaExclamationTriangle, FaLeaf, FaChartPie, FaCalendarAlt,
    FaArrowRight, FaTag, FaCheckCircle
} from 'react-icons/fa';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

/**
 * Wastage Prevention Module
 * Enhanced with analytics, visual insights, and interactive AI recommendations.
 */
const WastagePrevention = () => {
    // Mock Data: High Risk Items
    const [riskItems, setRiskItems] = useState([
        { id: 1, sku: 'LK-DAI-004', name: 'Fresh Milk 1L', category: 'Dairy', expiry: 'Tomorrow', quantity: 15, value: 4500, risk: 'Critical', action: 'Discount 50%' },
        { id: 2, sku: 'LK-BAK-002', name: 'Sandwich Bread', category: 'Bakery', expiry: '2 Days', quantity: 8, value: 1200, risk: 'High', action: 'Bundle Offer' },
        { id: 3, sku: 'LK-VEG-008', name: 'Tomatoes 500g', category: 'Produce', expiry: '3 Days', quantity: 20, value: 3000, risk: 'Medium', action: 'Discount 20%' },
        { id: 4, sku: 'LK-FRU-012', name: 'Papaya', category: 'Produce', expiry: '2 Days', quantity: 5, value: 1500, risk: 'High', action: 'Cut & Pack' },
    ]);

    // Mock Data: Charts
    const categoryData = [
        { name: 'Produce', value: 4500 },
        { name: 'Dairy', value: 4500 },
        { name: 'Bakery', value: 1200 },
        { name: 'Seafood', value: 2100 },
    ];

    const expiryTrendData = [
        { day: 'Today', value: 1500 },
        { day: 'Tomorrow', value: 4500 },
        { day: 'Day 3', value: 3200 },
        { day: 'Day 4', value: 1800 },
        { day: 'Day 5', value: 900 },
    ];

    const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

    const handleAction = (id) => {
        setRiskItems(prev => prev.filter(item => item.id !== id));
        // In real app, this would trigger API call
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <FaLeaf className="text-emerald-600" />
                        Wastage Prevention
                    </h1>
                    <p className="text-slate-500 mt-1">AI-driven insights to minimize inventory loss.</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 text-emerald-700 text-sm font-medium">
                    <FaCheckCircle />
                    <span>System Active · 98% Accuracy</span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="relative z-10">
                        <p className="text-sm text-slate-500 font-medium uppercase tracking-wide">Monthly Wastage</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-1">12.5 kg</h3>
                        <p className="text-xs text-emerald-600 flex items-center gap-1 mt-2">
                            <span className="font-bold">↓ 15%</span> vs last month
                        </p>
                    </div>
                    <FaTrashAlt className="absolute right-4 top-4 text-slate-100 group-hover:text-red-50 transition-colors transform group-hover:scale-110 duration-300" size={60} />
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="relative z-10">
                        <p className="text-sm text-slate-500 font-medium uppercase tracking-wide">Value at Risk</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-1">LKR 10,200</h3>
                        <p className="text-xs text-orange-600 flex items-center gap-1 mt-2 font-medium">
                            Requires immediate action
                        </p>
                    </div>
                    <FaExclamationTriangle className="absolute right-4 top-4 text-slate-100 group-hover:text-orange-50 transition-colors transform group-hover:scale-110 duration-300" size={60} />
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow active-card border-l-4 border-l-emerald-500">
                    <div className="relative z-10">
                        <p className="text-sm text-slate-500 font-medium uppercase tracking-wide">Saved by AI</p>
                        <h3 className="text-3xl font-bold text-emerald-700 mt-1">LKR 28,100</h3>
                        <p className="text-xs text-slate-500 mt-2">
                            Total value recovered this month
                        </p>
                    </div>
                    <FaLeaf className="absolute right-4 top-4 text-slate-100 group-hover:text-emerald-50 transition-colors transform group-hover:scale-110 duration-300" size={60} />
                </div>
            </div>

            {/* Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expiry Timeline Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <FaCalendarAlt className="text-indigo-500" />
                            Expiry Timeline (Value)
                        </h3>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={expiryTrendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Risk Composition Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <FaChartPie className="text-orange-500" />
                            Risk by Category
                        </h3>
                    </div>
                    <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* AI Actionable Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Priority Actions Required</h2>
                        <p className="text-sm text-slate-500">AI suggests immediate intervention for these items.</p>
                    </div>
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold animate-pulse">
                        {riskItems.length} Critical Items
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-xs">
                            <tr>
                                <th className="px-6 py-4">Product Details</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Value At Risk</th>
                                <th className="px-6 py-4">AI Recommendation</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {riskItems.length > 0 ? riskItems.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{item.name}</div>
                                        <div className="text-slate-500 text-xs mt-1">{item.sku} · {item.category}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${item.risk === 'Critical' ? 'bg-red-500' :
                                                    item.risk === 'High' ? 'bg-orange-500' : 'bg-yellow-500'
                                                }`}></span>
                                            <span className="font-medium text-slate-700">{item.expiry}</span>
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">{item.quantity} units</div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        LKR {item.value.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-medium text-xs border border-indigo-100">
                                            <FaTag size={10} />
                                            {item.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleAction(item.id)}
                                            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all shadow-sm active:transform active:scale-95"
                                        >
                                            Apply
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <FaCheckCircle className="mx-auto text-emerald-400 mb-2" size={32} />
                                        <p>No critical risks detected. Good job!</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* AI Suggestion Banner */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                            <FaLeaf /> Smart Reduction Strategy
                        </h3>
                        <p className="text-indigo-100 text-sm max-w-xl">
                            Based on sales velocity, <strong>Fresh Milk</strong> categories consistently have 15% wastage on Tuesdays.
                            AI recommends reducing Tuesday orders by <strong>10 units</strong> to save ~LKR 12,000 monthly.
                        </p>
                    </div>
                    <button className="whitespace-nowrap px-5 py-2.5 bg-white text-indigo-600 font-bold rounded-lg shadow-md hover:bg-indigo-50 transition-colors flex items-center gap-2">
                        Adjust Orders <FaArrowRight size={12} />
                    </button>
                </div>
                {/* Decorative circles */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-20 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
            </div>
        </div>
    );
};

export default WastagePrevention;
