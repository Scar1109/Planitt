import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, TrendingUp, TrendingDown, Minus, Download, Loader2, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/api/client"

export function ProductForecasts() {
    const [search, setSearch] = useState("")
    const [category, setCategory] = useState("all")
    const [productForecasts, setProductForecasts] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchProductForecasts = async () => {
            try {
                setLoading(true)
                setError(null)

                // 1. Fetch products from MongoDB
                const productsResponse = await api.getProducts(null, null, 20) // Get first 20 products

                if (!productsResponse.success || !productsResponse.data?.length) {
                    setError("No products found in database")
                    return
                }

                const products = productsResponse.data

                // Extract unique categories
                const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))]
                setCategories(uniqueCategories)

                // 2. Fetch forecast for each product (in parallel, max 10 at a time)
                const forecastPromises = products.slice(0, 10).map(async (product) => {
                    try {
                        const forecast = await api.getForecast(product.sku, "STORE-001", 14)
                        return { product, forecast, error: null }
                    } catch (err) {
                        return { product, forecast: null, error: err.message }
                    }
                })

                const results = await Promise.all(forecastPromises)

                // 3. Transform to table format
                const forecasts = results
                    .filter(r => r.forecast && r.forecast.forecasts?.length >= 7)
                    .map((result) => {
                        const { product, forecast } = result
                        const thisWeek = forecast.forecasts[0]?.forecast || 0
                        const nextWeek = forecast.forecasts[6]?.forecast || 0
                        const change = thisWeek > 0 ? ((nextWeek - thisWeek) / thisWeek) * 100 : 0

                        // Calculate confidence based on RMSE from metrics
                        const rmse = forecast.accuracy_metrics?.rmse || 5
                        const confidence = Math.round(Math.max(50, Math.min(99, 100 - rmse * 5)))

                        return {
                            id: product.sku,
                            sku: product.sku,
                            name: product.productName || product.sku,
                            category: product.category || "Unknown",
                            currentWeek: Math.round(thisWeek),
                            nextWeek: Math.round(nextWeek),
                            change: Math.round(change * 10) / 10,
                            confidence,
                            trend: change > 5 ? "up" : change < -5 ? "down" : "stable",
                        }
                    })

                setProductForecasts(forecasts)

                if (forecasts.length === 0) {
                    setError("No forecasts available. The model may still be processing.")
                }
            } catch (err) {
                console.error("Error fetching product forecasts:", err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchProductForecasts()
    }, [])

    const filteredData = productForecasts.filter((p) => {
        const matchesSearch =
            p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = category === "all" || p.category.toLowerCase() === category.toLowerCase()
        return matchesSearch && matchesCategory
    })

    return (
        <Card className="bg-white border-slate-100 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-4 border-b border-slate-100 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <CardTitle className="flex items-center gap-2.5 text-slate-800">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#17A2B8]/10">
                            <Package className="h-4 w-4 text-[#1B4F72]" />
                        </div>
                        Product-Level Forecasts
                        {loading && <Loader2 className="h-4 w-4 animate-spin text-[#1B4F72]" />}
                    </CardTitle>
                    <div className="flex items-center gap-3">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search products..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 border-slate-200 focus:border-[#17A2B8] focus:ring-[#17A2B8]/10"
                            />
                        </div>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="w-[160px] border-slate-200">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map(cat => (
                                    <SelectItem key={cat} value={cat.toLowerCase()}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" className="border-slate-200 text-slate-600 hover:bg-slate-50">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-4 bg-white">
                {loading && (
                    <div className="h-[350px] flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-[#1B4F72]" />
                            <p className="text-sm text-slate-500">Loading product forecasts...</p>
                        </div>
                    </div>
                )}
                {error && !loading && (
                    <div className="h-[350px] flex items-center justify-center">
                        <div className="text-center">
                            <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                                <TrendingDown className="h-6 w-6 text-red-500" />
                            </div>
                            <p className="text-red-600 font-medium">Error loading forecasts</p>
                            <p className="text-sm text-slate-500 mt-1 max-w-sm">{error}</p>
                        </div>
                    </div>
                )}
                {!loading && !error && productForecasts.length === 0 && (
                    <div className="h-[350px] flex items-center justify-center">
                        <div className="text-center">
                            <Package className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">No forecasts available</p>
                            <p className="text-sm text-slate-400 mt-1">Select products to generate forecasts</p>
                        </div>
                    </div>
                )}
                {!loading && !error && productForecasts.length > 0 && (
                    <div className="rounded-lg border border-slate-100 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 hover:bg-slate-50">
                                    <TableHead className="text-slate-600 font-medium">Product</TableHead>
                                    <TableHead className="text-right text-slate-600 font-medium">This Week</TableHead>
                                    <TableHead className="text-right text-slate-600 font-medium">Next Week</TableHead>
                                    <TableHead className="text-right text-slate-600 font-medium">Change</TableHead>
                                    <TableHead className="text-right text-slate-600 font-medium">Confidence</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.map((product) => (
                                    <TableRow key={product.id} className="hover:bg-slate-50/50">
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-slate-800 line-clamp-1">{product.name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {product.sku} • {product.category}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-slate-800">
                                            {product.currentWeek.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-slate-800">
                                            {product.nextWeek.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div
                                                className={cn(
                                                    "flex items-center justify-end gap-1 font-medium",
                                                    product.change > 0
                                                        ? "text-emerald-600"
                                                        : product.change < 0
                                                            ? "text-red-500"
                                                            : "text-slate-500",
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
                                                    "text-xs",
                                                    product.confidence >= 85
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                        : product.confidence >= 70
                                                            ? "bg-[#17A2B8]/10 text-[#1B4F72] border-[#17A2B8]/20"
                                                            : "bg-slate-100 text-slate-600 border-slate-200",
                                                )}
                                            >
                                                {product.confidence}%
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {filteredData.length === 0 && (
                            <div className="py-8 text-center text-slate-500">
                                No products match your search criteria
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
