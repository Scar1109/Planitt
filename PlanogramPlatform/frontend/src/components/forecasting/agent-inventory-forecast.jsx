import { useState, useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bot, TrendingUp, AlertTriangle, CheckCircle, Loader2, Sparkles, Search, ChevronDown, X, Package } from "lucide-react"
import { api } from "@/api/client"


export function AgentInventoryForecast({ onDataChange }) {
    const location = useLocation()
    const urlParams = new URLSearchParams(location.search)
    const initialSku = urlParams.get("sku")

    const [productsList, setProductsList] = useState([])
    const [totalProducts, setTotalProducts] = useState(0)
    const [selectedProduct, setSelectedProduct] = useState(initialSku)
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

    // Report data back to parent for shared components
    useEffect(() => {
        if (onDataChange && selectedProductData) {
            onDataChange({
                forecastData,
                selectedProductData,
                horizon
            })
        }
    }, [forecastData, selectedProductData, horizon, onDataChange])

    // Get recommendation badge styling with user-friendly colors and labels
    const getRecommendationBadge = (recommendation) => {
        switch (recommendation?.toLowerCase()) {
            case 'monitor':
                return {
                    variant: "outline",
                    className: "bg-gradient-to-r from-[#17A2B8]/10 to-[#1B4F72]/10 text-[#1B4F72] border-[#17A2B8]/20 shadow-sm",
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
                    className: "bg-gradient-to-r from-blue-50 to-[#17A2B8]/10 text-blue-700 border-blue-200 shadow-sm",
                    icon: Bot,
                    label: "ℹ️ INFO"
                }
        }
    }

    const recommendationBadge = forecastData?.data?.recommendation
        ? getRecommendationBadge(forecastData.data.recommendation)
        : null

    return (
        <Card className="overflow-visible bg-white border-slate-100 shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#17A2B8]/10">
                                <Bot className="h-4 w-4 text-[#1B4F72]" />
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
                                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:ring-offset-2 min-w-[280px] max-w-[320px] h-10 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
                            >
                                <span className="truncate text-left flex-1 font-medium text-slate-700">
                                    {selectedProductData
                                        ? `${selectedProductData.productName || selectedProductData.sku}${selectedProductData.unitSize ? ` (${selectedProductData.unitSize})` : ''}`
                                        : "Select Product..."}
                                </span>
                                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-[#1B4F72]' : ''}`} />
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
                                                className="pl-9 pr-9 h-10 text-sm rounded-lg border-slate-200 bg-white focus:ring-[#17A2B8] transition-colors"
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
                                                            ? 'bg-[#17A2B8]/10 border border-[#17A2B8]/20'
                                                            : 'hover:bg-slate-50 border border-transparent'
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${selectedProduct === p.sku
                                                                ? 'bg-[#1B4F72] text-white'
                                                                : 'bg-slate-100 text-slate-500 group-hover:bg-[#17A2B8]/10 group-hover:text-[#1B4F72]'
                                                                } transition-colors`}>
                                                                {(p.productName || p.sku).charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`font-medium truncate ${selectedProduct === p.sku ? 'text-[#1B4F72]' : 'text-slate-700'}`}>
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
                                                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#1B4F72] flex items-center justify-center">
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
                                <div className="h-12 w-12 rounded-full border-2 border-[#17A2B8]/20" />
                                <Loader2 className="h-12 w-12 absolute inset-0 animate-spin text-[#1B4F72]" />
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
                                    ? 'bg-[#17A2B8]/10 border-[#17A2B8]/20'
                                    : 'bg-emerald-50 border-emerald-200'
                                }`}>
                                <div className="flex items-start gap-3">
                                    <Sparkles className={`h-5 w-5 mt-0.5 flex-shrink-0 ${forecastData.data?.insights?.urgency === 'high'
                                        ? 'text-red-600'
                                        : forecastData.data?.insights?.urgency === 'medium'
                                            ? 'text-[#17A2B8]'
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

                                        {/* Dynamic Behavioral & Causal Insights */}
                                        {forecastData.data?.analysis_reasons && forecastData.data.analysis_reasons.length > 0 && (
                                            <div className="pt-3 border-t border-slate-200/50 space-y-2">
                                                <h4 className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                                                    <Search className="h-3.5 w-3.5 text-[#17A2B8]" />
                                                    Key Influencing Factors
                                                </h4>
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    {forecastData.data.analysis_reasons.map((reason, idx) => {
                                                        // Extract emoji if present at the start of the string
                                                        const emojiMatch = reason.match(/^([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/);
                                                        const emoji = emojiMatch ? emojiMatch[0] : '📌';
                                                        const text = emojiMatch ? reason.replace(emojiMatch[0], '').trim() : reason;

                                                        // Determine color based on context keywords
                                                        let colorClass = "bg-slate-50 border-slate-200 text-slate-700";
                                                        if (text.toLowerCase().includes('weather') || text.toLowerCase().includes('rain') || text.toLowerCase().includes('hot')) colorClass = "bg-sky-50 border-sky-200 text-sky-800";
                                                        if (text.toLowerCase().includes('payday') || text.toLowerCase().includes('salary')) colorClass = "bg-emerald-50 border-emerald-200 text-emerald-800";
                                                        if (text.toLowerCase().includes('holiday') || text.toLowerCase().includes('surge') || text.toLowerCase().includes('event')) colorClass = "bg-violet-50 border-violet-200 text-violet-800";
                                                        if (text.toLowerCase().includes('dip') || text.toLowerCase().includes('lower')) colorClass = "bg-rose-50 border-rose-200 text-rose-800";

                                                        return (
                                                            <div key={idx} className={`flex items-start gap-2 p-2 rounded-md border text-xs leading-relaxed ${colorClass}`}>
                                                                <span className="flex-shrink-0 text-sm">{emoji}</span>
                                                                <span>{text}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}


                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Subtle Yet Cool Recommendation Block */}
                        {forecastData.data?.quantity !== null && (
                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                                <div className="inline-flex items-center gap-4 py-2.5 px-5 bg-gradient-to-r from-[#17A2B8]/5 to-slate-50 border border-[#17A2B8]/20 rounded-xl shadow-[0_2px_10px_-4px_rgba(23,162,184,0.2)]">
                                    <div className="flex items-center gap-2.5">
                                        <div className="bg-white p-1.5 rounded-lg border border-slate-100 shadow-sm">
                                            <Package className="h-4 w-4 text-[#17A2B8]" />
                                        </div>
                                        <div>
                                            <p className="text-slate-700 text-[10px] font-bold uppercase tracking-wider leading-tight">Recommended Qty</p>
                                            <p className="text-slate-400 text-[10px] leading-tight">Next {horizon} days</p>
                                        </div>
                                    </div>
                                    <div className="h-6 w-px bg-slate-200" />
                                    <div className="flex items-baseline gap-1 pr-1">
                                        <span className="text-2xl font-black text-[#1B4F72] tabular-nums tracking-tight leading-none">
                                            {forecastData.data.quantity}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-500 leading-none">units</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}
