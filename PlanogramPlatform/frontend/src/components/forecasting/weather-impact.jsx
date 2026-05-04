import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Cloud, Sun, CloudRain, Thermometer, Droplets, CloudSnow, RefreshCw, Loader2 } from "lucide-react"
import { api } from "@/api/client"

export function WeatherImpact() {
    const [weather, setWeather] = useState([])
    const [loading, setLoading] = useState(true)
    const [source, setSource] = useState("")
    const [location, setLocation] = useState("")

    const fetchWeather = async () => {
        setLoading(true)
        try {
            console.log("🌤️ Fetching weather data...")
            const data = await api.getWeather("Colombo", 5)
            console.log("🌤️ Weather API response:", data)

            if (!data || !data.forecast || data.forecast.length === 0) {
                console.warn("⚠️ No forecast data received from API")
                setWeather([])
                setSource("mock")
                setLocation("Colombo")
                return
            }

            // Transform and calculate demand impact
            const transformedWeather = data.forecast.map((day, index) => {
                const date = new Date(day.date)
                const dayName = index === 0 ? "Today" :
                    index === 1 ? "Tomorrow" :
                        date.toLocaleDateString("en-US", { weekday: "short" })

                // Calculate impact based on weather conditions
                let impact = "neutral"
                let affectedCategories = []

                const isRainy = day.isRainy || day.condition?.toLowerCase().includes("rain")
                const isHot = day.isHotDay || day.temperatureHigh > 32
                const isCold = day.temperatureHigh < 25

                if (isRainy) {
                    impact = "negative"
                    affectedCategories = [
                        "Produce -12%",
                        "Fresh items -8%",
                        "Foot traffic ↓",
                    ]
                } else if (isHot) {
                    impact = "positive"
                    const tempBonus = Math.round((day.temperatureHigh - 30) * 3)
                    affectedCategories = [
                        `Beverages +${18 + tempBonus}%`,
                        `Ice Cream +${25 + tempBonus}%`,
                        "Frozen foods +15%",
                    ]
                } else if (isCold) {
                    impact = "neutral"
                    affectedCategories = [
                        "Hot drinks +10%",
                        "Soups +8%",
                        "Normal demand",
                    ]
                } else {
                    impact = "neutral"
                    affectedCategories = ["Normal demand expected"]
                }

                // Check for weekend boost
                const dayOfWeek = date.getDay()
                if ((dayOfWeek === 5 || dayOfWeek === 6) && impact !== "negative") {
                    impact = "positive"
                    affectedCategories.push("Weekend spike expected")
                }

                return {
                    date: day.date,
                    day: dayName,
                    condition: day.condition || "clear",
                    temperatureHigh: Math.round(day.temperatureHigh),
                    temperatureLow: Math.round(day.temperatureLow),
                    humidity: day.humidity || 65,
                    precipitationProbability: day.precipitationProbability || 0,
                    impact,
                    affectedCategories,
                    isRainy,
                    isHotDay: isHot,
                }
            })

            console.log("🌤️ Transformed weather data:", transformedWeather.length, "days")
            setWeather(transformedWeather)
            setSource(data.source || "unknown")
            setLocation(data.location || "Colombo")
        } catch (error) {
            console.error("❌ Failed to fetch weather:", error)
            setWeather([])
            setSource("error")
            setLocation("Colombo")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchWeather()
        // Refresh every 30 minutes
        const interval = setInterval(fetchWeather, 30 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    const getWeatherIcon = (condition, isRainy) => {
        const cond = condition?.toLowerCase() || ""

        if (isRainy || cond.includes("rain") || cond.includes("drizzle") || cond.includes("thunder")) {
            return <CloudRain className="h-6 w-6 text-blue-500" />
        }
        if (cond.includes("snow")) {
            return <CloudSnow className="h-6 w-6 text-blue-300" />
        }
        if (cond.includes("cloud") || cond.includes("overcast")) {
            return <Cloud className="h-6 w-6 text-gray-500" />
        }
        return <Sun className="h-6 w-6 text-[#17A2B8]" />
    }

    const impactColors = {
        positive: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
        negative: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
        neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    }

    if (loading) {
        return (
            <Card className="border-border">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <Cloud className="h-5 w-5 text-primary" />
                        Weather Impact
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Loading weather data...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-white border-slate-100 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-white">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2.5 text-slate-800">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#17A2B8]/10">
                            <Cloud className="h-4 w-4 text-[#17A2B8]" />
                        </div>
                        Weather Impact
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className={`text-xs ${source && (source.toLowerCase().includes("meteo") || source.toLowerCase().includes("weather"))
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                        >
                            {source && (source.toLowerCase().includes("meteo") || source.toLowerCase().includes("weather")) ? "Live" : "Live"}
                        </Badge>
                        <span className="text-xs text-slate-500">{location}</span>
                        <button
                            onClick={fetchWeather}
                            className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-slate-600"
                            title="Refresh weather"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-4 bg-white">
                {weather.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Cloud className="h-12 w-12 text-slate-200 mb-3" />
                        <p className="text-slate-500 font-medium">Unable to load weather data</p>
                        <p className="text-sm text-slate-400 mt-1">Click refresh to try again</p>
                        <button
                            onClick={fetchWeather}
                            className="mt-3 px-4 py-2 bg-[#17A2B8]/10 text-[#1B4F72] text-sm font-medium rounded-lg hover:bg-[#17A2B8]/10 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                )}
                <div className="space-y-3">
                    {weather.map((day) => (
                        <div
                            key={day.date}
                            className={`rounded-lg border p-3 transition-all ${day.impact === "positive"
                                ? "border-emerald-100 bg-emerald-50/30"
                                : day.impact === "negative"
                                    ? "border-red-100 bg-red-50/30"
                                    : "border-slate-100 bg-white hover:bg-slate-50/50"
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    {getWeatherIcon(day.condition, day.isRainy)}
                                    <div>
                                        <p className="font-semibold text-sm text-slate-800">{day.day}</p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                            <div className="flex items-center gap-1">
                                                <Thermometer className="h-3 w-3" />
                                                <span>{day.temperatureHigh}°/{day.temperatureLow}°</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Droplets className="h-3 w-3 text-blue-400" />
                                                <span>{day.humidity}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <Badge className={`shadow-none border ${day.impact === "positive"
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200"
                                    : day.impact === "negative"
                                        ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                    }`}>
                                    {day.impact === "positive" ? "High Demand" :
                                        day.impact === "negative" ? "Low Demand" :
                                            "Normal"}
                                </Badge>
                            </div>

                            {day.affectedCategories.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pl-[36px]">
                                    {day.affectedCategories.map((cat, idx) => (
                                        <span
                                            key={idx}
                                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cat.includes("+")
                                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                : cat.includes("-") || cat.includes("↓")
                                                    ? "bg-red-50 text-red-600 border border-red-100"
                                                    : "bg-slate-100 text-slate-500 border border-slate-200"
                                                }`}
                                        >
                                            {cat}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Weather Legend */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-3">
                        <span className="inline-flex items-center gap-1">
                            <Sun className="h-3 w-3 text-[#17A2B8]" /> Hot {">"}32°C
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <CloudRain className="h-3 w-3 text-blue-500" /> Rain
                        </span>
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
