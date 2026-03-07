import React, { useState, useEffect } from 'react';
import {
    FaLeaf, FaTag, FaCheckCircle, FaSpinner
} from 'react-icons/fa';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

/**
 * Wastage Prevention System
 * Simplified version: Only shows Near Expiry Products List
 */
const WastagePrevention = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);
    const [applyingAction, setApplyingAction] = useState(null);
    const { user } = useAuth();

    // Extract proper string ID from store object
    const storeId = typeof user?.store === 'string' ? user.store : (user?.store?._id || user?.store?.name || 'default');

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        setLoading(true);
        setError(null);
        try {
            const dashRes = await api.getWastageDashboard(storeId);

            if (dashRes && dashRes.data) {
                setDashboardData(dashRes.data);
            } else {
                setDashboardData({
                    riskItems: [],
                    totalRiskItems: 0,
                });
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
            setError('Failed to load data. Please check that the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (item) => {
        setApplyingAction(item.id);
        try {
            const discountMatch = item.action.match(/(\d+)%/);
            const discountPercent = discountMatch ? parseInt(discountMatch[1]) : 0;
            const actionType = item.action.toLowerCase().includes('donate') ? 'donate' : 'markdown';

            await api.applyWastageAction({
                productId: item.sku,
                storeId,
                actionType,
                discountPercent,
                targetQuantity: item.closingStock,
            });

            setDashboardData(prev => ({
                ...prev,
                riskItems: prev.riskItems.filter(ri => ri.id !== item.id),
                totalRiskItems: prev.totalRiskItems - 1,
            }));
        } catch (err) {
            console.error('Action error:', err);
        } finally {
            setApplyingAction(null);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 pb-10 animate-pulse">
                <div className="h-10 w-64 bg-slate-200 rounded-lg" />
                <div className="bg-white p-6 rounded-xl border border-slate-200 h-64" />
            </div>
        );
    }

    const riskItems = dashboardData?.riskItems || [];

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <FaLeaf className="text-emerald-600" />
                        Products Near Expiry
                    </h1>
                    <p className="text-slate-500 mt-1">Review items requiring immediate attention</p>
                </div>
                <div className="flex items-center gap-3">
                    {error && (
                        <span className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded-lg border border-red-100">{error}</span>
                    )}
                    <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 text-emerald-700 text-sm font-medium">
                        <FaCheckCircle />
                        <span>System Active</span>
                    </div>
                </div>
            </div>

            {/* AI Actionable Section - Near Expiry List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Priority Actions Required</h2>
                        <p className="text-sm text-slate-500">Suggested interventions for near-expiry items</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${riskItems.length > 0 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-emerald-100 text-emerald-700'}`}>
                        {riskItems.length > 0 ? `${dashboardData?.totalRiskItems || riskItems.length} Items at Risk` : 'All Clear'}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-xs">
                            <tr>
                                <th className="px-6 py-4">Product Details</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Value At Risk</th>
                                <th className="px-6 py-4">Recommendation</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {riskItems.length > 0 ? riskItems.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{item.productName}</div>
                                        <div className="text-slate-500 text-xs mt-1">{item.sku} · {item.category}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${item.risk === 'Critical' ? 'bg-red-500' :
                                                item.risk === 'High' ? 'bg-orange-500' :
                                                    item.risk === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                                                }`}></span>
                                            <span className="font-medium text-slate-700">{item.expiryLabel}</span>
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">{item.closingStock} units</div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        LKR {item.value?.toLocaleString() || '0'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-medium text-xs border border-indigo-100">
                                            <FaTag size={10} />
                                            {item.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleAction(item)}
                                            disabled={applyingAction === item.id}
                                            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all shadow-sm active:transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {applyingAction === item.id ? (
                                                <span className="flex items-center gap-1"><FaSpinner className="animate-spin" /> Applying...</span>
                                            ) : 'Apply'}
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
        </div>
    );
};

export default WastagePrevention;
