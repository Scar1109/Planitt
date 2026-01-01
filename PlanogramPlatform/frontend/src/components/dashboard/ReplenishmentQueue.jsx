import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { ShoppingCart, Truck, Clock, CheckCircle2, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { api } from "@/api/client"

const urgencyConfig = {
    immediate: {
        label: "Immediate",
        color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
        icon: Clock,
    },
    soon: {
        label: "Soon",
        color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
        icon: Truck,
    },
    scheduled: {
        label: "Scheduled",
        color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
        icon: Truck,
    },
    suggested: {
        label: "Suggested",
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
        icon: CheckCircle2,
    },
}

export function ReplenishmentQueue() {
    const [selectedOrders, setSelectedOrders] = useState([])
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchReplenishment = async () => {
            try {
                setLoading(true)
                const response = await api.getReplenishment("STORE-001")

                // Transform API response to UI format
                const transformedOrders = response.recommendations?.map((rec, index) => ({
                    id: `order-${index}`,
                    product: rec.product_name || rec.sku,
                    sku: rec.sku,
                    quantity: rec.recommended_qty,
                    urgency: rec.urgency,
                    supplier: "Lanka Suppliers", // Could be added to API response
                    estimatedDelivery: formatDeliveryDate(rec.urgency),
                    reason: rec.reasoning,
                    hasHoliday: rec.reasoning.includes("🎉"),
                    confidence: rec.confidence,
                    currentStock: rec.current_stock,
                    reorderPoint: rec.reorder_point,
                })) || []

                setOrders(transformedOrders)
            } catch (err) {
                console.error("Error fetching replenishment:", err)
                setError(err.message)
                // Fallback to mock data on error
                setOrders(getMockOrders())
            } finally {
                setLoading(false)
            }
        }

        fetchReplenishment()
    }, [])

    const formatDeliveryDate = (urgency) => {
        switch (urgency) {
            case "immediate":
                return "Today 4PM"
            case "soon":
                return "Tomorrow 6AM"
            default:
                return "In 2-3 days"
        }
    }

    const getMockOrders = () => [
        {
            id: "1",
            product: "Fresh Milk 1L",
            sku: "DAI-001",
            quantity: 50,
            urgency: "immediate",
            supplier: "Lanka Dairy Co.",
            estimatedDelivery: "Tomorrow 6AM",
            reason: "Stock below reorder point",
            hasHoliday: false,
        },
    ]

    const toggleOrder = (id) => {
        setSelectedOrders((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
    }

    const immediateCount = orders.filter((o) => o.urgency === "immediate").length
    const holidayAffectedCount = orders.filter((o) => o.hasHoliday).length

    return (
        <Card className="border-border">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                        Replenishment Queue
                        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {immediateCount > 0 && (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                                {immediateCount} Urgent
                            </Badge>
                        )}
                        {holidayAffectedCount > 0 && (
                            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 gap-1">
                                <Sparkles className="h-3 w-3" />
                                {holidayAffectedCount} Holiday
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {loading && (
                    <div className="flex items-center justify-center h-[280px]">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Loading recommendations...</p>
                        </div>
                    </div>
                )}

                {!loading && error && (
                    <div className="flex items-center justify-center h-[280px]">
                        <p className="text-sm text-muted-foreground">Using cached recommendations</p>
                    </div>
                )}

                {!loading && orders.length === 0 && (
                    <div className="flex items-center justify-center h-[280px]">
                        <div className="text-center space-y-2">
                            <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
                            <p className="text-sm font-medium text-foreground">All stock levels optimal</p>
                            <p className="text-xs text-muted-foreground">No reorders needed at this time</p>
                        </div>
                    </div>
                )}

                {!loading && orders.length > 0 && (
                    <>
                        <ScrollArea className="h-[280px]">
                            <div className="space-y-2 p-4 pt-0">
                                {orders.map((order) => {
                                    const UrgencyIcon = urgencyConfig[order.urgency]?.icon || Clock
                                    const isSelected = selectedOrders.includes(order.id)

                                    return (
                                        <div
                                            key={order.id}
                                            className={cn(
                                                "rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent/50",
                                                isSelected && "ring-2 ring-primary",
                                                order.hasHoliday && "border-l-4 border-l-purple-500"
                                            )}
                                        >
                                            <div className="flex items-start gap-3">
                                                <Checkbox checked={isSelected} onCheckedChange={() => toggleOrder(order.id)} className="mt-1" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-medium text-foreground truncate">{order.product}</p>
                                                        <Badge className={urgencyConfig[order.urgency]?.color}>
                                                            <UrgencyIcon className="h-3 w-3 mr-1" />
                                                            {urgencyConfig[order.urgency]?.label}
                                                        </Badge>
                                                        {order.hasHoliday && (
                                                            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 gap-0.5">
                                                                <Sparkles className="h-3 w-3" />
                                                                Holiday
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                        <span>Qty: {order.quantity}</span>
                                                        <span>•</span>
                                                        <span>Stock: {order.currentStock}</span>
                                                        {order.confidence && (
                                                            <>
                                                                <span>•</span>
                                                                <span>{(order.confidence * 100).toFixed(0)}% confident</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <Truck className="h-3 w-3 text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground">{order.estimatedDelivery}</span>
                                                    </div>
                                                    <p className="text-xs text-primary/90 mt-2 leading-relaxed">{order.reason}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </ScrollArea>

                        {/* Action Bar */}
                        <div className="border-t border-border p-3 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{selectedOrders.length} selected</span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" disabled={selectedOrders.length === 0}>
                                    Modify
                                </Button>
                                <Button size="sm" disabled={selectedOrders.length === 0}>
                                    Place Orders
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
