import React, { useState } from 'react';
import { FaArrowUp, FaArrowDown, FaCheck, FaTimes, FaFilter, FaDownload } from 'react-icons/fa';

const RecommendationsPage = () => {
    // Realistic mock data for Sri Lankan market (Academic Presentation)
    const [recommendations] = useState([
        { id: 'REC-2024-SL01', sku: 'EH-EGB-400', name: 'Elephant House EGB 400ml', current_price: 150.00, recommended_discount: '10%', projected_uplift: '+450 units', confidence: '98%', status: 'Ready' },
        { id: 'REC-2024-SL02', sku: 'MN-SCC-150', name: 'Munchee Super Cream Cracker 190g', current_price: 220.00, recommended_discount: 'Buy 3 Get 1', projected_uplift: '+320 units', confidence: '92%', status: 'Ready' },
        { id: 'REC-2024-SL03', sku: 'HL-FM-1L', name: 'Highland Fresh Milk 1L', current_price: 450.00, recommended_discount: '5%', projected_uplift: '+150 units', confidence: '87%', status: 'Review' },
        { id: 'REC-2024-SL04', sku: 'KK-SAUS-500', name: 'Keells Krest Chicken Sausages', current_price: 1100.00, recommended_discount: '15%', projected_uplift: '+180 units', confidence: '95%', status: 'Ready' },
        { id: 'REC-2024-SL05', sku: 'SUN-DET-1KG', name: 'Sunlight Detergent Powder 1kg', current_price: 650.00, recommended_discount: '10%', projected_uplift: '+85 units', confidence: '89%', status: 'Review' },
        { id: 'REC-2024-SL06', sku: 'CBL-SAMA-200', name: 'CBL Samaposha 200g', current_price: 180.00, recommended_discount: 'Buy 2 Save Rs.20', projected_uplift: '+210 units', confidence: '94%', status: 'Ready' },
    ]);

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Optimization Opportunities</h1>
                    <p className="text-slate-500 mt-1">AI-driven campaign recommendations based on Sri Lankan market trends.</p>
                </div>
                <div className="flex gap-3 mt-4 md:mt-0">
                    <button className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                        <FaFilter className="mr-2" /> Filter
                    </button>
                    <button className="flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm">
                        <FaDownload className="mr-2" /> Export Report
                    </button>
                </div>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700">Reference ID</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Product</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Current Price (LKR)</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Optimization Strategy</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Projected Impact</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">AI Confidence</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recommendations.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">{item.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{item.name}</div>
                                        <div className="text-xs text-slate-500">{item.sku}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">Rs. {item.current_price.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {item.recommended_discount}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="flex items-center text-green-600 font-medium">
                                            <FaArrowUp className="mr-1.5 w-3 h-3" />
                                            {item.projected_uplift}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-16 h-2 bg-slate-100 rounded-full mr-3 overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500 rounded-full"
                                                    style={{ width: item.confidence }}
                                                ></div>
                                            </div>
                                            <span className="text-xs text-slate-600">{item.confidence}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {item.status === 'Ready' ? (
                                            <div className="flex items-center text-green-700 bg-green-50 px-2 py-1 rounded-md w-fit text-xs font-medium">
                                                <FaCheck className="mr-1.5" /> Approved
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-amber-700 bg-amber-50 px-2 py-1 rounded-md w-fit text-xs font-medium">
                                                <FaFilter className="mr-1.5" /> Pending Review
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="text-indigo-600 hover:text-indigo-900 font-medium text-xs">View Analysis</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
                    <span>Showing 1-6 of 42 relevant opportunities</span>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50">Previous</button>
                        <button className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecommendationsPage;
