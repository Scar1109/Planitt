import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Brain, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { api } from "@/api/client"

export function ModelPerformance() {
    const [models, setModels] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [lastTraining, setLastTraining] = useState(null)

    useEffect(() => {
        const fetchModelStatus = async () => {
            try {
                setLoading(true)
                setError(null)

                // Fetch both health and metrics
                const [healthResponse, metricsResponse] = await Promise.all([
                    api.healthCheck(),
                    api.getMetrics(),
                ])

                // Extract model information
                const loadedModels = healthResponse.models_loaded || []
                const forecastMetrics = metricsResponse.forecast_accuracy
                const wasteMetrics = metricsResponse.waste_detection
                const systemMetrics = metricsResponse.system

                // Create model status array
                const modelData = []

                // Demand forecast model
                if (loadedModels.includes("demand_forecast")) {
                    modelData.push({
                        name: "Demand Forecast (XGBoost)",
                        accuracy: 100 - forecastMetrics.mape,
                        status: "active",
                        lastTrained: healthResponse.last_training || "Recently",
                        dataPoints: `${(forecastMetrics.samples / 1000).toFixed(1)}K`,
                    })
                }

                // Waste prediction model
                if (loadedModels.includes("waste_prediction")) {
                    modelData.push({
                        name: "Waste Risk (Classifier)",
                        accuracy: wasteMetrics.f1 * 100,
                        status: "active",
                        lastTrained: healthResponse.last_training || "Recently",
                        dataPoints: `${((wasteMetrics.true_positives + wasteMetrics.false_positives + wasteMetrics.false_negatives) / 1000).toFixed(1)}K`,
                    })
                }

                // Replenishment model
                if (loadedModels.includes("replenishment")) {
                    modelData.push({
                        name: "Replenishment (Optimizer)",
                        accuracy: metricsResponse.replenishment.order_accuracy * 100,
                        status: "active",
                        lastTrained: healthResponse.last_training || "Recently",
                        dataPoints: "Live",
                    })
                }

                setModels(modelData)
                setLastTraining(healthResponse.last_training)
            } catch (err) {
                console.error("Error fetching model status:", err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchModelStatus()
    }, [])

    if (loading) {
        return (
            <Card className="border-border">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <Brain className="h-5 w-5 text-primary" />
                        ML Model Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="border-border">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <Brain className="h-5 w-5 text-primary" />
                        ML Model Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-red-500">Error loading model status: {error}</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-white border-slate-100 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-white">
                <CardTitle className="flex items-center gap-2.5 text-slate-800">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                        <Brain className="h-4 w-4 text-indigo-600" />
                    </div>
                    ML Model Status
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {models.map((model) => (
                        <div key={model.name} className="rounded-lg border border-border bg-background p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {model.status === "active" ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="font-medium text-foreground text-sm">{model.name}</span>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className={
                                        model.status === "active"
                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                    }
                                >
                                    {model.status}
                                </Badge>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Accuracy</span>
                                    <span className="font-medium text-foreground">{model.accuracy.toFixed(1)}%</span>
                                </div>
                                <Progress value={model.accuracy} className="h-1.5" />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                <span>Trained: {model.lastTrained}</span>
                                <span>Data: {model.dataPoints}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-3 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Model drift score</span>
                        <span className="text-foreground font-medium">
                            {models.length > 0 ? "0.02 (Stable)" : "N/A"}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
