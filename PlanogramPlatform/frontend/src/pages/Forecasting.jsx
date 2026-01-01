import { ForecastAccuracyCard } from "@/components/forecasting/forecast-accuracy-card"
import { ForecastChart } from "@/components/forecasting/forecast-chart"
import { WeatherImpact } from "@/components/forecasting/weather-impact"
import { SeasonalTrends } from "@/components/forecasting/seasonal-trends"
import { ProductForecasts } from "@/components/forecasting/product-forecasts"
import { ModelPerformance } from "@/components/forecasting/model-performance"
import { ExternalFactors } from "@/components/forecasting/external-factors"
import { AgentInventoryForecast } from "@/components/forecasting/agent-inventory-forecast"

export default function Forecasting() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Demand Forecasting</h1>
                    <p className="text-muted-foreground">ML-powered predictions with weather and event integration</p>
                </div>
            </div>

            <ForecastAccuracyCard />

            {/* AI Agent-Based Inventory Forecast */}
            <AgentInventoryForecast />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <ForecastChart />
                    <SeasonalTrends />
                </div>
                <div className="space-y-6">
                    <WeatherImpact />
                    <ExternalFactors />
                    <ModelPerformance />
                </div>
            </div>

            <ProductForecasts />
        </div>
    )
}
