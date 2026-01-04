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
                // Fetch all products from MongoDB (POS real-time data), sorted by high sales impact
                const response = await api.getProducts(null, null, 2000, 'highSales');
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

    // Get recommendation badge styling with user-friendly colors and labels
    const getRecommendationBadge = (recommendation) => {
        switch (recommendation?.toLowerCase()) {
            case 'monitor':
                return {
                    variant: "outline",
                    className: "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200 shadow-sm",
                    icon: AlertTriangle,
                    label: "⚡ WATCH"
                }
            case 'restock':
                return {
                    variant: "outline",
                    className: "bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200 shadow-sm",
                    icon: TrendingUp,
                    label: "🚨 ORDER NOW"
                }
            case 'sufficient':
                return {
                    variant: "outline",
                    className: "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border-emerald-200 shadow-sm",
                    icon: CheckCircle,
                    label: "✓ STOCK OK"
                }
            default:
                return {
                    variant: "outline",
                    className: "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200 shadow-sm",
                    icon: Bot,
                    label: "ℹ️ INFO"
                }
        }
    }

    const chartData = forecastData?.success ? parseChartData(forecastData.message) : []
    const recommendationBadge = forecastData?.data?.recommendation
        ? getRecommendationBadge(forecastData.data.recommendation)
        : null

    const BadgeIcon = recommendationBadge?.icon || Bot

    return (
        <Card className="overflow-visible bg-white border-slate-100 shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                                <Bot className="h-4 w-4 text-indigo-600" />
                            </div>
                            <span className="text-slate-800">AI Agent Inventory Forecast</span>
                            {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                        </CardTitle>
                        <p className="text-sm text-slate-500">
                            Autonomous agent-based demand predictions with intelligent recommendations
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Custom Searchable Product Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-w-[280px] max-w-[320px] h-10 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
                            >
                                <span className="truncate text-left flex-1 font-medium text-slate-700">
                                    {selectedProductData
                                        ? `${selectedProductData.productName || selectedProductData.sku}${selectedProductData.unitSize ? ` (${selectedProductData.unitSize})` : ''}`
                                        : "Select Product..."}
                                </span>
                                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute z-50 mt-2 w-[380px] rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 overflow-hidden">
                                    {/* Search Input */}
                                    <div className="p-3 border-b border-slate-100 bg-slate-50">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                type="text"
                                                placeholder="Search by SKU, name, or category..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-9 pr-9 h-10 text-sm rounded-lg border-slate-200 bg-white focus:ring-indigo-500 transition-colors"
                                                autoFocus
                                            />
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery("")}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-md hover:bg-slate-100"
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
                                                            ? 'bg-indigo-50 border border-indigo-100'
                                                            : 'hover:bg-slate-50 border border-transparent'
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${selectedProduct === p.sku
                                                                ? 'bg-indigo-600 text-white'
                                                                : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                                                                } transition-colors`}>
                                                                {(p.productName || p.sku).charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`font-medium truncate ${selectedProduct === p.sku ? 'text-indigo-700' : 'text-slate-700'}`}>
                                                                    {p.productName || p.sku}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                        {p.sku}
                                                                    </span>
                                                                    {p.category && (
                                                                        <span className="text-xs text-slate-400">
                                                                            {p.category}
                                                                        </span>
                                                                    )}
                                                                    {p.unitSize && (
                                                                        <span className="text-xs text-slate-500 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
                                                                            {p.unitSize}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {selectedProduct === p.sku && (
                                                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                                                    <Search className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <p className="text-sm text-slate-500">
                                                    {productsList.length === 0
                                                        ? "Loading products..."
                                                        : `No products found for "${searchQuery}"`}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer with count */}
                                    <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50 flex items-center justify-between">
                                        <span className="text-xs text-slate-500">
                                            {filteredProducts.length} of {totalProducts.toLocaleString()} products
                                        </span>
                                        <Badge variant="outline" className="text-xs bg-white text-slate-600 border-slate-200">
                                            MongoDB
                                        </Badge>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Select value={horizon.toString()} onValueChange={(v) => setHorizon(parseInt(v))}>
                            <SelectTrigger className="w-[100px] h-10 text-sm bg-white border-slate-200 text-slate-700">
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
                            <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
                                <AlertTriangle className="h-6 w-6 text-red-500" />
                            </div>
                            <p className="text-red-500 font-medium">Error loading forecast</p>
                            <p className="text-sm text-slate-500">{error}</p>
                        </div>
                    </div>
                )}

                {loading && !error && (
                    <div className="h-[320px] flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                <div className="h-12 w-12 rounded-full border-2 border-indigo-100" />
                                <Loader2 className="h-12 w-12 absolute inset-0 animate-spin text-indigo-600" />
                            </div>
                            <p className="text-sm text-slate-500">
                                Agent processing forecast...
                            </p>
                        </div>
                    </div>
                )}

                {!loading && !error && forecastData && (
                    <>
                        {/* Agent Response Summary */}
                        {forecastData.success && (
                            <div className={`mb-6 p-4 rounded-xl border ${forecastData.data?.insights?.urgency === 'high'
                                ? 'bg-red-50 border-red-200'
                                : forecastData.data?.insights?.urgency === 'medium'
                                    ? 'bg-amber-50 border-amber-200'
                                    : 'bg-emerald-50 border-emerald-200'
                                }`}>
                                <div className="flex items-start gap-3">
                                    <Sparkles className={`h-5 w-5 mt-0.5 flex-shrink-0 ${forecastData.data?.insights?.urgency === 'high'
                                        ? 'text-red-600'
                                        : forecastData.data?.insights?.urgency === 'medium'
                                            ? 'text-amber-600'
                                            : 'text-emerald-600'
                                        }`} />
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center justify-between gap-4">
                                            <h3 className="font-semibold text-sm text-slate-800">AI Forecast Analysis</h3>
                                            {recommendationBadge && (
                                                <Badge className={`${recommendationBadge.className} px-3 py-1 text-xs font-semibold`}>
                                                    {recommendationBadge.label || forecastData.data.recommendation.toUpperCase()}
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Formatted Message with Better Rendering */}
                                        <div className="text-sm text-slate-700 leading-relaxed space-y-2">
                                            {forecastData.message.split('\n').map((line, idx) => {
                                                // Parse markdown-style formatting
                                                if (line.startsWith('**') && line.endsWith('**')) {
                                                    return <p key={idx} className="font-semibold text-slate-900 text-base">{line.replace(/\*\*/g, '')}</p>;
                                                }
                                                if (line.includes('**')) {
                                                    const parts = line.split(/\*\*([^*]+)\*\*/g);
                                                    return (
                                                        <p key={idx}>
                                                            {parts.map((part, i) =>
                                                                i % 2 === 1
                                                                    ? <strong key={i} className="font-semibold text-slate-800">{part}</strong>
                                                                    : part
                                                            )}
                                                        </p>
                                                    );
                                                }
                                                if (line.trim() === '') return null;
                                                return <p key={idx}>{line}</p>;
                                            })}
                                        </div>

                                        {/* Quick Stats Row */}
                                        {forecastData.data?.insights && (
                                            <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-200/50">
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/60 text-xs">
                                                    <span className="text-slate-500">Avg Daily:</span>
                                                    <span className="font-semibold text-slate-700">{forecastData.data.insights.avgDaily} units</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/60 text-xs">
                                                    <span className="text-slate-500">Peak:</span>
                                                    <span className="font-semibold text-slate-700">{forecastData.data.insights.peakDay}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/60 text-xs">
                                                    <span className="text-slate-500">Confidence:</span>
                                                    <span className="font-semibold text-slate-700">{(forecastData.data.confidence * 100).toFixed(0)}%</span>
                                                </div>
                                                {forecastData.data.insights.trendPercent !== 0 && (
                                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${forecastData.data.insights.trendPercent > 0
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        <span>{forecastData.data.insights.trendPercent > 0 ? '↑' : '↓'}</span>
                                                        <span className="font-semibold">{Math.abs(forecastData.data.insights.trendPercent)}% vs avg</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Metadata Footer */}
                                        <div className="flex items-center gap-2 pt-2 text-[10px] text-slate-400">
                                            <span>Powered by {forecastData.metadata?.agent || 'AI'}</span>
                                            <span>•</span>
                                            <span>{forecastData.metadata?.productName || forecastData.metadata?.productId}</span>
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
                                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.3} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="#e2e8f0"
                                            strokeOpacity={0.8}
                                            vertical={false}
                                        />
                                        <XAxis
                                            dataKey="day"
                                            tick={{ fill: "#64748b", fontSize: 11 }}
                                            axisLine={{ stroke: "#e2e8f0" }}
                                            tickLine={false}
                                            dy={8}
                                        />
                                        <YAxis
                                            tick={{ fill: "#64748b", fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                            dx={-8}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "#ffffff",
                                                border: "1px solid #e2e8f0",
                                                borderRadius: "8px",
                                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                            }}
                                            labelStyle={{ color: "#1e293b" }}
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
                                            stroke="#4f46e5"
                                            strokeWidth={2}
                                            dot={{ fill: "#4f46e5", r: 4 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Additional Data */}
                        {forecastData.data?.quantity !== null && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-500">Recommended Quantity:</span>
                                    <span className="font-semibold text-lg text-indigo-600">
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
