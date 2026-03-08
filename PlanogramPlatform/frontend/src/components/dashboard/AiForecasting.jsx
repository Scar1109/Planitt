import React, { useState } from 'react';
import { FaRobot, FaChartLine, FaLightbulb } from 'react-icons/fa';
import classNames from 'classnames';

const AiForecasting = () => {
    const [activeTab, setActiveTab] = useState('overview');

    const tabs = [
        { id: 'overview', label: 'Overview', icon: FaRobot },
        { id: 'predictions', label: 'Predictions', icon: FaChartLine },
        { id: 'insights', label: 'Smart Insights', icon: FaLightbulb },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">AI Forecasting</h1>
                    <p className="text-slate-500 mt-1">Predictive analytics and smart inventory suggestions</p>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-[#17A2B8]/10 text-[#1B4F72] rounded-full text-xs font-semibold uppercase tracking-wider">Beta</span>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-1.5 flex overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={classNames(
                            'flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap',
                            {
                                'bg-[#17A2B8]/10 text-[#1B4F72] shadow-sm': activeTab === tab.id,
                                'text-slate-500 hover:text-slate-700 hover:bg-slate-50': activeTab !== tab.id
                            }
                        )}
                    >
                        <tab.icon className={classNames('text-lg', {
                            'text-[#1B4F72]': activeTab === tab.id,
                            'text-slate-400': activeTab !== tab.id
                        })} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 min-h-[400px] p-6 animating-content">
                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 bg-gradient-to-br from-[#17A2B8]/10 to-white rounded-xl border border-[#17A2B8]/20">
                                <h3 className="text-lg font-semibold text-slate-800 mb-2">Confidence Score</h3>
                                <div className="text-3xl font-bold text-[#1B4F72]">--%</div>
                                <p className="text-sm text-slate-500 mt-2">AI model accuracy based on recent data</p>
                            </div>
                            <div className="p-6 bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100">
                                <h3 className="text-lg font-semibold text-slate-800 mb-2">Projected Growth</h3>
                                <div className="text-3xl font-bold text-emerald-600">--%</div>
                                <p className="text-sm text-slate-500 mt-2">Estimated revenue increase next month</p>
                            </div>
                            <div className="p-6 bg-gradient-to-br from-[#17A2B8]/10 to-white rounded-xl border border-[#17A2B8]/20">
                                <h3 className="text-lg font-semibold text-slate-800 mb-2">Stock Alerts</h3>
                                <div className="text-3xl font-bold text-[#17A2B8]">--</div>
                                <p className="text-sm text-slate-500 mt-2">Items requiring immediate attention</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="bg-slate-50 p-4 rounded-full mb-4">
                                <FaRobot className="text-4xl text-slate-300" />
                            </div>
                            <h3 className="text-xl font-medium text-slate-800 mb-2">AI Model Training</h3>
                            <p className="text-slate-500 max-w-md mx-auto">
                                The forecasting model is currently gathering data. Insights will appear here once enough historical data is processed.
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'predictions' && (
                    <div className="animate-fadeIn">
                         <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="bg-[#17A2B8]/10 p-6 rounded-full mb-6">
                                <FaChartLine className="text-5xl text-[#17A2B8]" />
                            </div>
                            <h3 className="text-xl font-medium text-slate-800 mb-2">Future Sales Predictions</h3>
                            <p className="text-slate-500 max-w-lg mx-auto">
                                View detailed sales forecasts for individual planograms and products. This feature will be available in the next update.
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'insights' && (
                    <div className="animate-fadeIn">
                        <div className="space-y-4">
                            {[1, 2, 3].map((item) => (
                                <div key={item} className="flex items-start p-4 rounded-lg border border-slate-100 hover:border-[#17A2B8]/20 hover:shadow-md transition-all duration-200 cursor-pointer group">
                                    <div className="flex-shrink-0 mt-1">
                                        <div className="w-8 h-8 rounded-full bg-[#17A2B8]/10 flex items-center justify-center group-hover:bg-[#17A2B8]/10 transition-colors">
                                            <FaLightbulb className="text-[#17A2B8]" />
                                        </div>
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <div className="h-4 w-3/4 bg-slate-100 rounded mb-2 group-hover:bg-slate-200 transition-colors"></div>
                                        <div className="h-3 w-1/2 bg-slate-50 rounded group-hover:bg-slate-100 transition-colors"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-center text-slate-400 text-sm mt-8">Smart insights placeholder content</p>
                    </div>
                )}
            </div>
            
            <style jsx>{`
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default AiForecasting;
