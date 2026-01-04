import { Card, CardContent } from "@/components/ui/card"
import { Package, AlertTriangle, RotateCcw, DollarSign } from "lucide-react"

const stats = [
    {
        label: "Total SKUs",
        value: "1,247",
        change: "+12 this week",
        icon: Package,
        color: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
    },
    {
        label: "Low Stock Items",
        value: "34",
        change: "-5 from yesterday",
        icon: AlertTriangle,
        color: "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400",
    },
    {
        label: "Inventory Turnover",
        value: "12.4x",
        change: "+8% vs target",
        icon: RotateCcw,
        color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400",
    },
    {
        label: "Total Value",
        value: "LKR 2.4M",
        change: "+5.2% this week",
        icon: DollarSign,
        color: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
    },
]

export function InventoryStats() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
                <Card key={stat.label} className="border-border">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-lg ${stat.color}`}>
                                <stat.icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{stat.label}</p>
                                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                                <p className="text-xs text-muted-foreground">{stat.change}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
