from typing import List, Dict
from datetime import date
from src.adapters.data_loader import DataLoader
from src.engine.pipelines import FeaturePipeline
from src.domain.entities import SKUInfo, PromotionCandidate, PromotionPlan, Constraint, ObjectiveType, PromotionType
from src.agents.workers.steward import InventorySteward
from src.agents.workers.steward import InventorySteward
# from src.agents.workers.strategist import StrategistAgent
from src.agents.workers.futurist import FuturistAgent
from src.agents.workers.futurist import FuturistAgent
from src.agents.workers.marketer import MarketerAgent

class Orchestrator:
    """
    The Council of Experts Manager.
    Coordinates the multi-step reasoning process.
    """
    
    def __init__(self):
        self.steward = InventorySteward()
        # self.strategist = StrategistAgent()
        self.marketer = MarketerAgent()
        self.futurist = FuturistAgent()
        
        # Centralized Data Access (Shared Memory)
        self.loader = DataLoader(dataset_path='../../Dataset')
        self.pipeline = FeaturePipeline()
        self._context_cache = None
        
    def _load_shared_context(self):
        if self._context_cache is None:
            print(">>> Orchestrator: Loading Shared Data Context (One-time)...")
            raw_df = self.loader.build_golden_table()
            self._context_cache = self.pipeline.transform(raw_df, is_training=False)
        return self._context_cache
        
    def run_promotion_planning(self, 
                               skus: List[SKUInfo], 
                               constraints: Constraint,
                               objective: ObjectiveType) -> PromotionPlan:
        
        print(">>> Council in Session: Planning Promotions")
        
        # 0. Load Context Once
        context_df = self._load_shared_context()
        
        # 1. Candidate Generation (The Brainstorm)
        candidates = []
        sku_map = {s.sku_id: s for s in skus}
        
        for sku in skus:
            # Baseline Forecast (Futurist)
            baseline = self.futurist.predict_baseline(sku, 7, context_df) # 1 week
            
            # Simulate Options (Marketer)
            # Try 10%, 20%
            for discount in [0.10, 0.20]:
                uplift = self.marketer.estimate_uplift(sku, discount, 7, context_df)
                
                # Check Risk (Steward) - Initial Filter
                risks = self.steward.analyze_risk(sku, baseline + uplift, 7)
                
                if risks['stockout_risk'] > 0.8:
                    continue # Skip risky options early? Or let Solver handle?
                             # Let's Skip early for efficiency
                
                # Calculate Metrics
                promo_price = sku.base_price * (1 - discount)
                
                # True Revenue Lift
                total_promo_revenue = (baseline + uplift) * promo_price
                total_baseline_revenue = baseline * sku.base_price
                revenue_lift = total_promo_revenue - total_baseline_revenue
                
                # True Profit Lift
                total_promo_profit = (baseline + uplift) * (promo_price - sku.cost_price)
                total_baseline_profit = baseline * (sku.base_price - sku.cost_price)
                profit_lift = total_promo_profit - total_baseline_profit
                
                cand = PromotionCandidate(
                    sku_id=sku.sku_id,
                    promo_type=PromotionType.DISCOUNT,
                    discount_depth=discount,
                    start_date=date.today(),
                    duration_days=7,
                    baseline_forecast=baseline,
                    uplift_forecast=uplift,
                    revenue_lift=revenue_lift,
                    profit_lift=profit_lift,
                    risk_flags=[]
                )
                candidates.append(cand)
        
        print(f"Generated {len(candidates)} candidates.")
        
        # 2. Optimization (Strategist)
        # Solve the Knapsack Problem
        # 2. Optimization (Strategist)
        # Solve the Knapsack Problem
        try:
            from src.agents.workers.strategist import StrategistAgent
            strategist = StrategistAgent()
            selected_candidates = strategist.generate_plan(candidates, sku_map, constraints, objective)
        except ImportError:
            print("Strategist/OrTools not available. Returning all valid candidates.")
            selected_candidates = candidates

        # selected_candidates = self.strategist.generate_plan(candidates, sku_map, constraints, objective)
        
        print(f"Strategist selected {len(selected_candidates)} promotions.")
        
        # 3. Final Critique (Steward) 
        # Double check the full plan aggregate risk? (Advanced)
        
        # 4. Narrator bypassed - Node.js backend handles LLM synthesis.
        
        return PromotionPlan(
            plan_id="PLAN-001",
            created_at=date.today(),
            objective=objective,
            recommendations=selected_candidates,
            summary_stats={"total_profit_lift": sum(c.profit_lift for c in selected_candidates)}
        )
