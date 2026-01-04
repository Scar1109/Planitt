import { Card, CardContent } from "@/components/ui/card"
import {
    TrendingUp,
    TrendingDown,
    Package,
    AlertTriangle,
    ShoppingCart,
    DollarSign,
    Percent,
    RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"

function KpiCard({ title, value, change, changeLabel, icon, trend, color }) {
    const colorClasses = {
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
        green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
        amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
        red: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
    }

    return (
        <Card className="border-border">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="text-3xl font-semibold text-foreground">{value}</p>
                        <div className="flex items-center gap-1 text-sm">
                            {trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                            {trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
                            <span
                                className={cn(
                                    trend === "up" && "text-emerald-600",
                                    trend === "down" && "text-red-600",
                                    trend === "neutral" && "text-muted-foreground",
                                )}
                            >
                                {change > 0 ? "+" : ""}
                                {change}%
                            </span>
                            <span className="text-muted-foreground">{changeLabel}</span>
                        </div>
                    </div>
                    <div className={cn("p-3 rounded-xl", colorClasses[color])}>{icon}</div>
                </div>
            </CardContent>
        </Card>
    )
}

export function KpiCards() {
    const kpis = [
        {
            title: "Total Inventory Value",
            value: "LKR 2.4M",
            change: 5.2,
            changeLabel: "vs last week",
            icon: <Package className="h-6 w-6" />,
            trend: "up",
            color: "blue",
        },
        {
            title: "Forecast Accuracy",
            value: "94.2%",
            change: 2.1,
            changeLabel: "improvement",
            icon: <Percent className="h-6 w-6" />,
            trend: "up",
            color: "green",
        },
        {
            title: "Waste Risk Items",
            value: "23",
            change: -15,
            changeLabel: "vs last week",
            icon: <AlertTriangle className="h-6 w-6" />,
            trend: "down",
            color: "amber",
        },
        {
            title: "Pending Orders",
            value: "8",
            change: 3,
            changeLabel: "new today",
            icon: <ShoppingCart className="h-6 w-6" />,
            trend: "neutral",
            color: "blue",
        },
        {
            title: "Est. Waste Savings",
            value: "LKR 45K",
            change: 22,
            changeLabel: "this month",
            icon: <DollarSign className="h-6 w-6" />,
            trend: "up",
            color: "green",
        },
        {
            title: "Stock Turnover",
            value: "12.4x",
            change: 8,
            changeLabel: "vs target",
            icon: <RefreshCw className="h-6 w-6" />,
            trend: "up",
            color: "green",
        },
    ]

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpis.map((kpi) => (
                <KpiCard key={kpi.title} {...kpi} />
            ))}
        </div>
    )
}
