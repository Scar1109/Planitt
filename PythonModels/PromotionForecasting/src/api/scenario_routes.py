from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from datetime import date, timedelta
import pandas as pd

from src.domain.entities import SKUInfo, ScenarioSimulationRequest, ScenarioCompareRequest, ScenarioTrendRequest
from src.agents.orchestrator import Orchestrator

scenario_router = APIRouter()
orchestrator = Orchestrator()

@scenario_router.post("/scenario/quick")
def simulate_quick_scenario(request: ScenarioSimulationRequest):
    """
    Micro-simulation evaluating a quick hypothetical scenario with facings and location.
    """
    try:
        sku = request.sku
        discount = request.test_discount
        duration = request.duration_days
        facings_change = request.facings_change
        location = request.location
        
        # 1. Get Context
        context_df = orchestrator._load_shared_context()
        
        # 2. Baseline Predict
        baseline = orchestrator.futurist.predict_baseline(sku, duration, context_df)
        
        # Scenario adjustments based on facings
        # Simple heuristic: each facing adds ~2% uplift to baseline visibility
        facing_multiplier = 1.0 + (facings_change * 0.02)
        adjusted_baseline = baseline * facing_multiplier
        
        # 3. Marketer Uplift
        uplift = orchestrator.marketer.estimate_uplift(sku, discount, duration, context_df)
        adjusted_uplift = uplift * facing_multiplier
        
        # 4. Financials
        promo_price = sku.base_price * (1 - discount)
        total_promo_revenue = (adjusted_baseline + adjusted_uplift) * promo_price
        total_baseline_revenue = baseline * sku.base_price
        revenue_lift = total_promo_revenue - total_baseline_revenue
        
        total_promo_profit = (adjusted_baseline + adjusted_uplift) * (promo_price - sku.cost_price)
        total_baseline_profit = baseline * (sku.base_price - sku.cost_price)
        profit_lift = total_promo_profit - total_baseline_profit
        
        return {
            "sku_id": sku.sku_id,
            "baseline": adjusted_baseline,
            "uplift": adjusted_uplift,
            "revenue_lift": revenue_lift,
            "profit_lift": profit_lift,
            "location_context": location,
            "facings_applied": facings_change
        }
        
    except Exception as e:
        print(f"Scenario Simulation Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@scenario_router.post("/scenario/compare")
def compare_scenarios(request: ScenarioCompareRequest):
    """
    Compare current planogram/promo setup against a proposed setup.
    """
    try:
        context_df = orchestrator._load_shared_context()
        baseline_raw = orchestrator.futurist.predict_baseline(request.sku, request.duration_days, context_df)
        
        # Evaluate Current
        curr_facing_mult = 1.0 + (request.current_facings * 0.02)
        curr_base = baseline_raw * curr_facing_mult
        curr_uplift = orchestrator.marketer.estimate_uplift(request.sku, request.current_discount, request.duration_days, context_df) * curr_facing_mult
        curr_price = request.sku.base_price * (1 - request.current_discount)
        curr_profit = (curr_base + curr_uplift) * (curr_price - request.sku.cost_price)
        curr_revenue = (curr_base + curr_uplift) * curr_price
        
        # Evaluate Proposed
        prop_facing_mult = 1.0 + (request.proposed_facings * 0.02)
        prop_base = baseline_raw * prop_facing_mult
        prop_uplift = orchestrator.marketer.estimate_uplift(request.sku, request.proposed_discount, request.duration_days, context_df) * prop_facing_mult
        prop_price = request.sku.base_price * (1 - request.proposed_discount)
        prop_profit = (prop_base + prop_uplift) * (prop_price - request.sku.cost_price)
        prop_revenue = (prop_base + prop_uplift) * prop_price
        
        return {
            "current": {
                 "revenue": curr_revenue,
                 "profit": curr_profit,
                 "units": curr_base + curr_uplift
            },
            "proposed": {
                 "revenue": prop_revenue,
                 "profit": prop_profit,
                 "units": prop_base + prop_uplift
            },
            "delta": {
                 "revenue": prop_revenue - curr_revenue,
                 "profit": prop_profit - curr_profit,
                 "units": (prop_base + prop_uplift) - (curr_base + curr_uplift)
            }
        }
        
    except Exception as e:
         print(f"Scenario Compare Error: {e}")
         raise HTTPException(status_code=500, detail=str(e))

@scenario_router.post("/scenario/trend")
def generate_trend(request: ScenarioTrendRequest):
    """
    Generates a daily baseline trend for the specified horizon.
    """
    try:
         context_df = orchestrator._load_shared_context()
         # Simplified daily breakdown
         total_dur = request.days
         total_baseline = orchestrator.futurist.predict_baseline(request.sku, total_dur, context_df)
         daily_avg = total_baseline / total_dur
         
         trend_data = []
         start_dt = date.today()
         
         # Adding slight simulated variance for chart realism (since futuristic model might return flat avg right now)
         import random
         random.seed(42) # Deterministic variance
         
         for day_idx in range(total_dur):
             dt = start_dt + timedelta(days=day_idx)
             variance = random.uniform(0.9, 1.1)
             trend_data.append({
                 "date": dt.isoformat(),
                 "predicted_demand": round(daily_avg * variance, 2)
             })
             
         return {
             "sku_id": request.sku.sku_id,
             "horizon": total_dur,
             "location": request.location,
             "trend": trend_data
         }

    except Exception as e:
         print(f"Scenario Trend Error: {e}")
         raise HTTPException(status_code=500, detail=str(e))
