import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Target, Activity, BarChart3, Brain, Loader2 } from "lucide-react"
import { api } from "@/api/client"

export function ForecastAccuracyCard() {
    const [metrics, setMetrics] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                setLoading(true)
                setError(null)

                const response = await api.getMetrics()
                const forecastMetrics = response?.forecast_accuracy || { mape: 0, rmse: 0, training_samples: 0 }

                // Use training_samples from the Python API
                const samples = forecastMetrics.training_samples || forecastMetrics.samples || 0;
                const hasData = samples > 0;
                const mape = forecastMetrics.mape || 0;
                const accuracy = Math.max(0, 100 - mape);
                const confidence = Math.max(0, Math.round((1 - mape / 100) * 100));


                const metricsData = [
                    {
                        label: "Forecast Accuracy",
                        value: hasData ? `${accuracy.toFixed(1)}%` : "N/A",
                        change: !hasData ? "No Data" : mape < 10 ? "Excellent" : mape < 15 ? "Good" : "Fair",
                        trend: hasData ? "up" : "neutral",
                        icon: Target,
                        color: hasData ? "text-success" : "text-muted-foreground",
                        bgColor: hasData ? "bg-success/10" : "bg-muted",
                    },
                    {
                        label: "RMSE (Units)",
                        value: (forecastMetrics.rmse || 0).toFixed(1),
                        change: `${samples.toLocaleString()} samples`,
                        trend: "neutral",
                        icon: Activity,
                        color: "text-info",
                        bgColor: "bg-info/10",
                    },
                    {
                        label: "Model Confidence",
                        value: hasData ? `${confidence}%` : "N/A",
                        change: hasData ? "Real-time" : "Calibrating",
                        trend: hasData ? "up" : "neutral",
                        icon: Brain,
                        color: hasData ? "text-primary" : "text-muted-foreground",
                        bgColor: hasData ? "bg-primary/10" : "bg-muted",
                    },
                    {
                        label: "Prediction Horizon",
                        value: "7-30 days",
                        change: "Optimal",
                        trend: "neutral",
                        icon: BarChart3,
                        color: "text-warning",
                        bgColor: "bg-warning/10",
                    },
                ]

                setMetrics(metricsData)
            } catch (err) {
                console.error("Error fetching metrics:", err)
                setError(err instanceof Error ? err.message : "Unknown error")
            } finally {
                setLoading(false)
            }
        }

        fetchMetrics()
    }, [])

    if (loading) {
        return (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="overflow-hidden">
                        <CardContent className="p-5 flex items-center justify-center h-[120px]">
                            <div className="flex items-center gap-3">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                <span className="text-sm text-muted-foreground">Loading...</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-5">
                    <p className="text-sm text-destructive font-medium">Error loading metrics: {error}</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
            {metrics.map((metric) => (
                <Card
                    key={metric.label}
                    className="group relative overflow-hidden hover:border-primary/20 transition-all duration-300"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <CardContent className="p-5 relative">
                        <div className="flex items-start gap-4">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${metric.bgColor} transition-transform duration-300 group-hover:scale-110`}>
                                <metric.icon className={`h-5 w-5 ${metric.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                                    {metric.label}
                                </p>
                                <p className="text-2xl font-bold font-display text-foreground mt-1 tracking-tight">
                                    {metric.value}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    {metric.trend === "up" && (
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success/15">
                                            <svg className="h-2.5 w-2.5 text-success" viewBox="0 0 12 12" fill="none">
                                                <path d="M6 9V3M6 3L3 6M6 3L9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                    )}
                                    {metric.trend === "down" && (
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-destructive/15">
                                            <svg className="h-2.5 w-2.5 text-destructive" viewBox="0 0 12 12" fill="none">
                                                <path d="M6 3V9M6 9L3 6M6 9L9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                    )}
                                    <span className={`text-xs font-medium ${metric.trend === "up" ? "text-success" :
                                        metric.trend === "down" ? "text-destructive" :
                                            "text-muted-foreground"
                                        }`}>
                                        {metric.change}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}