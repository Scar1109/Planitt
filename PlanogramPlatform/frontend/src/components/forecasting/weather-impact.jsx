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
            const data = await api.getWeather("Colombo", 5)

            // Transform and calculate demand impact
            const transformedWeather = data.forecast?.map((day, index) => {
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
            }) || []

            setWeather(transformedWeather)
            setSource(data.source || "unknown")
            setLocation(data.location || "Colombo")
        } catch (error) {
            console.error("Failed to fetch weather:", error)
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
        return <Sun className="h-6 w-6 text-amber-500" />
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
        <Card className="border-border">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <Cloud className="h-5 w-5 text-primary" />
                        Weather Impact
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className={`text-xs ${source === "openweathermap" || source === "Open-Meteo"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                        >
                            {source === "openweathermap" || source === "Open-Meteo" ? "Live" : "Mock"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{location}</span>
                        <button
                            onClick={fetchWeather}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title="Refresh weather"
                        >
                            <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {weather.map((day) => (
                        <div
                            key={day.date}
                            className={`rounded-lg border p-3 transition-all ${day.impact === "positive"
                                ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-800"
                                : day.impact === "negative"
                                    ? "border-red-200 bg-red-50/50 dark:bg-red-950/30 dark:border-red-800"
                                    : "border-border bg-background"
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {getWeatherIcon(day.condition, day.isRainy)}
                                    <div>
                                        <p className="font-medium text-foreground">{day.day}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Thermometer className="h-3 w-3" />
                                            <span className="font-medium">
                                                {day.temperatureHigh}°/{day.temperatureLow}°C
                                            </span>
                                            <Droplets className="h-3 w-3 ml-1 text-blue-500" />
                                            <span>{day.humidity}%</span>
                                            {day.precipitationProbability > 0 && (
                                                <>
                                                    <CloudRain className="h-3 w-3 ml-1 text-blue-400" />
                                                    <span>{day.precipitationProbability}%</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <Badge className={impactColors[day.impact]}>
                                    {day.impact === "positive" ? "↑ Demand Up" :
                                        day.impact === "negative" ? "↓ Demand Down" :
                                            "→ Normal"}
                                </Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {day.affectedCategories.map((cat, idx) => (
                                    <span
                                        key={idx}
                                        className={`text-xs px-2 py-0.5 rounded ${cat.includes("+")
                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                                            : cat.includes("-") || cat.includes("↓")
                                                ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                                : "bg-muted text-muted-foreground"
                                            }`}
                                    >
                                        {cat}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Weather Legend */}
                <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground text-center">
                        <span className="inline-flex items-center gap-1">
                            <Sun className="h-3 w-3 text-amber-500" /> Hot ({">"}32°C) = +20% beverages
                        </span>
                        <span className="mx-2">•</span>
                        <span className="inline-flex items-center gap-1">
                            <CloudRain className="h-3 w-3 text-blue-500" /> Rain = -10% foot traffic
                        </span>
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
