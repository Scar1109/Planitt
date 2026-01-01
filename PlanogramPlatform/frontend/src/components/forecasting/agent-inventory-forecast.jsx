import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ComposedChart,
    Bar,
} from "recharts"
import { Bot, TrendingUp, AlertTriangle, CheckCircle, Loader2, Sparkles, Search, ChevronDown, X } from "lucide-react"
import { api } from "@/api/client"

export function AgentInventoryForecast() {
    const [productsList, setProductsList] = useState([])
    const [totalProducts, setTotalProducts] = useState(0)
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [horizon, setHorizon] = useState(7)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [forecastData, setForecastData] = useState(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const dropdownRef = useRef(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Filter products based on search query
    const filteredProducts = productsList.filter(p => {
        const query = searchQuery.toLowerCase()
        return p.sku.toLowerCase().includes(query) ||
            (p.productName && p.productName.toLowerCase().includes(query)) ||
            (p.category && p.category.toLowerCase().includes(query))
    })

    // Get selected product details
    const selectedProductData = productsList.find(p => p.sku === selectedProduct)

    // Fetch products on mount
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                // Fetch all products from MongoDB (POS real-time data)
                const response = await api.getProducts(null, null, 2000);
                if (response.success && response.data) {
                    setProductsList(response.data);
                    setTotalProducts(response.total || response.data.length);
                    // Select first product if available and none selected
                    // Note: selectedProduct is now initialized to null to trigger this
                    if (response.data.length > 0) {
                        setSelectedProduct(prev => prev || response.data[0].sku);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch products from database:", err);
                setError("Failed to load products from database. Please ensure MongoDB is connected.");
                setProductsList([]);
            }
        };
        fetchProducts();
    }, []);

    // Fetch agent forecast when parameters change
    useEffect(() => {
        const fetchAgentForecast = async () => {
            // Don't fetch if product not selected yet
            if (!selectedProduct) {
                console.log("⏸️ Waiting for product selection...");
                return;
            }

            try {
                setLoading(true)
                setError(null)

                const response = await api.getAgentInventoryForecast(
                    selectedProduct,
                    "default",  // store not used
                    horizon
                )

                setForecastData(response)
                console.log("✅ Agent forecast loaded:", response)
            } catch (err) {
                console.error("Error fetching agent forecast:", err)
                setError(err instanceof Error ? err.message : "Unknown error")
            } finally {
                setLoading(false)
            }
        }

        fetchAgentForecast()
    }, [selectedProduct, horizon])


    // Parse the days from the message text
    const parseChartData = (message) => {
        if (!message) return []

        const dayRegex = /- Day (\d+): (\d+) units/g
        const matches = [...message.matchAll(dayRegex)]

        return matches.map(match => ({
            day: `Day ${match[1]}`,
            units: parseInt(match[2])
        }))
    }

    // Get recommendation badge styling
    const getRecommendationBadge = (recommendation) => {
        switch (recommendation?.toLowerCase()) {
            case 'monitor':
                return {
                    variant: "outline",
                    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300",
                    icon: AlertTriangle
                }
            case 'restock':
                return {
                    variant: "outline",
                    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300",
                    icon: TrendingUp
                }
            case 'sufficient':
                return {
                    variant: "outline",
                    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300",
                    icon: CheckCircle
                }
            default:
                return {
                    variant: "outline",
                    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300",
                    icon: Bot
                }
        }
    }

    const chartData = forecastData?.success ? parseChartData(forecastData.message) : []
    const recommendationBadge = forecastData?.data?.recommendation
        ? getRecommendationBadge(forecastData.data.recommendation)
        : null

    const BadgeIcon = recommendationBadge?.icon || Bot

    return (
        <Card className="overflow-visible">
            <CardHeader className="pb-4 border-b border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                <Bot className="h-4 w-4 text-primary" />
                            </div>
                            <span>AI Agent Inventory Forecast</span>
                            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Autonomous agent-based demand predictions with intelligent recommendations
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Custom Searchable Product Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center justify-between gap-2 rounded-xl border border-input bg-background/80 backdrop-blur-sm px-4 py-2.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-w-[280px] max-w-[320px] h-10 hover:bg-accent/30 hover:border-primary/30 transition-all duration-200 shadow-sm"
                            >
                                <span className="truncate text-left flex-1 font-medium">
                                    {selectedProductData
                                        ? selectedProductData.productName || selectedProductData.sku
                                        : "Select Product..."}
                                </span>
                                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-primary' : ''}`} />
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute z-50 mt-2 w-[380px] rounded-xl border border-border/50 bg-popover/95 backdrop-blur-md shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 overflow-hidden"
                                    style={{ boxShadow: 'var(--shadow-lg), 0 0 0 1px hsl(var(--border) / 0.1)' }}>
                                    {/* Search Input */}
                                    <div className="p-3 border-b border-border/50 bg-muted/30">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="text"
                                                placeholder="Search by SKU, name, or category..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-9 pr-9 h-10 text-sm rounded-lg border-border/50 bg-background/80 focus:bg-background transition-colors"
                                                autoFocus
                                            />
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery("")}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-md hover:bg-muted"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Products List */}
                                    <div className="max-h-[320px] overflow-y-auto p-2">
                                        {filteredProducts.length > 0 ? (
                                            <div className="space-y-1">
                                                {filteredProducts.map((p) => (
                                                    <button
                                                        key={p.sku}
                                                        onClick={() => {
                                                            setSelectedProduct(p.sku)
                                                            setIsDropdownOpen(false)
                                                            setSearchQuery("")
                                                        }}
                                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group ${selectedProduct === p.sku
                                                            ? 'bg-primary/10 border border-primary/20 shadow-sm'
                                                            : 'hover:bg-accent/50 border border-transparent'
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${selectedProduct === p.sku
                                                                ? 'bg-primary text-primary-foreground'
                                                                : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                                                                } transition-colors`}>
                                                                {(p.productName || p.sku).charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`font-medium truncate ${selectedProduct === p.sku ? 'text-primary' : 'text-foreground'}`}>
                                                                    {p.productName || p.sku}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                                                        {p.sku}
                                                                    </span>
                                                                    {p.category && (
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {p.category}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {selectedProduct === p.sku && (
                                                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="px-3 py-8 text-center">
                                                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                                                    <Search className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {productsList.length === 0
                                                        ? "Loading products..."
                                                        : `No products found for "${searchQuery}"`}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer with count */}
                                    <div className="border-t border-border/50 px-4 py-2.5 bg-muted/20 flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            {filteredProducts.length} of {totalProducts.toLocaleString()} products
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                            MongoDB
                                        </Badge>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Select value={horizon.toString()} onValueChange={(v) => setHorizon(parseInt(v))}>
                            <SelectTrigger className="w-[100px] h-9 text-sm bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">7 days</SelectItem>
                                <SelectItem value="14">14 days</SelectItem>
                                <SelectItem value="30">30 days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-5">
                {error && (
                    <div className="h-[320px] flex items-center justify-center">
                        <div className="text-center space-y-2">
                            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                                <AlertTriangle className="h-6 w-6 text-destructive" />
                            </div>
                            <p className="text-destructive font-medium">Error loading forecast</p>
                            <p className="text-sm text-muted-foreground">{error}</p>
                        </div>
                    </div>
                )}

                {loading && !error && (
                    <div className="h-[320px] flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                <div className="h-12 w-12 rounded-full border-2 border-primary/20" />
                                <Loader2 className="h-12 w-12 absolute inset-0 animate-spin text-primary" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Agent processing forecast...
                            </p>
                        </div>
                    </div>
                )}

                {!loading && !error && forecastData && (
                    <>
                        {/* Agent Response Summary */}
                        {forecastData.success && (
                            <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border/50">
                                <div className="flex items-start gap-3">
                                    <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center justify-between gap-4">
                                            <h3 className="font-semibold text-sm">Agent Analysis</h3>
                                            {recommendationBadge && (
                                                <Badge className={recommendationBadge.className}>
                                                    <BadgeIcon className="h-3 w-3 mr-1" />
                                                    {forecastData.data.recommendation.toUpperCase()}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {forecastData.message}
                                        </p>

                                        {/* Metadata */}
                                        <div className="flex flex-wrap gap-4 pt-2 border-t border-border/50">
                                            <div className="text-xs">
                                                <span className="text-muted-foreground">Confidence:</span>{" "}
                                                <span className="font-medium text-foreground">
                                                    {(forecastData.data.confidence * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="text-xs">
                                                <span className="text-muted-foreground">Agent:</span>{" "}
                                                <span className="font-medium text-foreground">
                                                    {forecastData.metadata.agent}
                                                </span>
                                            </div>
                                            <div className="text-xs">
                                                <span className="text-muted-foreground">Iterations:</span>{" "}
                                                <span className="font-medium text-foreground">
                                                    {forecastData.metadata.iterations}
                                                </span>
                                            </div>
                                            <div className="text-xs">
                                                <span className="text-muted-foreground">Tokens:</span>{" "}
                                                <span className="font-medium text-foreground">
                                                    {forecastData.metadata.tokensUsed}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chart */}
                        {chartData.length > 0 && (
                            <div className="h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="hsl(var(--border))"
                                            strokeOpacity={0.5}
                                            vertical={false}
                                        />
                                        <XAxis
                                            dataKey="day"
                                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                                            axisLine={{ stroke: "hsl(var(--border))" }}
                                            tickLine={false}
                                            dy={8}
                                        />
                                        <YAxis
                                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                            dx={-8}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "hsl(var(--popover))",
                                                border: "1px solid hsl(var(--border))",
                                                borderRadius: "8px",
                                            }}
                                            labelStyle={{ color: "hsl(var(--foreground))" }}
                                        />
                                        <Bar
                                            dataKey="units"
                                            fill="url(#barGradient)"
                                            radius={[6, 6, 0, 0]}
                                            name="Predicted Demand"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="units"
                                            stroke="hsl(var(--primary))"
                                            strokeWidth={2}
                                            dot={{ fill: "hsl(var(--primary))", r: 4 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Additional Data */}
                        {forecastData.data?.quantity !== null && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Recommended Quantity:</span>
                                    <span className="font-semibold text-lg text-foreground">
                                        {forecastData.data.quantity} units
                                    </span>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}
