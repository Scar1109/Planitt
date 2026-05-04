import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import {
    Package,
    BarChart3,
    CloudRain,
    Sun,
    Snowflake,
    Truck,
    Activity,
    RotateCcw,
    Zap,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    Lightbulb,
    TrendingDown,
    Loader2,
} from "lucide-react"
import api from "../../api/client"
import { buildScenarioForecast, getScenarioDefaults } from "./scenario-engine"

const WEATHER_OPTIONS = [
    { value: "normal", label: "Normal", icon: Activity, desc: "Typical conditions" },
    { value: "rainy", label: "Rainy", icon: CloudRain, desc: "Reduced foot traffic" },
    { value: "hot", label: "Hot", icon: Sun, desc: "Increased demand" },
    { value: "cool", label: "Cool", icon: Snowflake, desc: "Seasonal shift" },
]

const DELAY_OPTIONS = [
    { value: 0, label: "On time" },
    { value: 3, label: "1 week" },
    { value: 7, label: ">1 week" },
]

const getCurrentStock = (product) => {
    const candidates = [
        product?.currentStock,
        product?.closingStock,
        product?.availableStock,
        product?.stockOnHand,
        product?.quantityOnHand,
        product?.quantity,
        product?.stock,
    ]
    const firstNumeric = candidates.find((value) => Number.isFinite(Number(value)))
    return Math.max(0, Math.round(Number(firstNumeric) || 0))
}

export function WhatIfScenarioPanel({ forecastData, selectedProductData, horizon = 7 }) {
    const selectedProductStock = getCurrentStock(selectedProductData)
    const [scenario, setScenario] = useState(getScenarioDefaults(selectedProductStock))
    const [isSimulating, setIsSimulating] = useState(false)
    const [aiResult, setAiResult] = useState(null)
    const [debouncedScenario, setDebouncedScenario] = useState(scenario)

    useEffect(() => {
        setScenario(getScenarioDefaults(selectedProductStock))
    }, [selectedProductData, selectedProductStock])

    // Debounce the scenario input
    useEffect(() => {
        setIsSimulating(true)
        const handler = setTimeout(() => {
            setDebouncedScenario(scenario)
        }, 500)
        return () => clearTimeout(handler)
    }, [scenario])

    const forecasts = forecastData?.data?.forecasts || []
    const baseTotalDemand = forecasts.reduce((sum, item) => sum + (item.forecast || 0), 0)
    const baseAvgDailyDemand = forecasts.length > 0 ? baseTotalDemand / forecasts.length : 0

    const baseMetrics = forecastData?.success ? {
        totalDemand: baseTotalDemand,
        avgDailyDemand: baseAvgDailyDemand,
        horizonDays: horizon,
        currentStock: selectedProductStock,
        recommendation: forecastData.data?.recommendation || "sufficient",
        urgency: forecastData.data?.insights?.urgency || "low",
    } : null

    // Fetch from AI backend when debounced scenario changes
    useEffect(() => {
        if (!baseMetrics) return;
        
        let isMounted = true;
        
        const fetchAiScenario = async () => {
            try {
                const result = await api.simulateInventoryScenario({
                    baseMetrics,
                    scenario: debouncedScenario
                });
                if (isMounted && result.success) {
                    setAiResult(result.data)
                }
            } catch (error) {
                console.error("Failed to simulate AI scenario", error)
                // Fallback to local math if API fails
                if (isMounted) {
                    setAiResult(buildScenarioForecast(baseMetrics, debouncedScenario))
                }
            } finally {
                if (isMounted) setIsSimulating(false)
            }
        }
        
        fetchAiScenario()
        
        return () => { isMounted = false }
    }, [debouncedScenario, baseTotalDemand, horizon])

    const scenarioResult = aiResult || (baseMetrics ? buildScenarioForecast(baseMetrics, scenario) : null)
    const scenarioWeather = WEATHER_OPTIONS.find((option) => option.value === scenario.weather) || WEATHER_OPTIONS[0]
    const demandDeltaPct = baseTotalDemand > 0
        ? Math.round((((scenarioResult?.adjustedDemand || 0) - baseTotalDemand) / baseTotalDemand) * 100)
        : 0
    const isStockout = scenarioResult?.stockCoverageDays < 1
    const confidenceLevel = scenarioResult?.riskLevel === "medium" ? "Medium" : "High"

    const updateScenario = (key, value) => {
        setScenario((prev) => ({ ...prev, [key]: value }))
    }

    const resetScenario = () => {
        setScenario(getScenarioDefaults(selectedProductStock))
    }

    if (!forecastData?.success || !scenarioResult) {
        return null
    }

    return (
        <Card className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <CardContent className="p-4 sm:p-5">
                <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Scenario Inputs</h4>
                                <p className="mt-0.5 text-[11px] text-slate-400">Adjust the factors below to see potential impact</p>
                            </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={resetScenario}
                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
                                    >
                                        <RotateCcw className="h-3 w-3" />
                                        Reset
                                    </button>
                                    {isSimulating ? (
                                        <div className="flex items-center gap-1.5 px-2">
                                            <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                                            <span className="text-[11px] font-semibold text-emerald-600">Calculating...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 px-2">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[11px] font-semibold text-emerald-600">Live AI</span>
                                        </div>
                                    )}
                                </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-white p-3.5 transition-colors hover:border-slate-300">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
                                            <Package className="h-3.5 w-3.5 text-slate-600" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700">Current Stock</span>
                                    </div>
                                    <Badge variant="outline" className="h-5 border-slate-200 bg-slate-50 px-1.5 py-0 text-[10px] font-medium text-slate-500">units</Badge>
                                </div>
                                <Input
                                    type="number"
                                    min="0"
                                    value={scenario.currentStock}
                                    onChange={(event) => updateScenario("currentStock", Math.max(0, Number(event.target.value) || 0))}
                                    className="h-11 border-slate-200 text-xl font-bold text-slate-800 focus:border-[#17A2B8] focus:ring-[#17A2B8]/20"
                                />
                                <p className="mt-2 text-[11px] text-slate-400">Base stock: {selectedProductStock} units from POS</p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-3.5 transition-colors hover:border-slate-300">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                                            <BarChart3 className="h-3.5 w-3.5 text-blue-600" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700">Traffic Change</span>
                                    </div>
                                    <span className={`text-sm font-semibold tabular-nums ${scenario.trafficChangePct > 0 ? "text-emerald-600" : scenario.trafficChangePct < 0 ? "text-red-600" : "text-slate-600"}`}>
                                        {scenario.trafficChangePct > 0 ? "+" : ""}{scenario.trafficChangePct}%
                                    </span>
                                </div>
                                <div className="mt-4 px-1">
                                    <Slider
                                        value={[scenario.trafficChangePct]}
                                        min={-50}
                                        max={100}
                                        step={5}
                                        onValueChange={([value]) => updateScenario("trafficChangePct", value)}
                                    />
                                </div>
                                <div className="mt-3 flex justify-between text-[11px] text-slate-400">
                                    <span>-50% Quiet</span>
                                    <span className="text-slate-300">|</span>
                                    <span>+100% Rush</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-slate-200 bg-white p-3.5 transition-colors hover:border-slate-300">
                                <div className="mb-3 flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50">
                                        <scenarioWeather.icon className="h-3.5 w-3.5 text-sky-600" />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700">Weather</span>
                                </div>
                                <Select value={scenario.weather} onValueChange={(value) => updateScenario("weather", value)}>
                                    <SelectTrigger className="h-10 border-slate-200 bg-white text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {WEATHER_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                <span className="flex items-center gap-2">
                                                    <option.icon className="h-3.5 w-3.5 text-slate-500" />
                                                    {option.label}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="mt-2 text-[11px] text-slate-400">{scenarioWeather.desc}</p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-3.5 transition-colors hover:border-slate-300">
                                <div className="mb-3 flex items-center gap-2">
                                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${scenario.promotionActive ? "bg-emerald-50" : "bg-slate-100"}`}>
                                        <Zap className={`h-3.5 w-3.5 ${scenario.promotionActive ? "text-emerald-600" : "text-slate-400"}`} />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700">Promo</span>
                                </div>
                                <div className="mt-1 flex items-center gap-2.5">
                                    <Switch
                                        checked={scenario.promotionActive}
                                        onCheckedChange={(checked) => updateScenario("promotionActive", checked)}
                                    />
                                    <span className={`text-sm font-medium ${scenario.promotionActive ? "text-emerald-700" : "text-slate-500"}`}>
                                        {scenario.promotionActive ? "On" : "Off"}
                                    </span>
                                </div>
                                <p className="mt-2 text-[11px] text-slate-400">Conservative sales uplift when active</p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-3.5 transition-colors hover:border-slate-300">
                                <div className="mb-3 flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50">
                                        <Truck className="h-3.5 w-3.5 text-orange-600" />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700">Delay</span>
                                </div>
                                <div className="mt-1 flex overflow-hidden rounded-lg border border-slate-200">
                                    {DELAY_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => updateScenario("supplierDelayDays", option.value)}
                                            className={`flex-1 py-2 text-xs font-medium transition-all ${scenario.supplierDelayDays === option.value
                                                ? "bg-[#1B4F72] text-white"
                                                : "bg-white text-slate-600 hover:bg-slate-50"
                                                } ${option.value !== 7 ? "border-r border-slate-200" : ""}`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-2 text-[11px] text-slate-400">Expected delivery timing</p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <Lightbulb className="h-4 w-4 text-[#1B4F72]" />
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Why the Recommendation Changed</p>
                            </div>
                            <div className="space-y-2 relative">
                                {isSimulating && (
                                    <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg">
                                        <Loader2 className="h-5 w-5 animate-spin text-[#1B4F72]" />
                                    </div>
                                )}
                                {(scenarioResult.explanations || []).map((reason, index) => (
                                    <div key={index} className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                                        <span>{reason}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3.5">
                        <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">AI Recommendation</h4>

                        <div className="rounded-xl bg-[#1B4F72] px-5 py-4 text-white shadow-lg border border-[#164060]">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200/70 mb-1">Suggested Reorder</p>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-3xl font-black tabular-nums">{scenarioResult.recommendedQuantity}</span>
                                        <span className="text-xs font-semibold text-blue-300/50">units</span>
                                    </div>
                                </div>
                                <div className="h-10 w-px bg-white/10" />
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200/70 mb-1">Demand Δ</p>
                                    <p className={`flex items-center justify-end gap-1.5 text-lg font-bold tabular-nums ${demandDeltaPct > 0 ? "text-emerald-400" : demandDeltaPct < 0 ? "text-red-400" : "text-white"}`}>
                                        {demandDeltaPct < 0 && <TrendingDown className="h-4 w-4" />}
                                        {demandDeltaPct > 0 ? "↑" : ""} {Math.abs(demandDeltaPct)}%
                                        <span className="ml-1 text-[10px] font-normal text-blue-300/40">vs base</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="mb-2 flex items-center gap-1.5">
                                    <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-50">
                                        <BarChart3 className="h-3 w-3 text-blue-600" />
                                    </div>
                                    <p className="text-[11px] font-semibold text-slate-500">Adjusted Demand</p>
                                </div>
                                <p className="text-lg font-bold tabular-nums text-slate-800">{scenarioResult.adjustedDemand} <span className="text-xs font-medium text-slate-400">units</span></p>
                                <p className="mt-0.5 text-[11px] text-slate-400">{scenarioResult.adjustedAvgDailyDemand} units/day avg</p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="mb-2 flex items-center gap-1.5">
                                    <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-50">
                                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                    </div>
                                    <p className="text-[11px] font-semibold text-slate-500">Stock Coverage</p>
                                </div>
                                <p className="text-lg font-bold tabular-nums text-slate-800">{scenarioResult.stockCoverageDays} <span className="text-xs font-medium text-slate-400">days</span></p>
                                <Progress value={Math.min(100, (scenarioResult.stockCoverageDays / Math.max(horizon, 1)) * 100)} className="mt-3 h-2" />
                                <p className="mt-2 text-[11px] text-slate-400">vs target coverage: {horizon} days</p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="mb-2 flex items-center gap-1.5">
                                    <div className={`flex h-5 w-5 items-center justify-center rounded ${scenarioResult.shortfallUnits > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
                                        <AlertTriangle className={`h-3 w-3 ${scenarioResult.shortfallUnits > 0 ? "text-red-500" : "text-emerald-600"}`} />
                                    </div>
                                    <p className="text-[11px] font-semibold text-slate-500">Shortfall</p>
                                </div>
                                <p className={`text-lg font-bold tabular-nums ${scenarioResult.shortfallUnits > 0 ? "text-red-600" : "text-emerald-600"}`}>
                                    {scenarioResult.shortfallUnits > 0 ? `-${scenarioResult.shortfallUnits}` : `+${scenarioResult.surplusUnits}`} <span className="text-xs font-medium text-slate-400">units</span>
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-400">vs projected demand</p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="mb-2 flex items-center gap-1.5">
                                    <div className="flex h-5 w-5 items-center justify-center rounded bg-orange-50">
                                        <Truck className="h-3 w-3 text-orange-600" />
                                    </div>
                                    <p className="text-[11px] font-semibold text-slate-500">Lead-time Pressure</p>
                                </div>
                                <p className="text-lg font-bold tabular-nums text-slate-800">{scenario.supplierDelayDays} <span className="text-xs font-medium text-slate-400">day delay</span></p>
                                <p className="mt-0.5 text-[11px] text-slate-400">Cover ~{scenarioResult.supplierWindowDemand} units before delivery</p>
                            </div>
                        </div>

                    </div>
                </div>

            </CardContent>
        </Card>
    )
}
