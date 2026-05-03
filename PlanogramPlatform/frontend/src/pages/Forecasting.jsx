import { useState } from "react"
import { ForecastChart } from "@/components/forecasting/forecast-chart"
import { WeatherImpact } from "@/components/forecasting/weather-impact"

import { ExternalFactors } from "@/components/forecasting/external-factors"
import { AgentInventoryForecast } from "@/components/forecasting/agent-inventory-forecast"
import { WhatIfScenarioPanel } from "@/components/forecasting/whatif-scenario-panel"
import { LowStockAlerts } from "@/components/forecasting/low-stock-alerts"
import { AdaptiveLearning } from "@/components/forecasting/adaptive-learning"

export default function Forecasting() {
    const [agentData, setAgentData] = useState(null)

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Demand Forecasting</h1>
                    <p className="text-slate-500 mt-1">ML-powered predictions with weather and event integration</p>
                </div>
            </div>

            {/* Main Balanced Grid */}
            <div className="grid gap-6 lg:grid-cols-3 items-start">

                {/* Left Area: Wide Charts */}
                <div className="lg:col-span-2 space-y-6">
                    <AgentInventoryForecast onDataChange={setAgentData} />
                    
                    {agentData && (
                        <WhatIfScenarioPanel 
                            forecastData={agentData.forecastData}
                            selectedProductData={agentData.selectedProductData}
                            horizon={agentData.horizon}
                        />
                    )}

                    <ForecastChart />
                    <AdaptiveLearning />
                </div>

                {/* Right Area: List and Info Panels */}
                <div className="space-y-6">
                    <LowStockAlerts />
                    <WeatherImpact />
                    <ExternalFactors />
                </div>
            </div>


        </div>
    )
}
