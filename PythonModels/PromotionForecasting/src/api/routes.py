from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel
from datetime import date

from src.domain.entities import SKUInfo, Constraint, ObjectiveType, PromotionPlan, PromotionCandidate, PromotionType, SimulationRequest
from src.agents.orchestrator import Orchestrator

router = APIRouter()
orchestrator = Orchestrator()

@router.post("/simulate/sku")
def simulate_sku(request: SimulationRequest):
    """
    Micro-simulation: Asks agents what would happen if we discounted THIS sku by THIS amount.
    """
    try:
        sku = request.sku
        discount = request.test_discount
        duration = request.duration_days
        
        # 1. Get Context (Uses Orchestrator's shared cache)
        context_df = orchestrator._load_shared_context()
        
        # 2. Ask Futurist (Baseline)
        baseline = orchestrator.futurist.predict_baseline(sku, duration, context_df)
        
        # 3. Ask Marketer (Uplift)
        uplift = orchestrator.marketer.estimate_uplift(sku, discount, duration, context_df)
        
        # 4. Ask Steward (Risk)
        risks = orchestrator.steward.analyze_risk(sku, baseline + uplift, duration)
        
        # 5. Financials
        promo_price = sku.base_price * (1 - discount)
        
        # True Revenue Lift = (Total Promo Revenue) - (Total Baseline Revenue)
        total_promo_revenue = (baseline + uplift) * promo_price
        total_baseline_revenue = baseline * sku.base_price
        revenue_lift = total_promo_revenue - total_baseline_revenue
        
        # True Profit Lift = (Total Promo Profit) - (Total Baseline Profit)
        total_promo_profit = (baseline + uplift) * (promo_price - sku.cost_price)
        total_baseline_profit = baseline * (sku.base_price - sku.cost_price)
        profit_lift = total_promo_profit - total_baseline_profit
        
        return {
            "sku_id": sku.sku_id,
            "baseline": baseline,
            "uplift": uplift,
            "revenue_lift": revenue_lift,
            "profit_lift": profit_lift,
            "risks": risks
        }
        
    except Exception as e:
        print(f"Simon Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class PlanRequest(BaseModel):
    skus: List[SKUInfo]
    constraints: Constraint
    objective: ObjectiveType = ObjectiveType.MAX_PROFIT

@router.post("/plan/generate", response_model=PromotionPlan)
def generate_plan(request: PlanRequest):
    """
    Triggers the Agentic Council to generate an optimized promotion plan.
    """
    try:
        print(f">>> API Request: Planning for {len(request.skus)} SKUs. Objective: {request.objective}")
        plan = orchestrator.run_promotion_planning(
            skus=request.skus,
            constraints=request.constraints,
            objective=request.objective
        )
        return plan
    except Exception as e:
        print(f"API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/train")
def trigger_training():
    """
    Triggers the ML Training Pipeline (Async recommendation in prod).
    """
    from train import train_pipeline
    try:
        train_pipeline()
        return {"status": "Training Complete", "models": ["HybridForecaster", "TLearnerUplift"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
