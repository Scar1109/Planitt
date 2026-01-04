import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Clock, TrendingUp, TrendingDown, Eye, Edit, Trash2, ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"

const products = [
    {
        id: "1",
        sku: "DAI-001",
        name: "Fresh Milk 1L",
        category: "Dairy",
        currentStock: 45,
        reorderPoint: 30,
        maxCapacity: 100,
        shelfLife: 7,
        daysUntilExpiry: 5,
        unitCost: 320,
        velocity: "fast",
        status: "healthy",
        trend: "up",
    },
    {
        id: "2",
        sku: "DAI-012",
        name: "Greek Yogurt 500g",
        category: "Dairy",
        currentStock: 15,
        reorderPoint: 25,
        maxCapacity: 60,
        shelfLife: 14,
        daysUntilExpiry: 3,
        unitCost: 150,
        velocity: "medium",
        status: "critical",
        trend: "down",
    },
    {
        id: "3",
        sku: "BEV-034",
        name: "Mineral Water 500ml",
        category: "Beverages",
        currentStock: 180,
        reorderPoint: 50,
        maxCapacity: 200,
        shelfLife: null,
        daysUntilExpiry: null,
        unitCost: 45,
        velocity: "fast",
        status: "overstock",
        trend: "up",
    },
    {
        id: "4",
        sku: "BAK-008",
        name: "White Bread Loaf",
        category: "Bakery",
        currentStock: 22,
        reorderPoint: 20,
        maxCapacity: 50,
        shelfLife: 3,
        daysUntilExpiry: 2,
        unitCost: 85,
        velocity: "fast",
        status: "low",
        trend: "stable",
    },
    {
        id: "5",
        sku: "PRD-045",
        name: "Banana Bunch",
        category: "Produce",
        currentStock: 65,
        reorderPoint: 40,
        maxCapacity: 100,
        shelfLife: 5,
        daysUntilExpiry: 4,
        unitCost: 180,
        velocity: "fast",
        status: "healthy",
        trend: "up",
    },
    {
        id: "6",
        sku: "FRZ-022",
        name: "Ice Cream 1L",
        category: "Frozen",
        currentStock: 28,
        reorderPoint: 15,
        maxCapacity: 40,
        shelfLife: 90,
        daysUntilExpiry: 45,
        unitCost: 450,
        velocity: "medium",
        status: "healthy",
        trend: "stable",
    },
    {
        id: "7",
        sku: "DRY-089",
        name: "Basmati Rice 5kg",
        category: "Dry Goods",
        currentStock: 35,
        reorderPoint: 20,
        maxCapacity: 60,
        shelfLife: null,
        daysUntilExpiry: null,
        unitCost: 1200,
        velocity: "slow",
        status: "healthy",
        trend: "stable",
    },
    {
        id: "8",
        sku: "BEV-056",
        name: "Orange Juice 1L",
        category: "Beverages",
        currentStock: 12,
        reorderPoint: 20,
        maxCapacity: 50,
        shelfLife: 30,
        daysUntilExpiry: 8,
        unitCost: 280,
        velocity: "medium",
        status: "low",
        trend: "down",
    },
]

const statusConfig = {
    healthy: { label: "Healthy", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
    low: { label: "Low", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
    critical: { label: "Critical", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
    overstock: { label: "Overstock", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
}

const velocityConfig = {
    fast: { label: "Fast", color: "text-emerald-600" },
    medium: { label: "Medium", color: "text-amber-600" },
    slow: { label: "Slow", color: "text-muted-foreground" },
}

export function InventoryTable() {
    const [selectedRows, setSelectedRows] = useState([])

    const toggleRow = (id) => {
        setSelectedRows((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
    }

    const toggleAll = () => {
        if (selectedRows.length === products.length) {
            setSelectedRows([])
        } else {
            setSelectedRows(products.map((p) => p.id))
        }
    }

    return (
        <Card className="border-border">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-foreground">Product Inventory</CardTitle>
                    {selectedRows.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{selectedRows.length} selected</span>
                            <Button variant="outline" size="sm">
                                Bulk Edit
                            </Button>
                            <Button variant="outline" size="sm">
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Reorder Selected
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[50px]">
                                    <Checkbox checked={selectedRows.length === products.length} onCheckedChange={toggleAll} />
                                </TableHead>
                                <TableHead className="w-[100px]">SKU</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Stock Level</TableHead>
                                <TableHead>Velocity</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map((product) => {
                                const stockPercentage = (product.currentStock / product.maxCapacity) * 100
                                const isSelected = selectedRows.includes(product.id)

                                return (
                                    <TableRow key={product.id} className={cn(isSelected && "bg-muted/50")}>
                                        <TableCell>
                                            <Checkbox checked={isSelected} onCheckedChange={() => toggleRow(product.id)} />
                                        </TableCell>
                                        <TableCell className="font-mono text-sm text-muted-foreground">{product.sku}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div>
                                                    <p className="font-medium text-foreground">{product.name}</p>
                                                    <p className="text-xs text-muted-foreground">{product.category}</p>
                                                </div>
                                                {product.trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                                                {product.trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="w-32 space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-foreground">{product.currentStock}</span>
                                                    <span className="text-muted-foreground text-xs">/ {product.maxCapacity}</span>
                                                </div>
                                                <Progress value={stockPercentage} className="h-1.5" />
                                                <p className="text-xs text-muted-foreground">ROP: {product.reorderPoint}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={cn("text-sm font-medium", velocityConfig[product.velocity].color)}>
                                                {velocityConfig[product.velocity].label}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {product.daysUntilExpiry !== null ? (
                                                <div className="flex items-center gap-1">
                                                    <Clock
                                                        className={cn(
                                                            "h-4 w-4",
                                                            product.daysUntilExpiry <= 3 ? "text-red-500" : "text-muted-foreground",
                                                        )}
                                                    />
                                                    <span
                                                        className={cn(
                                                            "text-sm",
                                                            product.daysUntilExpiry <= 3 ? "text-red-600 font-medium" : "text-muted-foreground",
                                                        )}
                                                    >
                                                        {product.daysUntilExpiry}d
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">N/A</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={statusConfig[product.status].color}>{statusConfig[product.status].label}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit Product
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <ShoppingCart className="h-4 w-4 mr-2" />
                                                        Create Order
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive">
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
