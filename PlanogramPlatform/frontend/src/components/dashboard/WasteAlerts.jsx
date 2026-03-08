import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, Clock, DollarSign, Tag, ChevronRight, Lightbulb, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/api/client"

const riskConfig = {
    Critical: { color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", border: "border-l-red-500" },
    High: { color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", border: "border-l-red-500" },
    Medium: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", border: "border-l-amber-500" },
    Low: {
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
        border: "border-l-emerald-500",
    },
}

export function WasteAlerts() {
    const [wasteAlerts, setWasteAlerts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchWasteAlerts = async () => {
            try {
                setLoading(true)
                setError(null)

                // Fetch live dashboard data from the wastage API
                const response = await api.getWastageDashboard()

                if (response?.data?.riskItems) {
                    const alerts = response.data.riskItems.map((item) => ({
                        id: item.id,
                        product: item.productName,
                        sku: item.sku,
                        quantity: item.closingStock,
                        daysUntilExpiry: item.daysToExpiry,
                        estimatedLoss: item.value || 0,
                        riskLevel: item.risk,
                        recommendation: item.action,
                        category: item.category,
                    }))
                    setWasteAlerts(alerts)
                } else {
                    setWasteAlerts([])
                }
            } catch (err) {
                console.error("Error fetching waste alerts:", err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchWasteAlerts()
    }, [])

    const totalRisk = wasteAlerts.reduce((sum, alert) => sum + alert.estimatedLoss, 0)
    const highRiskCount = wasteAlerts.filter((a) => a.riskLevel === "High" || a.riskLevel === "Critical").length

    return (
        <Card className="border-border">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Waste Alerts
                    </CardTitle>
                    <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                        {highRiskCount} Critical
                    </Badge>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>Total Risk:</span>
                        <span className="font-semibold text-red-600">LKR {totalRisk.toLocaleString()}</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {loading && (
                    <div className="h-[380px] flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
                {error && (
                    <div className="h-[380px] flex items-center justify-center p-4">
                        <div className="text-center">
                            <p className="text-red-500 font-medium">Error loading waste alerts</p>
                            <p className="text-sm text-muted-foreground mt-1">{error}</p>
                        </div>
                    </div>
                )}
                {!loading && !error && wasteAlerts.length === 0 && (
                    <div className="h-[380px] flex items-center justify-center p-4">
                        <div className="text-center text-muted-foreground">
                            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="font-medium">No waste alerts</p>
                            <p className="text-xs mt-1">All products are within safe expiry ranges.</p>
                        </div>
                    </div>
                )}
                {!loading && !error && wasteAlerts.length > 0 && (
                    <ScrollArea className="h-[380px]">
                        <div className="space-y-2 p-4 pt-0">
                            {wasteAlerts.map((alert) => {
                                const config = riskConfig[alert.riskLevel] || riskConfig.Low
                                return (
                                    <div
                                        key={alert.id}
                                        className={cn(
                                            "rounded-lg border border-border bg-background p-3 border-l-4 transition-colors hover:bg-muted/50",
                                            config.border,
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-foreground truncate">{alert.product}</p>
                                                    <Badge className={config.color}>{alert.riskLevel}</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    SKU: {alert.sku} • {alert.category} • {alert.quantity} units
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="flex items-center gap-1 text-red-600">
                                                    <Clock className="h-3 w-3" />
                                                    <span className="text-sm font-medium">
                                                        {alert.daysUntilExpiry <= 0 ? 'Expired' : `${alert.daysUntilExpiry}d`}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">LKR {alert.estimatedLoss.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        {/* AI Recommendation */}
                                        <div className="mt-2 flex items-center gap-2 rounded-md bg-primary/5 p-2">
                                            <Lightbulb className="h-4 w-4 text-primary shrink-0" />
                                            <p className="text-xs text-foreground flex-1">{alert.recommendation}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    )
}
