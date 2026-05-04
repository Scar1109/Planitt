import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    AlertTriangle,
    Package,
    TrendingDown,
    Clock,
    RefreshCw,
    ChevronRight,
    Loader2,
    ShoppingCart,
    AlertCircle
} from "lucide-react"
import { api } from "@/api/client"

export function LowStockAlerts() {
    const [alerts, setAlerts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [lastUpdated, setLastUpdated] = useState(null)

    const fetchLowStockAlerts = async () => {
        try {
            setLoading(true)
            setError(null)

            // Call the real backend API for low stock alerts
            const response = await api.getLowStockAlerts(10)

            if (response.success && response.alerts) {
                setAlerts(response.alerts)
                console.log(`📊 Low Stock Alerts: ${response.totalLowStock} total, showing ${response.alerts.length}`)
                console.log(`   Summary: ${response.summary?.critical || 0} critical, ${response.summary?.high || 0} high, ${response.summary?.medium || 0} medium`)
                console.log(`   Data from: ${response.dataDate}`)
            } else {
                // If no inventory data, show message
                setAlerts([])
                console.log('📊 Low Stock Alerts: No inventory data available')
            }

            setLastUpdated(new Date())
        } catch (err) {
            console.error("Failed to fetch low stock alerts:", err)
            setError("Could not load stock alerts from database")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLowStockAlerts()
    }, [])

    const getAlertBadge = (level) => {
        switch (level) {
            case 'critical':
                return {
                    className: "bg-red-100 text-red-700 border-red-200",
                    icon: AlertCircle,
                    label: "CRITICAL"
                }
            case 'high':
                return {
                    className: "bg-orange-100 text-orange-700 border-orange-200",
                    icon: AlertTriangle,
                    label: "HIGH"
                }
            case 'medium':
                return {
                    className: "bg-[#17A2B8]/10 text-[#1B4F72] border-[#17A2B8]/20",
                    icon: Clock,
                    label: "MEDIUM"
                }
            default:
                return {
                    className: "bg-slate-100 text-slate-600 border-slate-200",
                    icon: Package,
                    label: "INFO"
                }
        }
    }

    return (
        <Card className="bg-white border-slate-100 shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                            <span className="text-slate-800">Low Stock Alerts</span>
                            {alerts.length > 0 && (
                                <Badge className="ml-2 bg-red-100 text-red-700 border-red-200">
                                    {alerts.length} items
                                </Badge>
                            )}
                        </div>
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchLowStockAlerts}
                        disabled={loading}
                        className="text-slate-500 hover:text-slate-700"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
                {lastUpdated && (
                    <p className="text-xs text-slate-400 mt-1">
                        Last updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                )}
            </CardHeader>
            <CardContent className="pt-0">
                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                            <p className="text-sm text-slate-500">Analyzing inventory...</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="text-center py-6 text-red-500">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {!loading && !error && alerts.length === 0 && (
                    <div className="text-center py-8">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 mx-auto mb-3">
                            <Package className="h-6 w-6 text-emerald-600" />
                        </div>
                        <p className="text-sm font-medium text-slate-700">All Stock Healthy!</p>
                        <p className="text-xs text-slate-500 mt-1">No items need immediate attention</p>
                    </div>
                )}

                {!loading && !error && alerts.length > 0 && (
                    <div className="max-h-[400px] overflow-y-auto pr-1 space-y-2 scrollbar-thin">
                        {alerts.map((alert, idx) => {
                            const badge = getAlertBadge(alert.alertLevel)
                            const BadgeIcon = badge.icon

                            return (
                                <div
                                    key={alert.sku}
                                    className={`p-2.5 rounded-lg border transition-all hover:shadow-sm ${alert.alertLevel === 'critical'
                                        ? 'bg-red-50/50 border-red-100'
                                        : alert.alertLevel === 'high'
                                            ? 'bg-orange-50/50 border-orange-100'
                                            : 'bg-[#17A2B8]/10 border-[#17A2B8]/20'
                                        }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className={`flex-shrink-0 p-1.5 rounded-md ${alert.alertLevel === 'critical' ? 'bg-red-100' :
                                                alert.alertLevel === 'high' ? 'bg-orange-100' : 'bg-[#17A2B8]/10'
                                                }`}>
                                                <BadgeIcon className={`h-3.5 w-3.5 ${alert.alertLevel === 'critical' ? 'text-red-600' :
                                                    alert.alertLevel === 'high' ? 'text-orange-600' : 'text-[#17A2B8]'
                                                    }`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <h4 className="font-medium text-xs text-slate-800 truncate max-w-[120px]">
                                                        {alert.name}
                                                    </h4>
                                                    <Badge className={`text-[9px] px-1.5 py-0 ${badge.className}`}>
                                                        {badge.label}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                                    <span>{alert.avgDailyDemand}/day</span>
                                                    <span>•</span>
                                                    <span className={`font-medium ${alert.alertLevel === 'critical' ? 'text-red-600' :
                                                        alert.alertLevel === 'high' ? 'text-orange-600' : 'text-[#17A2B8]'
                                                        }`}>
                                                        ~{alert.daysOfStock}d left
                                                    </span>
                                                    {alert.stockoutRisk > 0 && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="font-semibold text-rose-500 bg-rose-50 px-1 rounded-sm border border-rose-100">
                                                                {(alert.stockoutRisk * 100).toFixed(0)}% Risk
                                                            </span>
                                                        </>
                                                    )}
                                                    {alert.demandTrend && alert.demandTrend !== 0 ? (
                                                        <>
                                                            <span>•</span>
                                                            <span className={`font-semibold ${alert.demandTrend > 0 ? "text-emerald-500" : "text-[#17A2B8]"}`}>
                                                                {alert.demandTrend > 0 ? "↑" : "↓"} {(Math.abs(alert.demandTrend) * 100).toFixed(0)}% Trend
                                                            </span>
                                                        </>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`text-base font-bold ${alert.alertLevel === 'critical' ? 'text-red-600' :
                                                alert.alertLevel === 'high' ? 'text-orange-600' : 'text-[#17A2B8]'
                                                }`}>
                                                {alert.currentStock}
                                            </div>
                                            {alert.suggestedOrder > 0 && (
                                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#17A2B8]/10 border border-[#17A2B8]/20 text-[10px]">
                                                    <ShoppingCart className="h-2.5 w-2.5 text-[#1B4F72]" />
                                                    <span className="font-semibold text-[#1B4F72]">+{alert.suggestedOrder}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>

            {/* Footer Summary */}
            {!loading && alerts.length > 0 && (
                <CardFooter className="pt-0 pb-3 px-4">
                    <div className="w-full flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                        <span>
                            {alerts.filter(a => a.alertLevel === 'critical').length} critical, {' '}
                            {alerts.filter(a => a.alertLevel === 'high').length} high, {' '}
                            {alerts.filter(a => a.alertLevel === 'medium').length} medium
                        </span>
                        <span>Scroll for more ↓</span>
                    </div>
                </CardFooter>
            )}
        </Card>
    )
}
