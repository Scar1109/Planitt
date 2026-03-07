
import { ForecastChart } from "@/components/forecasting/forecast-chart"
import { WeatherImpact } from "@/components/forecasting/weather-impact"
import { SeasonalTrends } from "@/components/forecasting/seasonal-trends"
import { ProductForecasts } from "@/components/forecasting/product-forecasts"

import { ExternalFactors } from "@/components/forecasting/external-factors"
import { AgentInventoryForecast } from "@/components/forecasting/agent-inventory-forecast"
import { LowStockAlerts } from "@/components/forecasting/low-stock-alerts"
import { AdaptiveLearning } from "@/components/forecasting/adaptive-learning"

export default function Forecasting() {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Demand Forecasting</h1>
                    <p className="text-slate-500 mt-1">ML-powered predictions with weather and event integration</p>
                </div>
            </div>



            {/* AI Agent-Based Inventory Forecast + Low Stock Alerts Side by Side */}
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <AgentInventoryForecast />
                </div>
                <div>
                    <LowStockAlerts />
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <ForecastChart />
                    <SeasonalTrends />
                </div>
                <div className="space-y-6">
                    <AdaptiveLearning />
                    <WeatherImpact />
                    <ExternalFactors />

                </div>
            </div>

            {/* Product Forecasts Table */}
            <ProductForecasts />
        </div>
    )
}
