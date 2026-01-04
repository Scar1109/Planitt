import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Calendar, Loader2, TrendingUp, Clock, BarChart3 } from "lucide-react"
import { api } from "@/api/client"

export function SeasonalTrends() {
    const [viewMode, setViewMode] = useState("weekly")
    const [chartData, setChartData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [stats, setStats] = useState({ growth: "0", avgDemand: 0, peakDay: "" })

    useEffect(() => {
        const fetchSeasonalData = async () => {
            try {
                // Hardcoded realistic data for demo purposes as requested
                // Simulating API delay
                await new Promise(resolve => setTimeout(resolve, 800))

                if (viewMode === "weekly") {
                    // Weekly pattern: High weekends, mid-week dip
                    const weeklyData = [
                        { day: "Sun", "This Week": 450, "Last Week": 412, "2 Weeks Ago": 395 },
                        { day: "Mon", "This Week": 320, "Last Week": 298, "2 Weeks Ago": 315 },
                        { day: "Tue", "This Week": 290, "Last Week": 285, "2 Weeks Ago": 292 },
                        { day: "Wed", "This Week": 310, "Last Week": 305, "2 Weeks Ago": 302 },
                        { day: "Thu", "This Week": 340, "Last Week": 332, "2 Weeks Ago": 328 },
                        { day: "Fri", "This Week": 410, "Last Week": 388, "2 Weeks Ago": 375 },
                        { day: "Sat", "This Week": 480, "Last Week": 465, "2 Weeks Ago": 445 },
                    ]
                    setChartData(weeklyData)
                    setStats({ growth: "14.2", avgDemand: 371, peakDay: "Saturday" })
                } else {
                    // Daily pattern: 14 days forecast with rising trend
                    const today = new Date()
                    // Base pattern
                    const baseValues = [42, 38, 35, 39, 45, 58, 65, 41, 36, 34, 38, 48, 62, 68]

                    const dailyData = baseValues.map((val, i) => {
                        const date = new Date(today)
                        date.setDate(today.getDate() + i)
                        const forecastVal = val * 5 // Scaling for visuals
                        return {
                            day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            "Forecast": forecastVal,
                            "Trend": Math.round(forecastVal * 0.92)
                        }
                    })

                    setChartData(dailyData)
                    // Peak is the last day in this sequence
                    setStats({ growth: "8.4", avgDemand: 230, peakDay: dailyData[13].day })
                }

                setError(null)
            } catch (err) {
                console.error("Error setting mock data:", err)
                setError("Failed to load data")
            } finally {
                setLoading(false)
            }
        }

        fetchSeasonalData()
    }, [viewMode])

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-4/10">
                            <Calendar className="h-4 w-4 text-chart-4" />
                        </div>
                        <span>Demand Patterns</span>
                        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </CardTitle>
                    <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                        <button
                            onClick={() => setViewMode("weekly")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === "weekly"
                                ? "bg-white text-indigo-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"}`}
                        >
                            Weekly
                        </button>
                        <button
                            onClick={() => setViewMode("daily")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === "daily"
                                ? "bg-white text-indigo-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"}`}
                        >
                            Daily
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {loading && (
                    <div className="h-[280px] flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">Loading patterns...</span>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="h-[280px] flex items-center justify-center">
                        <div className="text-center space-y-2">
                            <p className="text-destructive font-medium">Error loading data</p>
                            <p className="text-sm text-muted-foreground">{error}</p>
                        </div>
                    </div>
                )}
                {!loading && !error && (
                    <>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="hsl(var(--border))"
                                        strokeOpacity={0.5}
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="day"
                                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                                        axisLine={{ stroke: "hsl(var(--border))" }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--popover))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "10px",
                                            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                                            padding: "10px 12px",
                                        }}
                                        formatter={(value) => [`${value} units`, ""]}
                                    />
                                    <Legend
                                        wrapperStyle={{ paddingTop: "10px" }}
                                        formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                                    />
                                    {viewMode === "weekly" ? (
                                        <>
                                            <Bar dataKey="2 Weeks Ago" fill="hsl(var(--muted-foreground))" opacity={0.3} radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Last Week" fill="hsl(var(--info))" opacity={0.6} radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="This Week" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                        </>
                                    ) : (
                                        <>
                                            <Bar dataKey="Trend" fill="hsl(var(--muted-foreground))" opacity={0.3} radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Forecast" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                        </>
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3">
                            <div className="rounded-lg bg-muted/50 p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                                    <TrendingUp className="h-3 w-3" />
                                    <span className="text-[10px] uppercase tracking-wide font-medium">
                                        {viewMode === "weekly" ? "Weekend Lift" : "Variance"}
                                    </span>
                                </div>
                                <p className="text-lg font-bold text-success">+{stats.growth}%</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                                    <BarChart3 className="h-3 w-3" />
                                    <span className="text-[10px] uppercase tracking-wide font-medium">
                                        {viewMode === "weekly" ? "Daily Avg" : "Avg Forecast"}
                                    </span>
                                </div>
                                <p className="text-lg font-bold text-foreground">{stats.avgDemand}</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                                    <Clock className="h-3 w-3" />
                                    <span className="text-[10px] uppercase tracking-wide font-medium">Peak Day</span>
                                </div>
                                <p className="text-lg font-bold text-foreground">{stats.peakDay}</p>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}