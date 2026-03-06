import pandas as pd
from typing import List, Dict
from src.domain.entities import SKUInfo, PromotionCandidate

class InventorySteward:
    """
    The Risk Manager.
    Calculates Probabilities of Stockout and Waste.
    Acts as a Constraint Provider for the Optimizer.
    """
    
    def analyze_risk(self, sku: SKUInfo, forecast_demand: float, days_ahead: int) -> Dict[str, float]:
        """
        Returns risk scores [0.0 - 1.0]
        """
        risks = {
            "stockout_risk": 0.0,
            "waste_risk": 0.0
        }
        
        # 1. Stockout Risk
        # Simple deterministic check first (Probabilistic would use forecast variance)
        projected_sales = forecast_demand * days_ahead
        if sku.stock_level < projected_sales:
             risks['stockout_risk'] = 1.0 # Certain stockout
        elif sku.stock_level < (projected_sales + sku.stock_level * 0.1):
             risks['stockout_risk'] = 0.5 # Low buffer warning
             
        # 2. Waste Risk (Expiry)
        if sku.is_perishable and sku.days_to_expiry is not None:
             # If we don't sell stock before expiry
             sales_velocity = forecast_demand 
             days_to_clear_stock = sku.stock_level / (sales_velocity + 0.01)
             
             if days_to_clear_stock > sku.days_to_expiry:
                 risks['waste_risk'] = 1.0 # We will throw food away
             elif days_to_clear_stock > sku.days_to_expiry * 0.8:
                 risks['waste_risk'] = 0.7 # Danger zone
                 
        return risks

    def critique_plan(self, candidates: List[PromotionCandidate], skus: Dict[str, SKUInfo]) -> List[str]:
        """
        Agentic Critique Loop.
        Returns a list of 'Veto' strings.
        """
        vetoes = []
        for cand in candidates:
            sku = skus.get(cand.sku_id)
            if not sku: continue
            
            # If Stockout Risk is High, VETO aggressive promos
            # promoting something scarce -> Bad Customer Experience
            if cand.discount_depth > 0.15: # Aggressive
                risks = self.analyze_risk(sku, cand.baseline_forecast, cand.duration_days)
                if risks['stockout_risk'] > 0.8:
                    vetoes.append(f"VETO SKU {sku.sku_id}: High Stockout Risk ({risks['stockout_risk']}). Reduce discount.")
                    
        return vetoes
