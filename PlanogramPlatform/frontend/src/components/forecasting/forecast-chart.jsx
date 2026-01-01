import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { TrendingUp, Download, Loader2, Eye, EyeOff, Sparkles, CalendarDays } from "lucide-react"
import { api } from "@/api/client"

export function ForecastChart() {
    const [timeRange, setTimeRange] = useState("14d")
    const [selectedProduct, setSelectedProduct] = useState("")
    const [showConfidence, setShowConfidence] = useState(true)
    const [forecastData, setForecastData] = useState([])
    const [holidays, setHolidays] = useState([])
    const [products, setProducts] = useState([])
    const [productsLoading, setProductsLoading] = useState(true)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Fetch real products from training data
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setProductsLoading(true)
                const response = await api.getProducts(null, null, 50)

                if (response.success && response.data && response.data.length > 0) {
                    // Map to expected format
                    const mappedProducts = response.data.map(p => ({
                        sku: p.sku,
                        name: p.productName || p.sku,
                        category: p.category || 'Unknown'
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
                // The Python ML service returns: { product_id, store_id, forecasts: [...], model_version, accuracy_metrics }
                const forecasts = forecastResponse.forecasts || []

                if (forecasts.length === 0) {
                    setError("No forecast data returned from ML model")
                    return
                }

                const chartData = forecasts.map((point, index) => {
                    const forecastDate = new Date(point.date)
                    const dateKey = point.date // YYYY-MM-DD format
                    const isHoliday = holidayMap.has(dateKey)
                    const holidayInfo = holidayMap.get(dateKey)

                    return {
                        date: forecastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        fullDate: point.date,
                        forecast: Math.round(point.forecast),
                        lower: Math.round(point.lower_bound),
                        upper: Math.round(point.upper_bound),
                        actual: null, // Will be populated with real historical data if available
                        holiday: isHoliday,
                        holidayName: holidayInfo?.name,
                        holidayImpact: holidayInfo?.impact,
                    }
                })

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
                console.log(`✅ Chart data prepared: ${chartData.length} points`)
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

        return (
            <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                <p className="font-semibold text-foreground mb-2">{label}</p>
                {isHoliday && (
                    <div className="mb-2 pb-2 border-b border-border">
                        <div className="flex items-center gap-1.5 text-xs">
                            <Sparkles className="h-3 w-3 text-amber-500" />
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                                {data.holidayName}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Expected +{data.holidayImpact === 'high' ? '40' : data.holidayImpact === 'medium' ? '20' : '10'}% demand
                        </p>
                    </div>
                )}
                {payload.map((entry, index) => {
                    if (entry.value === null) return null
                    return (
                        <div key={index} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">{entry.name}:</span>
                            <span className="font-medium text-foreground">
                                {Number(entry.value).toLocaleString()} units
                            </span>
                        </div>
                    )
                })}
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
        <Card className="overflow-visible">
            <CardHeader className="pb-4 border-b border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                <TrendingUp className="h-4 w-4 text-primary" />
                            </div>
                            <span>Demand Forecast</span>
                            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            {!loading && holidays.length > 0 && (
                                <Badge variant="outline" className="gap-1 ml-2">
                                    <CalendarDays className="h-3 w-3" />
                                    {holidays.length} {holidays.length === 1 ? 'Holiday' : 'Holidays'}
                                </Badge>
                            )}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            ML-powered predictions with holiday adjustments
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={selectedProduct} onValueChange={setSelectedProduct} disabled={productsLoading}>
                            <SelectTrigger className="w-[200px] h-10 text-sm bg-background/80 backdrop-blur-sm rounded-xl border-input hover:border-primary/30 hover:bg-accent/30 transition-all duration-200 shadow-sm">
                                <SelectValue placeholder={productsLoading ? "Loading..." : "Select Product"}>
                                    {selectedProduct && (
                                        <span className="font-medium truncate">
                                            {products.find(p => p.sku === selectedProduct)?.name}
                                        </span>
                                    )}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-popover/95 backdrop-blur-md border-border/50 rounded-xl shadow-lg max-h-[320px] overflow-hidden">
                                <div className="p-1">
                                    {products.map((product) => (
                                        <SelectItem
                                            key={product.sku}
                                            value={product.sku}
                                            className="rounded-lg py-2.5 px-3 cursor-pointer focus:bg-primary/10 focus:text-foreground data-[state=checked]:bg-primary/10"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                                    {product.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-medium text-sm">{product.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {product.category} • <span className="font-mono">{product.sku}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </div>
                            </SelectContent>
                        </Select>

                        <div className="toggle-group">
                            {timeRanges.map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`toggle-item ${timeRange === range ? "active" : ""}`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>

                        <Button variant="outline" size="icon" className="h-9 w-9">
                            <Download className="h-4 w-4" />
                        </Button>
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
                        <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={forecastData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                                        </linearGradient>
                                        <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="hsl(var(--border))"
                                        strokeOpacity={0.5}
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="date"
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
                                        domain={["dataMin - 200", "dataMax + 200"]}
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
                                                fill="hsl(var(--warning))"
                                                fillOpacity={0.15}
                                                stroke="hsl(var(--warning))"
                                                strokeOpacity={0.3}
                                            />
                                        )
                                    })}

                                    {/* Today marker */}
                                    <ReferenceLine
                                        x={forecastData[6]?.date}
                                        stroke="hsl(var(--muted-foreground))"
                                        strokeDasharray="4 4"
                                        strokeOpacity={0.5}
                                        label={{
                                            value: "Today",
                                            position: "top",
                                            fill: "hsl(var(--muted-foreground))",
                                            fontSize: 10,
                                            fontWeight: 500
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
                                                fill="hsl(var(--background))"
                                                name="Lower Bound"
                                            />
                                        </>
                                    )}

                                    <Area
                                        type="monotone"
                                        dataKey="actual"
                                        stroke="hsl(var(--success))"
                                        fill="url(#actualGradient)"
                                        strokeWidth={2}
                                        dot={{ fill: "hsl(var(--success))", strokeWidth: 0, r: 4 }}
                                        activeDot={{ r: 6, fill: "hsl(var(--success))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                                        name="Actual Sales"
                                        connectNulls={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="forecast"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={2.5}
                                        strokeDasharray="6 4"
                                        dot={(props) => {
                                            const { cx, cy, payload } = props
                                            return (
                                                <g>
                                                    <circle
                                                        cx={cx}
                                                        cy={cy}
                                                        r={payload.holiday ? 5 : 3}
                                                        fill={payload.holiday ? "hsl(var(--warning))" : "hsl(var(--primary))"}
                                                        strokeWidth={0}
                                                    />
                                                    {payload.holiday && (
                                                        <circle
                                                            cx={cx}
                                                            cy={cy}
                                                            r={7}
                                                            fill="none"
                                                            stroke="hsl(var(--warning))"
                                                            strokeWidth={1.5}
                                                            opacity={0.5}
                                                        />
                                                    )}
                                                </g>
                                            )
                                        }}
                                        activeDot={{ r: 5, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                                        name="Forecast"
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-5 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-5">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full bg-success" />
                                    <span className="text-xs text-muted-foreground">Actual Sales</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-0.5 w-5 bg-primary rounded" style={{ backgroundImage: "repeating-linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary)) 4px, transparent 4px, transparent 8px)" }} />
                                    <span className="text-xs text-muted-foreground">Forecast</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded bg-primary/20" />
                                    <span className="text-xs text-muted-foreground">95% Confidence</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <span className="h-2.5 w-2.5 rounded-full bg-warning block" />
                                        <span className="h-3.5 w-3.5 rounded-full border border-warning/50 absolute -inset-0.5" />
                                    </div>
                                    <span className="text-xs text-muted-foreground">Holiday</span>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowConfidence(!showConfidence)}
                                className="h-8 text-xs gap-1.5"
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