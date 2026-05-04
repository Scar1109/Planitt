import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Package, Search, AlertCircle, CheckCircle, Clock } from "lucide-react"

const inventoryData = [
    {
        id: "1",
        sku: "DAI-001",
        name: "Fresh Milk 1L",
        category: "Dairy",
        currentStock: 45,
        reorderPoint: 30,
        maxCapacity: 100,
        daysUntilExpiry: 5,
        status: "healthy",
        forecastDemand: 120,
        lastUpdated: "2 mins ago",
    },
    {
        id: "2",
        sku: "DAI-012",
        name: "Greek Yogurt 500g",
        category: "Dairy",
        currentStock: 15,
        reorderPoint: 25,
        maxCapacity: 60,
        daysUntilExpiry: 3,
        status: "critical",
        forecastDemand: 40,
        lastUpdated: "5 mins ago",
    },
    {
        id: "3",
        sku: "BEV-034",
        name: "Mineral Water 500ml",
        category: "Beverages",
        currentStock: 180,
        reorderPoint: 50,
        maxCapacity: 200,
        daysUntilExpiry: null,
        status: "overstock",
        forecastDemand: 150,
        lastUpdated: "10 mins ago",
    },
    {
        id: "4",
        sku: "BAK-008",
        name: "White Bread Loaf",
        category: "Bakery",
        currentStock: 22,
        reorderPoint: 20,
        maxCapacity: 50,
        daysUntilExpiry: 2,
        status: "low",
        forecastDemand: 35,
        lastUpdated: "1 min ago",
    },
    {
        id: "5",
        sku: "PRD-045",
        name: "Banana Bunch",
        category: "Produce",
        currentStock: 65,
        reorderPoint: 40,
        maxCapacity: 100,
        daysUntilExpiry: 4,
        status: "healthy",
        forecastDemand: 80,
        lastUpdated: "8 mins ago",
    },
]

const statusConfig = {
    healthy: {
        label: "Healthy",
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
        icon: CheckCircle,
    },
    low: {
        label: "Low Stock",
        color: "bg-[#17A2B8]/10 text-[#1B4F72] dark:bg-[#17A2B8]/10 dark:text-[#1B4F72]",
        icon: AlertCircle,
    },
    critical: {
        label: "Critical",
        color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
        icon: AlertCircle,
    },
    overstock: {
        label: "Overstock",
        color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
        icon: Package,
    },
}

export function InventoryOverview() {
    const [searchQuery, setSearchQuery] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("all")
    const [statusFilter, setStatusFilter] = useState("all")

    const filteredData = inventoryData.filter((item) => {
        const matchesSearch =
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = categoryFilter === "all" || item.category.toLowerCase() === categoryFilter
        const matchesStatus = statusFilter === "all" || item.status === statusFilter
        return matchesSearch && matchesCategory && matchesStatus
    })

    return (
        <Card className="border-border">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <Package className="h-5 w-5 text-primary" />
                            Inventory Overview
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">Real-time stock levels with AI-driven insights</p>
                    </div>
                    <Button variant="outline" size="sm">
                        View All Products
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or SKU..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="dairy">Dairy</SelectItem>
                            <SelectItem value="beverages">Beverages</SelectItem>
                            <SelectItem value="bakery">Bakery</SelectItem>
                            <SelectItem value="produce">Produce</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="healthy">Healthy</SelectItem>
                            <SelectItem value="low">Low Stock</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="overstock">Overstock</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <div className="rounded-lg border border-border">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[100px]">SKU</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Stock Level</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.map((item) => {
                                const StatusIcon = statusConfig[item.status].icon
                                const stockPercentage = (item.currentStock / item.maxCapacity) * 100

                                return (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono text-sm text-muted-foreground">{item.sku}</TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-foreground">{item.name}</p>
                                                <p className="text-xs text-muted-foreground">{item.category}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-foreground">
                                                        {item.currentStock} / {item.maxCapacity}
                                                    </span>
                                                    <span className="text-muted-foreground text-xs">ROP: {item.reorderPoint}</span>
                                                </div>
                                                <Progress value={stockPercentage} className="h-2" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {item.daysUntilExpiry !== null ? (
                                                <div className="flex items-center gap-1">
                                                    <Clock
                                                        className={`h-4 w-4 ${item.daysUntilExpiry <= 3 ? "text-red-500" : "text-muted-foreground"}`}
                                                    />
                                                    <span
                                                        className={item.daysUntilExpiry <= 3 ? "text-red-600 font-medium" : "text-muted-foreground"}
                                                    >
                                                        {item.daysUntilExpiry}d
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">N/A</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={statusConfig[item.status].color}>
                                                <StatusIcon className="h-3 w-3 mr-1" />
                                                {statusConfig[item.status].label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">
                                                View Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
