import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Package, AlertTriangle, RotateCcw, DollarSign } from "lucide-react"
import api from "@/api/client"

export function InventoryStats() {
    const [stats, setStats] = useState([
        {
            label: "Total Products",
            value: "...",
            change: "",
            icon: Package,
            color: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
        },
        {
            label: "Low Stock Items",
            value: "...",
            change: "",
            icon: AlertTriangle,
            color: "text-[#17A2B8] bg-[#17A2B8]/10 dark:bg-[#17A2B8]/10 dark:text-[#1B4F72]",
        },
        {
            label: "Total Sold (Latest)",
            value: "...",
            change: "",
            icon: RotateCcw,
            color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400",
        },
        {
            label: "Total Stock Units",
            value: "...",
            change: "",
            icon: DollarSign,
            color: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
        },
    ]);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await api.getInventorySummary();
                if (res.success && res.summary) {
                    const s = res.summary;
                    setStats([
                        {
                            label: "Total Products",
                            value: s.totalProducts?.toLocaleString() || "0",
                            change: "Monitoring Active SKUs",
                            icon: Package,
                            color: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
                        },
                        {
                            label: "Low Stock Items",
                            value: s.lowStockCount?.toLocaleString() || "0",
                            change: `${s.outOfStock || 0} out of stock`,
                            icon: AlertTriangle,
                            color: "text-[#17A2B8] bg-[#17A2B8]/10 dark:bg-[#17A2B8]/10 dark:text-[#1B4F72]",
                        },
                        {
                            label: "Total Sold (Latest day)",
                            value: s.totalSold?.toLocaleString() || "0",
                            change: `Discarded: ${s.totalDiscarded || 0}`,
                            icon: RotateCcw,
                            color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400",
                        },
                        {
                            label: "Total Stock Units",
                            value: s.totalStock?.toLocaleString() || "0",
                            change: `Avg: ${Math.round(s.avgClosingStock || 0)} per SKU`,
                            icon: DollarSign,
                            color: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
                        },
                    ]);
                }
            } catch (err) {
                console.error("Failed to fetch stats", err);
            }
        }
        fetchStats();
    }, []);

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => (
                <Card key={i} className="border-border">
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
