import { useState, useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
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
    Area,
    ComposedChart,
    ReferenceLine,
    ReferenceArea,
} from "recharts"
import { TrendingUp, Download, Loader2, Eye, EyeOff, Sparkles, CalendarDays, Search, ChevronDown, X } from "lucide-react"
import { api } from "@/api/client"

export function ForecastChart() {
    const location = useLocation()
    const urlParams = new URLSearchParams(location.search)
    const initialSku = urlParams.get("sku")

    const [timeRange, setTimeRange] = useState("14d")
    const [selectedProduct, setSelectedProduct] = useState(initialSku || "")
    const [showConfidence, setShowConfidence] = useState(true)
    const [forecastData, setForecastData] = useState([])
    const [holidays, setHolidays] = useState([])
    const [products, setProducts] = useState([])
    const [productsLoading, setProductsLoading] = useState(true)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
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
    const filteredProducts = products.filter(p => {
        const query = searchQuery.toLowerCase()
        return p.sku.toLowerCase().includes(query) ||
            (p.name && p.name.toLowerCase().includes(query)) ||
            (p.category && p.category.toLowerCase().includes(query))
    })

    const selectedProductData = products.find(p => p.sku === selectedProduct)

    // Fetch real products from training data
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setProductsLoading(true)
                const response = await api.getProducts(null, null, 2000)

                if (response.success && response.data && response.data.length > 0) {
                    // Map to expected format
                    const mappedProducts = response.data.map(p => ({
                        sku: p.sku,
                        name: p.productName || p.sku,
                        category: p.category || 'Unknown',
                        unitSize: p.unitSize || null
                    }))
                    setProducts(mappedProducts)
                    setSelectedProduct(mappedProducts[0].sku)
                    console.log(`✅ Loaded ${mappedProducts.length} products from MongoDB`)
                } else {
                    setError("No products found in the database.")
                    setProducts([])
                }
            } catch (err) {
                console.error("Error fetching products from database:", err)
                setError("Failed to load products from database. Please ensure MongoDB is connected.")
                setProducts([])
            } finally {
                setProductsLoading(false)
            }
        }

        fetchProducts()
    }, [])


    // Fetch forecast data when product changes
    useEffect(() => {
        if (!selectedProduct) return
        const fetchData = async () => {
            try {
                setLoading(true)
                setError(null)

                // Parse horizon from timeRange (e.g., "14d" -> 14)
                const horizonDays = parseInt(timeRange.replace('d', '')) || 14

                console.log(`📊 Fetching forecast for SKU: ${selectedProduct}, horizon: ${horizonDays} days`)

                // Fetch both forecast and holiday data in parallel
                const [forecastResponse, holidayResponse] = await Promise.all([
                    api.getForecast(
                        selectedProduct,  // product_id (SKU from MongoDB)
                        "STORE-001",      // store_id
                        horizonDays       // horizon_days
                    ),
                    api.getEvents("Colombo", "LK").catch(() => ({ events: [] }))
                ])

                console.log("✅ Forecast response received:", forecastResponse)

                // Create a map of holiday dates for quick lookup
                const holidayMap = new Map()
                holidayResponse.events?.forEach(holiday => {
                    holidayMap.set(holiday.date, {
                        name: holiday.name,
                        impact: holiday.expected_impact,
                        daysUntil: holiday.days_until
                    })
                })

                // Process forecast data and match with holidays
                const forecasts = forecastResponse.forecasts || []
                const history = forecastResponse.history || []

                // Use a Map to merge data by date
                const dataMap = new Map()

                // 1. Add History
                history.forEach(point => {
                    dataMap.set(point.date, {
                        date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        fullDate: point.date,
                        actual: point.actual_sales,
                        forecast: null,
                        lower: null,
                        upper: null
                    })
                })

                // 2. Add Forecasts (merge if date exists, else new)
                forecasts.forEach(point => {
                    const existing = dataMap.get(point.date) || {
                        date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        fullDate: point.date,
                        actual: null
                    }

                    dataMap.set(point.date, {
                        ...existing,
                        forecast: Math.round(point.forecast),
                        lower: Math.round(point.lower_bound),
                        upper: Math.round(point.upper_bound),
                        reason: point.reason
                    })
                })

                // Convert to array and sort by date
                const chartData = Array.from(dataMap.values())
                    .sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate))
                    .map(d => {
                        // Add holiday info
                        const isHoliday = holidayMap.has(d.fullDate)
                        const holidayInfo = holidayMap.get(d.fullDate)

                        return {
                            ...d,
                            holiday: isHoliday,
                            holidayName: holidayInfo?.name,
                            holidayImpact: holidayInfo?.impact,
                        }
                    })

                if (chartData.length === 0) {
                    setError("No data available for this product")
                    return
                }

                // Find holidays within forecast period
                const forecastHolidays = chartData
                    .filter(d => d.holiday)
                    .map(d => ({
                        name: d.holidayName,
                        date: d.date,
                        impact: d.holidayImpact
                    }))

                setForecastData(chartData)
                setHolidays(forecastHolidays)
                console.log(`✅ Chart data prepared: ${chartData.length} points (${history.length} actual, ${forecasts.length} forecast)`)
            } catch (err) {
                console.error("Error fetching forecast:", err)
                setError(err instanceof Error ? err.message : "Failed to load forecast from ML model")
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [selectedProduct, timeRange])

    const timeRanges = ["7d", "14d", "30d"]

    // Custom tooltip component
    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload || payload.length === 0) return null

        const data = payload[0]?.payload
        const isHoliday = data?.holiday
        const actionReason = data?.reason

        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg p-3 min-w-[200px]">
                <p className="font-semibold text-slate-800 dark:text-slate-100 mb-2">{label}</p>
                {isHoliday && (
                    <div className="mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 text-xs">
                            <Sparkles className="h-3 w-3 text-amber-500" />
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                                {data.holidayName}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Expected +{data.holidayImpact === 'high' ? '40' : data.holidayImpact === 'medium' ? '20' : '10'}% demand
                        </p>
                    </div>
                )}
                {actionReason && (
                    <div className="mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-400 tracking-wider mb-1">
                            AI Driven Factor
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                            {actionReason}
                        </p>
                    </div>
                )}
                <div className="space-y-1.5">
                    {payload.map((entry, index) => {
                        if (entry.value === null) return null
                        return (
                            <div key={index} className="flex items-center justify-between gap-4 text-sm">
                                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: entry.color }}
                                    />
                                    {entry.name}:
                                </span>
                                <span className="font-medium text-slate-800 dark:text-slate-100">
                                    {Number(entry.value).toLocaleString()} units
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    // Get impact color for badge
    const getImpactColor = (impact) => {
        switch (impact) {
            case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        }
    }

    return (
        <Card className="overflow-visible bg-white border-slate-100 shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                                <TrendingUp className="h-4 w-4 text-indigo-600" />
                            </div>
                            <span className="text-slate-800">Demand Forecast</span>
                            {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                            {!loading && holidays.length > 0 && (
                                <Badge variant="outline" className="gap-1 ml-2 bg-white text-slate-600 border-slate-200">
                                    <CalendarDays className="h-3 w-3" />
                                    {holidays.length} {holidays.length === 1 ? 'Holiday' : 'Holidays'}
                                </Badge>
                            )}
                        </CardTitle>
                        <p className="text-sm text-slate-500">
                            ML-powered predictions with holiday adjustments
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Custom Searchable Product Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                disabled={productsLoading}
                                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-w-[280px] max-w-[320px] h-10 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="truncate text-left flex-1 font-medium text-slate-700">
                                    {productsLoading ? "Loading products..." : selectedProductData
                                        ? `${selectedProductData.name || selectedProductData.sku}${selectedProductData.unitSize ? ` (${selectedProductData.unitSize})` : ''}`
                                        : "Select Product..."}
                                </span>
                                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                            </button>

                            {isDropdownOpen && !productsLoading && (
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
                                                                {(p.name || p.sku).charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`font-medium truncate ${selectedProduct === p.sku ? 'text-indigo-700' : 'text-slate-700'}`}>
                                                                    {p.name || p.sku}
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
                                                    {products.length === 0
                                                        ? "Loading products..."
                                                        : `No products found for "${searchQuery}"`}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer with count */}
                                    <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50 flex items-center justify-between">
                                        <span className="text-xs text-slate-500">
                                            {filteredProducts.length} of {products.length.toLocaleString()} products
                                        </span>
                                        <Badge variant="outline" className="text-xs bg-white text-slate-600 border-slate-200">
                                            MongoDB
                                        </Badge>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            {timeRanges.map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${timeRange === range
                                        ? "bg-white text-indigo-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>


                    </div>
                </div>

                {/* Holiday indicators */}
                {!loading && holidays.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-start gap-2">
                            <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground mb-2">Holidays in Forecast Period:</p>
                                <div className="flex flex-wrap gap-2">
                                    {holidays.map((holiday, index) => (
                                        <Badge
                                            key={index}
                                            className={`text-xs ${getImpactColor(holiday.impact)}`}
                                        >
                                            {holiday.name} ({holiday.date})
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardHeader>
            <CardContent className="pt-5">
                {error && (
                    <div className="h-[320px] flex items-center justify-center">
                        <div className="text-center space-y-2">
                            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                                <TrendingUp className="h-6 w-6 text-destructive" />
                            </div>
                            <p className="text-destructive font-medium">Error loading forecast</p>
                            <p className="text-sm text-muted-foreground">{error}</p>
                        </div>
                    </div>
                )}
                {(loading || productsLoading) && !error && (
                    <div className="h-[320px] flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                <div className="h-12 w-12 rounded-full border-2 border-primary/20" />
                                <Loader2 className="h-12 w-12 absolute inset-0 animate-spin text-primary" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {productsLoading ? "Loading products from training data..." : "Loading forecast data..."}
                            </p>
                        </div>
                    </div>
                )}
                {!loading && !productsLoading && !error && (
                    <>
                        <div className="h-[320px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={forecastData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01} />
                                        </linearGradient>
                                        <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#e2e8f0"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fill: "#64748b", fontSize: 11 }}
                                        axisLine={{ stroke: "#e2e8f0" }}
                                        tickLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        tick={{ fill: "#64748b", fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                        dx={-10}
                                        domain={[0, 'auto']}
                                    />
                                    <Tooltip content={<CustomTooltip />} />

                                    {/* Holiday markers - yellow reference areas */}
                                    {forecastData.map((point, index) => {
                                        if (!point.holiday) return null
                                        const nextIndex = index + 1
                                        const nextDate = forecastData[nextIndex]?.date || point.date
                                        return (
                                            <ReferenceArea
                                                key={`holiday-${index}`}
                                                x1={point.date}
                                                x2={nextDate}
                                                fill="#fbbf24"
                                                fillOpacity={0.1}
                                                stroke="none"
                                            />
                                        )
                                    })}

                                    {/* Today marker */}
                                    <ReferenceLine
                                        x={forecastData.find(d => !d.actual && d.forecast)?.date}
                                        stroke="#94a3b8"
                                        strokeDasharray="4 4"
                                        label={{
                                            value: "Forecast Start",
                                            position: "top",
                                            fill: "#94a3b8",
                                            fontSize: 10,
                                        }}
                                    />

                                    {showConfidence && (
                                        <>
                                            <Area
                                                type="monotone"
                                                dataKey="upper"
                                                stroke="transparent"
                                                fill="url(#confidenceGradient)"
                                                name="Upper Bound"
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="lower"
                                                stroke="transparent"
                                                fill="#ffffff"
                                                name="Lower Bound"
                                            />
                                        </>
                                    )}

                                    <Area
                                        type="monotone"
                                        dataKey="actual"
                                        stroke="#10b981"
                                        fill="url(#actualGradient)"
                                        strokeWidth={2}
                                        dot={{ fill: "#10b981", strokeWidth: 0, r: 3 }}
                                        activeDot={{ r: 5, fill: "#10b981", stroke: "#ffffff", strokeWidth: 2 }}
                                        name="Actual Sales"
                                        connectNulls={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="forecast"
                                        stroke="#4f46e5"
                                        strokeWidth={2.5}
                                        strokeDasharray="6 4"
                                        dot={(props) => {
                                            const { cx, cy, payload } = props
                                            if (!cx || !cy) return null;
                                            return (
                                                <g>
                                                    <circle
                                                        cx={cx}
                                                        cy={cy}
                                                        r={payload.holiday ? 4 : 2}
                                                        fill={payload.holiday ? "#fbbf24" : "#4f46e5"}
                                                        strokeWidth={0}
                                                    />
                                                    {payload.holiday && (
                                                        <circle
                                                            cx={cx}
                                                            cy={cy}
                                                            r={6}
                                                            fill="none"
                                                            stroke="#fbbf24"
                                                            strokeWidth={1.5}
                                                            opacity={0.6}
                                                        />
                                                    )}
                                                </g>
                                            )
                                        }}
                                        activeDot={{ r: 5, fill: "#4f46e5", stroke: "#ffffff", strokeWidth: 2 }}
                                        name="Forecast"
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm" />
                                    <span className="text-xs font-medium text-slate-600">Actual Sales</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-0.5 w-6 rounded-full bg-indigo-600/20 forced-colors:bg-transparent">
                                        <span className="block h-full w-full" style={{ backgroundImage: "repeating-linear-gradient(90deg, #4f46e5, #4f46e5 4px, transparent 4px, transparent 8px)" }}></span>
                                    </span>
                                    <span className="text-xs font-medium text-slate-600">Forecast</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded bg-indigo-100 border border-indigo-200" />
                                    <span className="text-xs font-medium text-slate-600">95% Confidence</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex items-center justify-center h-3 w-3">
                                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                                        <span className="absolute inset-0 rounded-full border border-amber-200 animate-pulse" />
                                    </div>
                                    <span className="text-xs font-medium text-slate-600">Holiday</span>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowConfidence(!showConfidence)}
                                className="h-8 text-xs gap-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                            >
                                {showConfidence ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                {showConfidence ? "Hide" : "Show"} Confidence
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}