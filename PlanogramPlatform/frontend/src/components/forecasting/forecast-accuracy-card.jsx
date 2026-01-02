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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
                <div
                    key={metric.label}
                    className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-colors duration-200"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${metric.bgColor.replace('bg-', 'bg-').replace('/10', '/10')}`}>
                            <metric.icon className={`h-5 w-5 ${metric.color}`} />
                        </div>
                        {metric.trend !== "neutral" && (
                            <span className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${metric.trend === "up" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                }`}>
                                {metric.trend === "up" ? "+" : ""}{metric.change}
                            </span>
                        )}
                        {metric.trend === "neutral" && (
                            <span className="flex items-center text-xs font-medium px-2 py-1 rounded-full bg-slate-50 text-slate-600">
                                {metric.change}
                            </span>
                        )}
                    </div>

                    <h3 className="text-sm font-medium text-slate-500 mb-1">
                        {metric.label}
                    </h3>
                    <p className="text-2xl font-bold text-slate-800">
                        {metric.value}
                    </p>
                </div>
            ))}
        </div>
    )
}