import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, TrendingUp, TrendingDown, Minus, Download, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/api/client"

// Product metadata
const productInfo = {
    "DAI-001": { name: "Fresh Milk 1L", category: "Dairy" },
    "BEV-034": { name: "Mineral Water 500ml", category: "Beverages" },
    "BAK-008": { name: "White Bread Loaf", category: "Bakery" },
    "PRD-045": { name: "Banana Bunch", category: "Produce" },
    "FRZ-022": { name: "Ice Cream 1L", category: "Frozen" },
    "DAI-012": { name: "Greek Yogurt 500g", category: "Dairy" },
}

export function ProductForecasts() {
    const [search, setSearch] = useState("")
    const [category, setCategory] = useState("all")
    const [productForecasts, setProductForecasts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchBatchForecasts = async () => {
            try {
                setLoading(true)
                setError(null)

                const productIds = Object.keys(productInfo)
                const response = await api.getBatchForecast("STORE-001", productIds, 7)

                // Transform batch results to table format
                const forecasts = response.results.map((result) => {
                    const product = productInfo[result.product_id]
                    const thisWeek = result.forecasts[0]?.forecast || 0
                    const nextWeek = result.forecasts[6]?.forecast || 0
                    const change = ((nextWeek - thisWeek) / thisWeek) * 100

                    return {
                        id: result.product_id,
                        sku: result.product_id,
                        name: product?.name || result.product_id,
                        category: product?.category || "Unknown",
                        currentWeek: Math.round(thisWeek),
                        nextWeek: Math.round(nextWeek),
                        change: Math.round(change * 10) / 10,
                        confidence: 85 + Math.floor(Math.random() * 15), // Mock confidence
                        trend: change > 5 ? "up" : change < -5 ? "down" : "stable",
                        factors: change > 10 ? ["Weather", "Weekend"] : change > 0 ? ["Holiday"] : ["Rainy day"],
                    }
                })

                setProductForecasts(forecasts)
            } catch (err) {
                console.error("Error fetching batch forecasts:", err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchBatchForecasts()
    }, [])

    const filteredData = productForecasts.filter((p) => {
        const matchesSearch =
            p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = category === "all" || p.category.toLowerCase() === category
        return matchesSearch && matchesCategory
    })

    return (
        <Card className="border-border">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Product-Level Forecasts {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    </CardTitle>
                    <div className="flex items-center gap-3">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search products..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="dairy">Dairy</SelectItem>
                                <SelectItem value="beverages">Beverages</SelectItem>
                                <SelectItem value="bakery">Bakery</SelectItem>
                                <SelectItem value="produce">Produce</SelectItem>
                                <SelectItem value="frozen">Frozen</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {loading && (
                    <div className="h-[400px] flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
                {error && (
                    <div className="h-[400px] flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-red-500 font-medium">Error loading forecasts</p>
                            <p className="text-sm text-muted-foreground mt-1">{error}</p>
                        </div>
                    </div>
                )}
                {!loading && !error && (
                    <div className="rounded-lg border border-border">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-right">This Week</TableHead>
                                    <TableHead className="text-right">Next Week</TableHead>
                                    <TableHead className="text-right">Change</TableHead>
                                    <TableHead className="text-right">Confidence</TableHead>
                                    <TableHead>Factors</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-foreground">{product.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {product.sku} • {product.category}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-foreground">
                                            {product.currentWeek.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-foreground">
                                            {product.nextWeek.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div
                                                className={cn(
                                                    "flex items-center justify-end gap-1 font-medium",
                                                    product.change > 0
                                                        ? "text-emerald-600"
                                                        : product.change < 0
                                                            ? "text-red-600"
                                                            : "text-muted-foreground",
                                                )}
                                            >
                                                {product.trend === "up" && <TrendingUp className="h-4 w-4" />}
                                                {product.trend === "down" && <TrendingDown className="h-4 w-4" />}
                                                {product.trend === "stable" && <Minus className="h-4 w-4" />}
                                                {product.change > 0 ? "+" : ""}
                                                {product.change}%
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge
                                                variant="secondary"
                                                className={cn(
                                                    product.confidence >= 90
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                                                        : product.confidence >= 80
                                                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                                                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                                                )}
                                            >
                                                {product.confidence}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {product.factors.map((factor) => (
                                                    <span key={factor} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                                        {factor}
                                                    </span>
                                                ))}
                                                {product.factors.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
