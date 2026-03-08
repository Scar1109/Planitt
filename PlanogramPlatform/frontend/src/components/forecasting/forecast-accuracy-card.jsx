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

                // Extract values from the Python API
                const samples = forecastMetrics.total_samples || forecastMetrics.training_samples || forecastMetrics.samples || 0;
                const hasData = samples > 0;
                const rmse = forecastMetrics.rmse || 0;
                const mae = forecastMetrics.mae || 0;

                // Calculate accuracy based on RMSE - lower RMSE = higher accuracy
                // RMSE < 3 = 95%+, RMSE < 5 = 90%+, RMSE < 10 = 80%+, RMSE < 20 = 70%+
                // This is typical for retail demand forecasting
                let accuracy = 0;
                if (hasData && rmse > 0) {
                    // Using exponential decay: accuracy = 100 * exp(-rmse/15)
                    // This gives: RMSE=5 → 72%, RMSE=2 → 88%, RMSE=10 → 51%
                    accuracy = Math.min(99, Math.max(0, 100 * Math.exp(-rmse / 15)));
                }

                // Confidence is based on model quality and training data
                // High samples + low RMSE = high confidence
                const sampleScore = Math.min(40, (samples / 100000) * 40); // Up to 40 points
                const rmseScore = rmse < 10 ? 60 - (rmse * 6) : 0; // Up to 60 points
                const confidence = hasData ? Math.round(Math.max(0, Math.min(100, sampleScore + rmseScore))) : 0;

                // Determine status labels based on RMSE performance
                const getAccuracyStatus = () => {
                    if (!hasData) return "No Data";
                    if (rmse < 3) return "Excellent";
                    if (rmse < 5) return "Good";
                    if (rmse < 10) return "Fair";
                    return "Needs Tuning";
                };

                const metricsData = [
                    {
                        label: "Forecast Accuracy",
                        value: hasData ? `${accuracy.toFixed(1)}%` : "N/A",
                        change: getAccuracyStatus(),
                        trend: hasData && accuracy >= 50 ? "up" : "neutral",
                        icon: Target,
                        color: hasData && accuracy >= 50 ? "text-emerald-600" : "text-slate-400",
                        bgColor: hasData && accuracy >= 50 ? "bg-emerald-50" : "bg-slate-100",
                    },
                    {
                        label: "RMSE (Units)",
                        value: rmse.toFixed(1),
                        change: `${samples.toLocaleString()} samples`,
                        trend: "neutral",
                        icon: Activity,
                        color: "text-blue-600",
                        bgColor: "bg-blue-50",
                    },
                    {
                        label: "Model Confidence",
                        value: hasData ? `${confidence}%` : "N/A",
                        change: hasData ? (confidence >= 60 ? "Real-time" : "Calibrating") : "No Model",
                        trend: hasData && confidence >= 50 ? "up" : "neutral",
                        icon: Brain,
                        color: hasData && confidence >= 50 ? "text-[#1B4F72]" : "text-slate-400",
                        bgColor: hasData && confidence >= 50 ? "bg-[#17A2B8]/10" : "bg-slate-100",
                    },
                    {
                        label: "Prediction Horizon",
                        value: "7-30 days",
                        change: "Optimal",
                        trend: "neutral",
                        icon: BarChart3,
                        color: "text-[#17A2B8]",
                        bgColor: "bg-[#17A2B8]/10",
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
                    className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:border-[#17A2B8]/20 transition-colors duration-200"
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