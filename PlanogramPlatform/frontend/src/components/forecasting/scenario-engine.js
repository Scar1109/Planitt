const WEATHER_MULTIPLIERS = {
    normal: 1,
    rainy: 0.98,
    hot: 1.08,
    cool: 1,
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const roundToOne = (value) => Math.round(value * 10) / 10

export function getScenarioDefaults(currentStock = 0) {
    return {
        currentStock: Math.max(0, Math.round(currentStock)),
        trafficChangePct: 0,
        weather: "normal",
        promotionActive: false,
        supplierDelayDays: 0,
    }
}

export function buildScenarioForecast(baseMetrics, scenarioInput) {
    const totalDemand = Math.max(0, Number(baseMetrics?.totalDemand) || 0)
    const avgDailyDemand = Math.max(0, Number(baseMetrics?.avgDailyDemand) || 0)
    const horizonDays = clamp(Math.round(Number(baseMetrics?.horizonDays) || 0), 1, 90)

    const currentStock = Math.max(0, Math.round(Number(scenarioInput?.currentStock) || 0))
    const trafficChangePct = clamp(Number(scenarioInput?.trafficChangePct) || 0, -50, 100)
    const weather = scenarioInput?.weather in WEATHER_MULTIPLIERS ? scenarioInput.weather : "normal"
    const promotionActive = Boolean(scenarioInput?.promotionActive)
    const supplierDelayDays = clamp(Math.round(Number(scenarioInput?.supplierDelayDays) || 0), 0, 14)

    const demandMultiplier =
        (1 + trafficChangePct / 100) *
        WEATHER_MULTIPLIERS[weather] *
        (promotionActive ? 1.05 : 1)

    const adjustedDemand = Math.max(0, Math.round(totalDemand * demandMultiplier))
    const adjustedAvgDailyDemand = adjustedDemand / horizonDays
    const stockCoverageDays = adjustedAvgDailyDemand > 0 ? roundToOne(currentStock / adjustedAvgDailyDemand) : 999
    const shortfallUnits = Math.max(0, adjustedDemand - currentStock)
    const surplusUnits = Math.max(0, currentStock - adjustedDemand)
    const supplierWindowDemand = Math.round(adjustedAvgDailyDemand * supplierDelayDays)
    const effectiveShortfall = Math.max(shortfallUnits, supplierWindowDemand > currentStock ? supplierWindowDemand - currentStock : shortfallUnits)
    const safetyBuffer = Math.max(4, Math.ceil(adjustedAvgDailyDemand * 0.65))
    const recommendedQuantity = effectiveShortfall > 0 ? effectiveShortfall + safetyBuffer : 0

    let riskLevel = "low"
    let recommendedAction = "Stock is healthy"
    let urgency = "low"

    if (shortfallUnits > 0 || stockCoverageDays < Math.min(3, horizonDays)) {
        riskLevel = "high"
        urgency = "high"
        recommendedAction = "Reorder now"
    } else if (stockCoverageDays < Math.min(5, horizonDays) || supplierDelayDays >= 3) {
        riskLevel = "medium"
        urgency = "medium"
        recommendedAction = "Monitor closely"
    } else if (surplusUnits > adjustedAvgDailyDemand * 3) {
        riskLevel = "medium"
        urgency = "low"
        recommendedAction = "Hold off on reordering"
    }

    const demandDelta = adjustedDemand - totalDemand
    const explanations = []

    explanations.push(`Current stock covers about ${stockCoverageDays} day${stockCoverageDays === 1 ? "" : "s"} at the scenario demand level.`)

    if (trafficChangePct !== 0) {
        explanations.push(`Traffic change of ${trafficChangePct > 0 ? "+" : ""}${trafficChangePct}% shifts expected demand ${trafficChangePct > 0 ? "up" : "down"}.`)
    }

    if (weather !== "normal") {
        explanations.push(`Weather set to ${weather} adjusts demand expectations.`)
    }

    if (promotionActive) {
        explanations.push("Promotion lift is active, so the model adds extra demand pressure.")
    }

    if (supplierDelayDays > 0) {
        explanations.push(`Supplier delay of ${supplierDelayDays} day${supplierDelayDays === 1 ? "" : "s"} increases the stock window you need to cover.`)
    }

    if (shortfallUnits > 0) {
        explanations.push(`This scenario creates a projected shortage of ${shortfallUnits} units over the selected horizon.`)
    } else if (surplusUnits > 0) {
        explanations.push(`This scenario leaves a projected surplus of ${surplusUnits} units over the selected horizon.`)
    }

    return {
        adjustedDemand,
        adjustedAvgDailyDemand: roundToOne(adjustedAvgDailyDemand),
        stockCoverageDays,
        shortfallUnits,
        surplusUnits,
        demandDelta,
        supplierWindowDemand,
        recommendedQuantity,
        recommendedAction,
        riskLevel,
        urgency,
        explanations,
    }
}
