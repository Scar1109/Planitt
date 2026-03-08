import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Clock, TrendingUp, TrendingDown, Eye, Edit, Trash2, ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"
import api from "@/api/client"

const statusConfig = {
    healthy: { label: "Healthy", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
    low: { label: "Low", color: "bg-[#17A2B8]/10 text-[#1B4F72] dark:bg-[#17A2B8]/10 dark:text-[#1B4F72]" },
    critical: { label: "Critical", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
    overstock: { label: "Overstock", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
}

const velocityConfig = {
    fast: { label: "Fast", color: "text-emerald-600" },
    medium: { label: "Medium", color: "text-[#17A2B8]" },
    slow: { label: "Slow", color: "text-muted-foreground" },
}

export function InventoryTable() {
    const navigate = useNavigate()
    const [selectedRows, setSelectedRows] = useState([])
    const [products, setProducts] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchInventory() {
            try {
                // Fetching inventory from STORE-001 by default
                const res = await api.getInventoryForStore("STORE-001");
                if (res.success && res.data) {
                    const mappedProducts = res.data.map((item, index) => {
                        // Mocking some dynamic states based on real stock if not present
                        const stock = item.closingStock || 0;
                        const maxCap = item.maxShelfCapacityUnits || 100;
                        const rop = item.reorderPoint || Math.max(10, Math.floor(maxCap * 0.2));
                        let statusStr = "healthy";
                        let trend = "stable";
                        let vel = "medium";

                        if (stock <= 5) {
                            statusStr = "critical";
                            trend = "down";
                            vel = "fast";
                        } else if (stock <= rop) {
                            statusStr = "low";
                            trend = "down";
                        } else if (stock > maxCap * 0.8) {
                            statusStr = "overstock";
                            trend = "up";
                        }

                        if (item.soldQty > 10) vel = "fast";
                        else if (item.soldQty < 2) vel = "slow";

                        return {
                            id: item._id || index.toString(),
                            sku: item.sku || item.productId,
                            name: item.productName || item.sku || "Unknown Product",
                            category: item.category || "General",
                            currentStock: stock,
                            reorderPoint: rop,
                            maxCapacity: maxCap > stock ? maxCap : stock + 20, // ensure UI logic makes sense
                            shelfLife: item.typicalShelfLifeDays || null,
                            daysUntilExpiry: item.oldestAgeDays ? Math.max(0, (item.typicalShelfLifeDays || 30) - item.oldestAgeDays) : null,
                            unitCost: item.unitCostLKR || 0,
                            velocity: vel,
                            status: statusStr,
                            trend: trend,
                        };
                    });
                    setProducts(mappedProducts);
                }
            } catch (err) {
                console.error("Failed to load inventory for table", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchInventory();
    }, []);

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
                                    <Checkbox checked={products.length > 0 && selectedRows.length === products.length} onCheckedChange={toggleAll} />
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
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        Loading inventory data...
                                    </TableCell>
                                </TableRow>
                            ) : products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        No inventory found.
                                    </TableCell>
                                </TableRow>
                            ) : products.map((product) => {
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
                                                <Progress value={Math.min(100, stockPercentage)} className="h-1.5" />
                                                <p className="text-xs text-muted-foreground">ROP: {product.reorderPoint}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={cn("text-sm font-medium", velocityConfig[product.velocity]?.color)}>
                                                {velocityConfig[product.velocity]?.label}
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
                                            <Badge className={statusConfig[product.status]?.color || statusConfig.healthy.color}>
                                                {statusConfig[product.status]?.label || "Healthy"}
                                            </Badge>
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
                                                        View Data
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => navigate(`/forecasting?sku=${product.sku}`)}>
                                                        <ShoppingCart className="h-4 w-4 mr-2" />
                                                        Forecast Reorder
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

