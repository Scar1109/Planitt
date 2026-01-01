import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, Clock, DollarSign, Tag, ChevronRight, Lightbulb, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/api/client"

const riskConfig = {
    critical: { color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", border: "border-l-red-500" },
    high: { color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", border: "border-l-red-500" },
    medium: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", border: "border-l-amber-500" },
    low: {
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
        border: "border-l-emerald-500",
    },
}

const recommendationIcons = {
    emergency_markdown: Tag,
    markdown: Tag,
    monitor: ChevronRight,
    no_action: ChevronRight,
}

// Mock inventory data for the API call
const mockInventory = [
    { sku: "DAI-012", store_id: "STORE-001", current_stock: 15, days_to_expiry: 3, old_stock_share: 0.4, avg_daily_sales: 3.0, supplier_lead_time_days: 2 },
    { sku: "PRD-089", store_id: "STORE-001", current_stock: 8, days_to_expiry: 2, old_stock_share: 0.5, avg_daily_sales: 2.5, supplier_lead_time_days: 1 },
    { sku: "BAK-015", store_id: "STORE-001", current_stock: 12, days_to_expiry: 1, old_stock_share: 0.6, avg_daily_sales: 8.0, supplier_lead_time_days: 1 },
    { sku: "BEV-023", store_id: "STORE-001", current_stock: 20, days_to_expiry: 5, old_stock_share: 0.2, avg_daily_sales: 3.5, supplier_lead_time_days: 2 },
    { sku: "DAI-034", store_id: "STORE-001", current_stock: 6, days_to_expiry: 7, old_stock_share: 0.1, avg_daily_sales: 0.8, supplier_lead_time_days: 2 },
]

// Product name mapping (in real app, this would come from a product service)
const productNames = {
    "DAI-012": "Greek Yogurt 500g",
    "PRD-089": "Fresh Salad Mix",
    "BAK-015": "Whole Wheat Bread",
    "BEV-023": "Orange Juice 1L",
    "DAI-034": "Cheddar Cheese 200g",
}

export function WasteAlerts() {
    const [wasteAlerts, setWasteAlerts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchWasteRisk = async () => {
            try {
                setLoading(true)
                setError(null)

                // Fetch real waste risk data from API
                const response = await api.getWasteRisk(mockInventory, "STORE-001", true)

                // Transform API response to UI format
                const alerts = response.predictions.map((item) => ({
                    id: item.product_id,
                    product: productNames[item.product_id] || item.product_id,
                    sku: item.product_id,
                    quantity: item.current_stock,
                    daysUntilExpiry: item.days_to_expiry,
                    estimatedLoss: item.excess_quantity * 150, // Mock price calculation
                    riskLevel: item.risk_level,
                    recommendation: item.contributing_factors.join(", "),
                    recommendationType: item.recommended_action,
                    action_details: item.action_details,
                }))

                setWasteAlerts(alerts)
            } catch (err) {
                console.error("Error fetching waste risk:", err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchWasteRisk()
    }, [])

    const totalRisk = wasteAlerts.reduce((sum, alert) => sum + alert.estimatedLoss, 0)
    const highRiskCount = wasteAlerts.filter((a) => a.riskLevel === "high" || a.riskLevel === "critical").length

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
                {!loading && !error && (
                    <ScrollArea className="h-[380px]">
                        <div className="space-y-2 p-4 pt-0">
                            {wasteAlerts.map((alert) => {
                                const RecIcon = recommendationIcons[alert.recommendationType]
                                return (
                                    <div
                                        key={alert.id}
                                        className={cn(
                                            "rounded-lg border border-border bg-background p-3 border-l-4 transition-colors hover:bg-muted/50",
                                            riskConfig[alert.riskLevel].border,
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-foreground truncate">{alert.product}</p>
                                                    <Badge className={riskConfig[alert.riskLevel].color}>{alert.riskLevel}</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    SKU: {alert.sku} • Qty: {alert.quantity} units
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="flex items-center gap-1 text-red-600">
                                                    <Clock className="h-3 w-3" />
                                                    <span className="text-sm font-medium">{alert.daysUntilExpiry}d</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">LKR {alert.estimatedLoss.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        {/* AI Recommendation */}
                                        <div className="mt-2 flex items-center gap-2 rounded-md bg-primary/5 p-2">
                                            <Lightbulb className="h-4 w-4 text-primary shrink-0" />
                                            <p className="text-xs text-foreground flex-1">{alert.recommendation}</p>
                                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                                                Apply
                                            </Button>
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
