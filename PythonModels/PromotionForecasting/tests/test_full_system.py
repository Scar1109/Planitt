import sys
import os
from datetime import date

# Path Hack
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.agents.orchestrator import Orchestrator
from src.domain.entities import SKUInfo, Constraint, ObjectiveType, PromotionType

def test_full_council():
    print(">>> Testing Full Agentic Council...")
    
    # 1. Initialize Council (Loads Models)
    orch = Orchestrator()
    if not orch.futurist.is_ready:
        print("[WARN] Futurist using fallback.")
    if not orch.marketer.is_ready:
        print("[WARN] Marketer using fallback.")
        
    # 2. Define Scenario
    # Real SKU from Dataset: LK-BEV-AG2SR
    # Note: We need real SKUs for the model to find history
    skus = [
        SKUInfo(
            sku_id="LK-BEV-AG2SR", 
            name="Apple Soda", 
            category="Beverages",
            base_price=150.0,
            cost_price=100.0,
            stock_level=5000,
            expiry_date=date(2025, 12, 31)
        ),
        SKUInfo(
            sku_id="LK-SNK-001", # Might not exist, should handle gracefully or default
            name="Unknown Snack", 
            category="Snacks",
            base_price=50.0,
            cost_price=40.0,
            stock_level=100,
            expiry_date=date(2025, 12, 31)
        )
    ]
    
    constraints = Constraint(
        max_promotions=5,
        min_margin=0.05,
        budget=100000
    )
    
    # 3. Run Session
    plan = orch.run_promotion_planning(
        skus=skus, 
        constraints=constraints, 
        objective=ObjectiveType.MAX_PROFIT
    )
    
    print("\n>>> Final Plan Generated:")
    for promo in plan.recommendations:
        print(f" - {promo.sku_id}: {promo.promo_type} {promo.discount_depth*100:.0f}%")
        print(f"   Reason: {promo.reasoning}")
        print(f"   Forecast: Base={promo.baseline_forecast:.1f}, Lift={promo.uplift_forecast:.1f}")
        
    if len(plan.recommendations) > 0:
        print("[PASS] Plan generated successfully.")
    else:
        print("[WARN] No promotions selected (Solver might be too strict or no viable candidates).")

if __name__ == "__main__":
    test_full_council()
