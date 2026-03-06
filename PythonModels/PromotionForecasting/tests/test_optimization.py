import sys
import os
import pandas as pd
from datetime import date

# Path Hack
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.domain.entities import PromotionCandidate, SKUInfo, InventoryState, OptimizationObjective
from src.agents.workers.strategist import StrategistAgent, PromotionPlan

def test_optimization_solver():
    print(">>> Testing Optimization Solver (Strategist)")
    
    # 1. Setup Mock Candidates
    # Candidate 1: High Profit, High Waste Risk (Should be picked if waste matters)
    c1 = PromotionCandidate(
        sku_id="SKU-A",
        promo_type="10_PCT_OFF",
        predicted_baseline_units=100,
        predicted_uplift_units=50, # +50 units
        unit_price=100.0,
        unit_cost=80.0, # Margin 20 -> 18 after discount? 
        # Discounted Price = 90. Margin = 10. Total Profit = 150 * 10 = 1500.
        # Baseline Profit = 100 * 20 = 2000. 
        # Actually usually Uplift makes up for margin loss.
        # Let's say Discount is cost.
        promo_cost_per_unit=10.0,
        waste_risk_score=0.9, # High waste risk
        current_stock=200
    )
    
    # Candidate 2: Low Profit, Low Risk
    c2 = PromotionCandidate(
        sku_id="SKU-B",
        promo_type="BOGO",
        predicted_baseline_units=50,
        predicted_uplift_units=10,
        unit_price=200.0,
        unit_cost=150.0,
        promo_cost_per_unit=50.0,
        waste_risk_score=0.1,
        current_stock=100
    )
    
    candidates = [c1, c2]
    
    # 2. Run Optimization (PROFIT Focus)
    print("\n--- Test Case 1: Maximize PROFIT ---")
    strategist = StrategistAgent()
    plan_profit = strategist.generate_plan(
        candidates=candidates,
        objective=OptimizationObjective.MAX_PROFIT,
        budget=5000.0,
        max_slots=5
    )
    print(f"Plan (Profit): Selected {len(plan_profit.selected_promotions)} items")
    for p in plan_profit.selected_promotions:
        print(f"  Selected: {p.sku_id} ({p.promo_type})")
        
    # 3. Run Optimization (WASTE Focus)
    print("\n--- Test Case 2: Minimize WASTE ---")
    plan_waste = strategist.generate_plan(
        candidates=candidates,
        objective=OptimizationObjective.MIN_WASTE,
        budget=5000.0,
        max_slots=5
    )
    print(f"Plan (Waste): Selected {len(plan_waste.selected_promotions)} items")
    for p in plan_waste.selected_promotions:
        print(f"  Selected: {p.sku_id} (Risk: {p.waste_risk_score})")
        
    # Validation logic
    # In Profit mode, calculate which is better?
    # In Waste mode, SKU-A (0.9) must be consistently picked.
    
    found_a_in_waste = any(p.sku_id == "SKU-A" for p in plan_waste.selected_promotions)
    if found_a_in_waste:
        print("SUCCESS: High waste item selected in Waste minimization strategy.")
    else:
        print("FAILURE: High waste item valid but NOT selected.")

if __name__ == "__main__":
    test_optimization_solver()
