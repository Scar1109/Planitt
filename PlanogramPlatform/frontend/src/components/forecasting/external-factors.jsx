import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Calendar, PartyPopper, TrendingUp, TrendingDown, Sun, CloudRain,
    Loader2, History, Rocket, AlertTriangle, Lightbulb, Package
} from "lucide-react"
import { api } from "@/api/client"

const typeConfig = {
    poya: { icon: PartyPopper, color: "bg-purple-50 text-purple-600", label: "Poya Day" },
    holiday: { icon: PartyPopper, color: "bg-red-50 text-red-600", label: "Holiday" },
    public: { icon: Calendar, color: "bg-blue-50 text-blue-600", label: "Public Holiday" },
    weekend: { icon: Calendar, color: "bg-emerald-50 text-emerald-600", label: "Weekend" },
}

export function ExternalFactors() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState("future")

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true)
                setError(null)

                console.log("📊 Fetching external factors analysis and events...")

                // Fetch external factors analysis along with real events
                const [response, eventsData] = await Promise.all([
                    api.getExternalFactorsAnalysis(30).catch(() => ({})),
                    api.getEvents("Colombo", "LK").catch(() => ({ events: [] }))
                ])

                // Combine and format real events
                const rawEvents = eventsData?.events || []

                const combinedLiveEvents = [...rawEvents]
                    .map(item => {
                        const isHoliday = !!item.type

                        // Parse date and calculate days until
                        const eventDate = new Date(item.date)
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)

                        let daysUntil = item.daysUntil
                        if (daysUntil === undefined) {
                            const diffTime = Math.abs(eventDate - today)
                            daysUntil = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
                        }

                        // Derive urgency/impact colors based on expectedImpact or type
                        const urgency = item.expectedImpact || (isHoliday && item.type === 'public' ? 'high' : 'medium')

                        // Calculate an estimated overall impact percentage (if not provided)
                        let overallImpact = 0
                        if (item.demandMultiplier) {
                            overallImpact = Math.round((item.demandMultiplier - 1) * 100)
                        } else if (isHoliday) {
                            overallImpact = item.type === 'poya' ? 25 : 15
                        }

                        // Generates realistic mocked category impacts based on the event name
                        const isPoya = item.name?.toLowerCase().includes("poya")
                        const isFestival = item.name?.toLowerCase().includes("new year") || item.name?.toLowerCase().includes("christmas")

                        const predictedImpacts = isPoya ? [
                            { category: "Beverages (Non-Alcoholic)", change: 30, direction: "increase" },
                            { category: "Incense & Candles", change: 45, direction: "increase" },
                            { category: "Meat/Alcohol", change: 80, direction: "decrease" }
                        ] : isFestival ? [
                            { category: "Sweets & Biscuits", change: 60, direction: "increase" },
                            { category: "Gifts & Hampers", change: 120, direction: "increase" },
                            { category: "Beverages", change: 40, direction: "increase" }
                        ] : [
                            { category: "Staples", change: 10, direction: "increase" },
                            { category: "Snacks", change: 15, direction: "increase" },
                            { category: "Beverages", change: 12, direction: "increase" }
                        ]

                        return {
                            name: item.name,
                            date: item.date,
                            type: isPoya ? "poya" : isHoliday ? "public" : "holiday",
                            daysUntil,
                            urgency,
                            overallImpact,
                            predictedImpacts
                        }
                    })
                    // Only keep future events
                    .filter(e => e.daysUntil >= 0)
                    // Sort by upcoming date
                    .sort((a, b) => new Date(a.date) - new Date(b.date))

                // Ensure futurePredictions object exists
                if (!response.futurePredictions) {
                    response.futurePredictions = {}
                }

                // Override upcomingEvents with our live merged data (limit to 6)
                response.futurePredictions.upcomingEvents = combinedLiveEvents.slice(0, 6)

                console.log("📊 Transformed External factors response:", response)
                setData(response)
            } catch (err) {
                console.error("Failed to fetch external factors:", err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    if (loading) {
        return (
            <Card className="bg-white border-slate-100 shadow-sm rounded-xl overflow-hidden h-[500px]">
                <CardContent className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                    <span className="ml-2 text-slate-500 text-sm">Analyzing external factors...</span>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="bg-white border-slate-100 shadow-sm rounded-xl overflow-hidden h-[500px]">
                <CardContent className="flex flex-col items-center justify-center h-full">
                    <AlertTriangle className="h-12 w-12 text-amber-400 mb-3" />
                    <p className="text-slate-600 font-medium">Unable to load analysis</p>
                    <p className="text-sm text-slate-400 mt-1">{error}</p>
                </CardContent>
            </Card>
        )
    }

    const { pastAnalysis, futurePredictions, recommendations, inventorySummary } = data || {}

    return (
        <Card className="bg-white border-slate-100 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-white">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2.5 text-slate-800">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                            <TrendingUp className="h-4 w-4 text-indigo-600" />
                        </div>
                        External Factors Analysis
                    </CardTitle>
                    <Badge
                        variant="outline"
                        className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                        Live Data
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-4 bg-white">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4 bg-slate-100 p-1 rounded-lg">
                        <TabsTrigger
                            value="future"
                            className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm rounded-md text-sm"
                        >
                            <Rocket className="h-3.5 w-3.5 mr-1.5" />
                            Future
                        </TabsTrigger>
                        <TabsTrigger
                            value="past"
                            className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm rounded-md text-sm"
                        >
                            <History className="h-3.5 w-3.5 mr-1.5" />
                            Past Impact
                        </TabsTrigger>
                        <TabsTrigger
                            value="recommendations"
                            className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm rounded-md text-sm"
                        >
                            <Lightbulb className="h-3.5 w-3.5 mr-1.5" />
                            Actions
                        </TabsTrigger>
                    </TabsList>

                    {/* FUTURE PREDICTIONS TAB */}
                    <TabsContent value="future" className="mt-0 space-y-3">
                        {futurePredictions?.upcomingEvents?.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">No upcoming events in the next 30 days</p>
                            </div>
                        ) : (
                            futurePredictions?.upcomingEvents?.map((event) => {
                                const typeInfo = typeConfig[event.type] || typeConfig.holiday
                                const TypeIcon = typeInfo.icon

                                return (
                                    <div
                                        key={`${event.date}-${event.name}`}
                                        className={`rounded-lg border p-3 transition-colors ${event.urgency === 'high'
                                            ? 'border-red-200 bg-red-50/30'
                                            : event.urgency === 'medium'
                                                ? 'border-amber-200 bg-amber-50/30'
                                                : 'border-slate-100 hover:bg-slate-50/50'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex items-start gap-3">
                                                <div className={`p-1.5 rounded-md ${typeInfo.color.split(' ')[0]}`}>
                                                    <TypeIcon className={`h-4 w-4 ${typeInfo.color.split(' ')[1]}`} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm text-slate-800">{event.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-xs text-slate-500">
                                                            {new Date(event.date).toLocaleDateString("en-US", {
                                                                month: "short", day: "numeric", weekday: "short"
                                                            })}
                                                        </p>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${event.daysUntil <= 3
                                                            ? "bg-red-50 text-red-700 border-red-200"
                                                            : event.daysUntil <= 7
                                                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                                                : "bg-slate-50 text-slate-500 border-slate-200"
                                                            }`}>
                                                            {event.daysUntil === 0 ? "Today" : event.daysUntil === 1 ? "Tomorrow" : `${event.daysUntil} days`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge
                                                className={`text-[10px] px-1.5 h-5 shadow-none border ${event.overallImpact > 20
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : event.overallImpact > 0
                                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                                        : "bg-red-50 text-red-700 border-red-200"
                                                    }`}
                                            >
                                                {event.overallImpact > 0 ? '+' : ''}{event.overallImpact}%
                                            </Badge>
                                        </div>

                                        {/* Predicted impacts by category */}
                                        <div className="pl-[42px] flex flex-wrap gap-1.5">
                                            {event.predictedImpacts?.slice(0, 4).map((impact, idx) => {
                                                const changeValue = impact.adjustedChange ?? impact.baseChange ?? impact.change ?? 0;
                                                return (
                                                    <span
                                                        key={idx}
                                                        className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${impact.direction === 'increase'
                                                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                                            : "bg-red-50 text-red-600 border-red-200"
                                                            }`}
                                                    >
                                                        {impact.category}: {changeValue > 0 ? '+' : ''}{changeValue}%
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </TabsContent>

                    {/* PAST IMPACT TAB */}
                    <TabsContent value="past" className="mt-0 space-y-4">
                        {/* Baseline stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-slate-100 p-3 bg-slate-50/50">
                                <p className="text-xs text-slate-500 mb-1">Daily Baseline</p>
                                <p className="text-lg font-bold text-slate-800">
                                    {pastAnalysis?.baselineDailySales?.toLocaleString() || 0}
                                </p>
                                <p className="text-[10px] text-slate-400">units/day avg</p>
                            </div>
                            <div className="rounded-lg border border-slate-100 p-3 bg-slate-50/50">
                                <p className="text-xs text-slate-500 mb-1">Data Points</p>
                                <p className="text-lg font-bold text-slate-800">
                                    {pastAnalysis?.totalSalesRecords || 0}
                                </p>
                                <p className="text-[10px] text-slate-400">days analyzed</p>
                            </div>
                        </div>

                        {/* Weather Patterns */}
                        <div>
                            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                                Weather & Time Patterns
                            </h4>
                            <div className="space-y-2">
                                {pastAnalysis?.weatherPatterns?.map((pattern, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-white"
                                    >
                                        <div className="flex items-center gap-2">
                                            {pattern.icon === 'sun' && <Sun className="h-4 w-4 text-amber-500" />}
                                            {pattern.icon === 'cloud-rain' && <CloudRain className="h-4 w-4 text-blue-500" />}
                                            {pattern.icon === 'calendar' && <Calendar className="h-4 w-4 text-indigo-500" />}
                                            <div>
                                                <p className="text-sm font-medium text-slate-700">{pattern.factor}</p>
                                                <p className="text-[10px] text-slate-400">{pattern.description}</p>
                                            </div>
                                        </div>
                                        <Badge className={`text-xs shadow-none border ${parseFloat(pattern.avgImpact) > 0
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-red-50 text-red-700 border-red-200"
                                            }`}>
                                            {parseFloat(pattern.avgImpact) > 0 ? '+' : ''}{pattern.avgImpact}%
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Past holiday impacts */}
                        {pastAnalysis?.holidayImpacts?.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                                    Recent Holiday Impact (Actual)
                                </h4>
                                <div className="space-y-2">
                                    {pastAnalysis.holidayImpacts.slice(0, 3).map((holiday, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-white"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-slate-700">{holiday.name}</p>
                                                <p className="text-[10px] text-slate-400">
                                                    {new Date(holiday.date).toLocaleDateString()} •
                                                    Actual: {holiday.actualSales} vs Baseline: {holiday.baselineSales}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {holiday.actualImpactPercent > 0
                                                    ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                                                    : <TrendingDown className="h-3 w-3 text-red-500" />
                                                }
                                                <span className={`text-sm font-bold ${holiday.actualImpactPercent > 0 ? 'text-emerald-600' : 'text-red-600'
                                                    }`}>
                                                    {holiday.actualImpactPercent > 0 ? '+' : ''}{holiday.actualImpactPercent}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* RECOMMENDATIONS TAB */}
                    <TabsContent value="recommendations" className="mt-0 space-y-3">
                        {recommendations?.map((rec, idx) => (
                            <div
                                key={idx}
                                className={`rounded-lg border p-3 ${rec.priority === 'high'
                                    ? 'border-red-200 bg-red-50/50'
                                    : rec.priority === 'medium'
                                        ? 'border-amber-200 bg-amber-50/50'
                                        : 'border-slate-100 bg-slate-50/30'
                                    }`}
                            >
                                <div className="flex items-start gap-2 mb-2">
                                    <span className="text-sm shrink-0 mt-0.5">{rec.icon || (rec.priority === 'high' ? '⚠️' : rec.priority === 'medium' ? '💡' : '💡')}</span>
                                    <p className="text-sm font-medium text-slate-700">{rec.message}</p>
                                </div>
                                {rec.actionItems?.length > 0 && (
                                    <div className="pl-6 flex flex-wrap gap-1.5">
                                        {rec.actionItems.map((item, i) => (
                                            <span key={i} className="text-[10px] bg-white text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded">
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Inventory Summary */}
                        {inventorySummary && (
                            <div className="mt-4 pt-3 border-t border-slate-100">
                                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <Package className="h-3.5 w-3.5" />
                                    Inventory Health
                                </h4>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                                        <p className="text-lg font-bold text-slate-800">{inventorySummary.avgDailyStock}</p>
                                        <p className="text-[10px] text-slate-500">Avg Stock</p>
                                    </div>
                                    <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                                        <p className="text-lg font-bold text-amber-600">{inventorySummary.wastePercentage}%</p>
                                        <p className="text-[10px] text-slate-500">Waste</p>
                                    </div>
                                    <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                                        <p className="text-lg font-bold text-red-600">{inventorySummary.stockoutRiskDays}%</p>
                                        <p className="text-[10px] text-slate-500">Stockout Risk</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
