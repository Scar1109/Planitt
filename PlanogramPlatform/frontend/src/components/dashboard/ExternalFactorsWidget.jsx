import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Cloud,
    Sun,
    CloudRain,
    Calendar,
    TrendingUp,
    TrendingDown,
    Minus,
    Thermometer,
    Droplets,
    PartyPopper,
    RefreshCw,
    AlertCircle
} from "lucide-react"
import { api } from "@/api/client"

export function ExternalFactorsWidget() {
    const [data, setData] = useState({
        weather: [],
        events: [],
        holidays: [],
        weatherSource: "",
        eventsSource: "",
        holidaysSource: "",
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [lastUpdated, setLastUpdated] = useState(null)

    const fetchData = async () => {
        setLoading(true)
        setError(null)

        try {
            const [weatherData, eventsData, holidaysData] = await Promise.all([
                api.getWeather("Colombo", 5),
                api.getEvents("Colombo", "LK"),
                api.getHolidays("LK"),
            ])

            setData({
                weather: weatherData.forecast?.slice(0, 5) || [],
                events: eventsData.events || [],
                holidays: holidaysData.holidays?.slice(0, 8) || [],
                weatherSource: weatherData.source || "unknown",
                eventsSource: eventsData.source || "unknown",
                holidaysSource: holidaysData.source || "unknown",
            })
            setLastUpdated(new Date())
        } catch (err) {
            console.error("Failed to fetch external data:", err)
            setError("Failed to load external data")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        // Refresh every 30 minutes
        const interval = setInterval(fetchData, 30 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    const getWeatherIcon = (condition) => {
        const condLower = condition?.toLowerCase() || ""
        if (condLower.includes("rain") || condLower.includes("drizzle") || condLower.includes("thunder")) {
            return <CloudRain className="h-5 w-5 text-blue-500" />
        }
        if (condLower.includes("cloud")) {
            return <Cloud className="h-5 w-5 text-gray-500" />
        }
        return <Sun className="h-5 w-5 text-[#17A2B8]" />
    }

    const getImpactIcon = (impact) => {
        switch (impact) {
            case "increased":
                return <TrendingUp className="h-3 w-3 text-emerald-500" />
            case "decreased":
                return <TrendingDown className="h-3 w-3 text-red-500" />
            default:
                return <Minus className="h-3 w-3 text-gray-500" />
        }
    }

    const getImpactBadge = (impact) => {
        const colors = {
            high: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
            medium: "bg-[#17A2B8]/10 text-[#1B4F72] dark:bg-[#17A2B8]/10 dark:text-[#1B4F72]",
            low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
        }
        return colors[impact] || colors.low
    }

    const getSourceBadge = (source) => {
        if (source === "openweathermap" || source === "ics_calendar") {
            return (
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                    ✓ Live Data
                </Badge>
            )
        }
        return (
            <Badge variant="outline" className="text-xs bg-[#17A2B8]/10 text-[#1B4F72] border-[#17A2B8]/20">
                Mock Data
            </Badge>
        )
    }

    if (loading && !data.weather.length) {
        return (
            <Card className="border-border">
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-32 bg-muted rounded" />
                        <div className="h-4 bg-muted rounded w-1/2" />
                        <div className="h-24 bg-muted rounded" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-border">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-primary" />
                        External Demand Factors
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {lastUpdated && (
                            <span className="text-xs text-muted-foreground">
                                Updated: {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                        <button
                            onClick={fetchData}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title="Refresh data"
                        >
                            <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <div className="flex items-center gap-2 text-[#17A2B8] text-sm p-2 bg-[#17A2B8]/10 rounded-lg">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                <Tabs defaultValue="weather" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="weather" className="text-xs">Weather</TabsTrigger>
                        <TabsTrigger value="events" className="text-xs">Events</TabsTrigger>
                        <TabsTrigger value="holidays" className="text-xs">Holidays</TabsTrigger>
                    </TabsList>

                    {/* Weather Tab */}
                    <TabsContent value="weather" className="mt-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-muted-foreground">5-Day Weather Outlook</p>
                            {getSourceBadge(data.weatherSource)}
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {data.weather.map((day, i) => (
                                <div
                                    key={i}
                                    className={`text-center p-3 rounded-lg transition-all ${day.isRainy
                                        ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
                                        : day.isHotDay
                                            ? 'bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800'
                                            : 'bg-muted/50'
                                        }`}
                                >
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
                                    </p>
                                    <div className="my-2 flex justify-center">{getWeatherIcon(day.condition)}</div>
                                    <p className="text-sm font-bold text-foreground">{Math.round(day.temperatureHigh)}°</p>
                                    <p className="text-xs text-muted-foreground">{Math.round(day.temperatureLow)}°</p>
                                    <div className="mt-2 flex items-center justify-center gap-1">
                                        <Droplets className="h-3 w-3 text-blue-400" />
                                        <span className="text-xs text-muted-foreground">{day.precipitationProbability}%</span>
                                    </div>
                                    <div className="flex justify-center mt-1">{getImpactIcon(day.demandImpact)}</div>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3 text-center">
                            <TrendingUp className="h-3 w-3 inline text-emerald-500" /> Hot days increase beverage demand •
                            <TrendingDown className="h-3 w-3 inline text-red-500 ml-2" /> Rain decreases foot traffic
                        </p>
                    </TabsContent>

                    {/* Events Tab */}
                    <TabsContent value="events" className="mt-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-muted-foreground">Upcoming Events (Next 30 Days)</p>
                            {getSourceBadge(data.eventsSource)}
                        </div>
                        {data.events.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No upcoming events in the next 30 days</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {data.events.slice(0, 5).map((event) => (
                                    <div
                                        key={event.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${getImpactBadge(event.expectedImpact)}`}>
                                                <PartyPopper className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{event.name}</p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>
                                                        {new Date(event.date).toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            weekday: "short",
                                                        })}
                                                    </span>
                                                    {event.daysUntil !== undefined && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            {event.daysUntil === 0 ? "Today" : `${event.daysUntil} days`}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={getImpactBadge(event.expectedImpact)}>
                                                {event.demandMultiplier}x
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Holidays Tab */}
                    <TabsContent value="holidays" className="mt-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-muted-foreground">Sri Lanka Public Holidays {new Date().getFullYear()}</p>
                            {getSourceBadge(data.holidaysSource)}
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {data.holidays.map((holiday) => {
                                const holidayDate = new Date(holiday.date)
                                const isPast = holidayDate < new Date()
                                const isToday = holidayDate.toDateString() === new Date().toDateString()

                                return (
                                    <div
                                        key={holiday.id}
                                        className={`flex items-center justify-between p-2 rounded-lg transition-colors ${isToday
                                            ? 'bg-primary/10 border border-primary/30'
                                            : isPast
                                                ? 'bg-muted/30 opacity-60'
                                                : 'bg-muted/50 hover:bg-muted'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Calendar className={`h-4 w-4 ${isToday ? 'text-primary' : 'text-muted-foreground'}`} />
                                            <div>
                                                <p className={`text-sm ${isToday ? 'font-bold text-primary' : 'font-medium text-foreground'}`}>
                                                    {holiday.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {holidayDate.toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        weekday: "short",
                                                    })}
                                                    {isToday && <span className="ml-2 text-primary font-medium">• Today!</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className={`text-xs ${holiday.type === 'public' ? 'bg-blue-100 text-blue-700' : ''}`}
                                        >
                                            {holiday.type}
                                        </Badge>
                                    </div>
                                )
                            })}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
