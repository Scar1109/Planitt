import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Megaphone, PartyPopper, ShoppingBag, Tag, Sun, CloudRain, Loader2 } from "lucide-react"
import { api } from "@/api/client"

const typeConfig = {
    holiday: { icon: PartyPopper, color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
    public: { icon: PartyPopper, color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
    bank: { icon: Calendar, color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
    promotion: { icon: Tag, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
    local_event: { icon: Megaphone, color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
    season: { icon: ShoppingBag, color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
    observance: { icon: Calendar, color: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300" },
}

export function ExternalFactors() {
    const [events, setEvents] = useState([])
    const [weather, setWeather] = useState([])
    const [loading, setLoading] = useState(true)
    const [source, setSource] = useState("")

    useEffect(() => {
        async function fetchData() {
            try {
                const [eventsData, weatherData] = await Promise.all([
                    api.getEvents("Colombo", "LK"),
                    api.getWeather("Colombo", 5),
                ])

                // Transform events data
                const transformedEvents = eventsData.events?.map((event) => ({
                    id: event.id,
                    name: event.name,
                    date: event.date,
                    daysUntil: event.daysUntil,
                    type: event.type,
                    expectedImpact: event.expectedImpact,
                    demandMultiplier: event.demandMultiplier,
                    affectedCategories: event.affectedCategories || ["all"],
                    weekday: event.weekday,
                })) || []

                setEvents(transformedEvents)
                setWeather(weatherData.forecast?.slice(0, 5) || [])
                setSource(eventsData.source || "unknown")
            } catch (error) {
                console.error("Failed to fetch external data:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    if (loading) {
        return (
            <Card className="border-border">
                <CardContent className="p-6 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading external factors...</span>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-border">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <Calendar className="h-5 w-5 text-primary" />
                        External Factors
                    </CardTitle>
                    <Badge
                        variant="outline"
                        className={`text-xs ${source === "ics_calendar" || source === "openweathermap"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                    >
                        {source === "ics_calendar" || source === "openweathermap" ? "✓ Live" : "Mock"}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {/* Weather Summary */}
                {weather.length > 0 && (
                    <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-amber-50 dark:from-blue-950 dark:to-amber-950">
                        <p className="text-xs text-muted-foreground mb-2">Weather Outlook</p>
                        <div className="flex gap-3">
                            {weather.slice(0, 5).map((day, i) => (
                                <div key={i} className="flex-1 text-center">
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
                                    </p>
                                    <div className="my-1 flex justify-center">
                                        {day.condition?.toLowerCase().includes("rain") ? (
                                            <CloudRain className="h-4 w-4 text-blue-500" />
                                        ) : (
                                            <Sun className="h-4 w-4 text-amber-500" />
                                        )}
                                    </div>
                                    <p className="text-xs font-medium">{Math.round(day.temperatureHigh)}°</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Upcoming Events */}
                <div className="space-y-3">
                    {events.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                            <PartyPopper className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No upcoming events in the next 30 days</p>
                        </div>
                    ) : (
                        events.map((event) => {
                            const typeInfo = typeConfig[event.type] || typeConfig.holiday
                            const TypeIcon = typeInfo.icon
                            const impactMultiplier = event.demandMultiplier || (
                                event.expectedImpact === "high" ? 1.4 :
                                    event.expectedImpact === "medium" ? 1.2 : 1.1
                            )

                            return (
                                <div key={event.id} className="rounded-lg border border-border bg-background p-3 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-2">
                                            <div className={`p-1.5 rounded ${typeInfo.color}`}>
                                                <TypeIcon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground text-sm">{event.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(event.date).toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            weekday: "short",
                                                        })}
                                                    </p>
                                                    {event.daysUntil !== undefined && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            {event.daysUntil === 0 ? "Today!" : `in ${event.daysUntil} days`}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className={`text-xs shrink-0 ${event.expectedImpact === "high"
                                                ? "bg-red-100 text-red-700"
                                                : event.expectedImpact === "medium"
                                                    ? "bg-amber-100 text-amber-700"
                                                    : "bg-emerald-100 text-emerald-700"
                                                }`}
                                        >
                                            +{Math.round((impactMultiplier - 1) * 100)}% demand
                                        </Badge>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {event.affectedCategories.map((cat) => (
                                            <span key={cat} className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground capitalize">
                                                {cat === "all" ? "All Categories" : cat}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
