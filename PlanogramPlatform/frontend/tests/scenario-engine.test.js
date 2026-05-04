import assert from "node:assert/strict"
import { buildScenarioForecast } from "../src/components/forecasting/scenario-engine.js"

const baseMetrics = {
    totalDemand: 70,
    avgDailyDemand: 10,
    horizonDays: 7,
    currentStock: 84,
    recommendation: "sufficient",
    urgency: "low",
}

{
    const result = buildScenarioForecast(baseMetrics, {
        currentStock: 84,
        trafficChangePct: 0,
        weather: "normal",
        promotionActive: false,
        supplierDelayDays: 0,
    })

    assert.equal(result.adjustedDemand, 70)
    assert.equal(result.stockCoverageDays, 8.4)
    assert.equal(result.recommendedAction, "Stock is healthy")
    assert.equal(result.recommendedQuantity, 0)
}

{
    const result = buildScenarioForecast(baseMetrics, {
        currentStock: 40,
        trafficChangePct: 20,
        weather: "rainy",
        promotionActive: true,
        supplierDelayDays: 2,
    })

    assert.equal(result.adjustedDemand, 86)
    assert.equal(result.shortfallUnits, 46)
    assert.equal(result.riskLevel, "high")
    assert.equal(result.recommendedAction, "Reorder now")
    assert.equal(result.recommendedQuantity, 54)
}

{
    const result = buildScenarioForecast(baseMetrics, {
        currentStock: 28,
        trafficChangePct: -10,
        weather: "cool",
        promotionActive: false,
        supplierDelayDays: 0,
    })

    assert.equal(result.adjustedDemand, 63)
    assert.equal(result.shortfallUnits, 35)
    assert.equal(result.stockCoverageDays, 3.1)
    assert.match(result.explanations.join(" "), /current stock/i)
}

console.log("scenario-engine tests passed")
