from typing import List
from src.domain.entities import PromotionCandidate, SKUInfo, PromotionPlan

class MarketerAgent:
    """ Wraps Causal Uplift Models """
    def estimate_uplift(self, sku: SKUInfo, discount: float) -> float:
        # Mocking the call to T-Learner for speed in this file
        # In prod, calls self.uplift_model.predict_lift()
        elasticity = 1.5 # Default elasticity
        lift_pct = elasticity * discount
        return sku.stock_level * lift_pct # Simplistic units

class FuturistAgent:
    """ Wraps Hybrid Forecaster """
    def predict_baseline(self, sku: SKUInfo, days: int) -> float:
        # Mocking Hybrid Forecaster
        # In prod, calls self.forecaster.predict()
        avg_daily = sku.stock_level / 20 # Mock velocity
        return avg_daily * days

class NarratorAgent:
    """ The Storyteller """
    def explain_plan(self, plan: List[PromotionCandidate], skus: dict) -> List[PromotionCandidate]:
        for cand in plan:
            sku = skus.get(cand.sku_id)
            if not sku: continue
            
            reasons = []
            if cand.profit_lift > 1000:
                reasons.append(f"High Profit Potential (+{cand.profit_lift:.0f} LKR)")
            if cand.waste_saved > 0:
                reasons.append(f"Prevents Waste of {cand.waste_saved:.0f} units")
                
            cand.reasoning = f"Recommended {cand.promo_type} at {cand.discount_depth*100:.0f}% because: " + ", ".join(reasons)
        return plan
