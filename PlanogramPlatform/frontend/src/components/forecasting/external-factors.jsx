import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Megaphone, PartyPopper, ShoppingBag, Tag, Loader2 } from "lucide-react"
import { api } from "@/api/client"

const typeConfig = {
    holiday: { icon: PartyPopper, color: "bg-red-50 text-red-600" },
    public: { icon: PartyPopper, color: "bg-red-50 text-red-600" },
    bank: { icon: Calendar, color: "bg-blue-50 text-blue-600" },
    promotion: { icon: Tag, color: "bg-emerald-50 text-emerald-600" },
    local_event: { icon: Megaphone, color: "bg-blue-50 text-blue-600" },
    season: { icon: ShoppingBag, color: "bg-amber-50 text-amber-600" },
    observance: { icon: Calendar, color: "bg-slate-50 text-slate-600" },
}

export function ExternalFactors() {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [source, setSource] = useState("")

    useEffect(() => {
        async function fetchData() {
            try {
                const eventsData = await api.getEvents("Colombo", "LK")

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
            <Card className="bg-white border-slate-100 shadow-sm rounded-xl overflow-hidden h-[400px]">
                <CardContent className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                    <span className="ml-2 text-slate-500 text-sm">Loading events...</span>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-white border-slate-100 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-white">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2.5 text-slate-800">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                            <Calendar className="h-4 w-4 text-indigo-600" />
                        </div>
                        External Factors
                    </CardTitle>
                    <Badge
                        variant="outline"
                        className={`text-xs ${source === "ics_calendar"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                    >
                        {source === "ics_calendar" ? "Live Calendar" : "Mock Data"}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-4 bg-white">
                {/* Upcoming Events */}
                <div className="space-y-3">
                    {events.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <PartyPopper className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No upcoming events found</p>
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
                                <div key={event.id} className="rounded-lg border border-slate-100 p-3 hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex items-start gap-3">
                                            <div className={`p-1.5 rounded-md ${typeInfo.color.split(' ')[0]} bg-opacity-50`}>
                                                <TypeIcon className={`h-4 w-4 ${typeInfo.color.split(' ')[1]}`} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-slate-800 line-clamp-1">{event.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-xs text-slate-500">
                                                        {new Date(event.date).toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            weekday: "short",
                                                        })}
                                                    </p>
                                                    {event.daysUntil !== undefined && (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${event.daysUntil <= 3
                                                                ? "bg-indigo-50 text-indigo-700 border-indigo-100 font-medium"
                                                                : "bg-slate-50 text-slate-500 border-slate-100"
                                                            }`}>
                                                            {event.daysUntil === 0 ? "Today" : `${event.daysUntil} days away`}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className={`text-[10px] px-1.5 h-5 shrink-0 shadow-none border ${event.expectedImpact === "high"
                                                ? "bg-red-50 text-red-700 border-red-100"
                                                : event.expectedImpact === "medium"
                                                    ? "bg-amber-50 text-amber-700 border-amber-100"
                                                    : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                }`}
                                        >
                                            +{Math.round((impactMultiplier - 1) * 100)}%
                                        </Badge>
                                    </div>
                                    <div className="pl-[42px] flex flex-wrap gap-1.5">
                                        {event.affectedCategories.map((cat) => (
                                            <span key={cat} className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded capitalize">
                                                {cat === "all" ? "Store-wide" : cat}
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
