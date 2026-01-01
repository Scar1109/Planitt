import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { LayoutGrid, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const shelfData = [
    {
        zone: "Zone A - Entrance",
        utilization: 92,
        recommendation: "decrease",
        topProducts: ["Mineral Water", "Soft Drinks"],
    },
    {
        zone: "Zone B - Dairy Aisle",
        utilization: 78,
        recommendation: "optimal",
        topProducts: ["Fresh Milk", "Yogurt"],
    },
    {
        zone: "Zone C - Bakery",
        utilization: 65,
        recommendation: "increase",
        topProducts: ["White Bread", "Pastries"],
    },
    {
        zone: "Zone D - Produce",
        utilization: 85,
        recommendation: "optimal",
        topProducts: ["Bananas", "Tomatoes"],
    },
]

const recommendationConfig = {
    increase: {
        label: "Add Space",
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
        icon: TrendingUp,
    },
    decrease: {
        label: "Reduce",
        color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
        icon: TrendingDown,
    },
    optimal: {
        label: "Optimal",
        color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
        icon: AlertCircle,
    },
}

export function ShelfSpaceAnalysis() {
    return (
        <Card className="border-border">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-foreground">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                    Shelf Space Analysis
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {shelfData.map((shelf) => {
                        const RecIcon = recommendationConfig[shelf.recommendation].icon
                        return (
                            <div key={shelf.zone} className="rounded-lg border border-border bg-background p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-foreground">{shelf.zone}</span>
                                    <Badge className={recommendationConfig[shelf.recommendation].color}>
                                        <RecIcon className="h-3 w-3 mr-1" />
                                        {recommendationConfig[shelf.recommendation].label}
                                    </Badge>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Utilization</span>
                                        <span className={cn("font-medium", shelf.utilization > 90 ? "text-amber-600" : "text-foreground")}>
                                            {shelf.utilization}%
                                        </span>
                                    </div>
                                    <Progress value={shelf.utilization} className="h-1.5" />
                                </div>
                                <div className="mt-2">
                                    <p className="text-xs text-muted-foreground">Top: {shelf.topProducts.join(", ")}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
