import pandas as pd
import numpy as np
from datetime import timedelta, date
from typing import List
from src.domain.entities import SKUInfo
from src.engine.uplift.t_learner import TLearnerUplift
from src.adapters.data_loader import DataLoader
from src.engine.pipelines import FeaturePipeline

class MarketerAgent:
    """
    The Causal Agent.
    Responsibilities:
    - Load the Uplift AI Model (T-Learner).
    - Estimate 'Incremental Uplift' for specific promo actions.
    - Calculate Elasticity.
    """
    
    def __init__(self):
        self.model = TLearnerUplift()
        try:
            self.model.load()
            self.is_ready = True
        except:
            print("!! Marketer: No trained model found. Using rule-based fallback.")
            self.is_ready = False
            
    def estimate_uplift(self, sku: SKUInfo, discount_depth: float, context_df: pd.DataFrame) -> float:
        """
        Predicts total incremental units sold due to the discount.
        """
        if not self.is_ready:
            # Fallback: 1.5 Elasticity
            base_sales = (sku.stock_level / 20) * 7 
            return base_sales * (discount_depth * 1.5)
            
        sku_history = context_df[context_df['SKU'] == sku.sku_id].sort_values('Date')
        
        if sku_history.empty:
             return 0.0
             
        # Scenario: Next 7 Days
        last_date = sku_history['Date'].iloc[-1]
        future_dates = [last_date + timedelta(days=i+1) for i in range(7)]
        last_row = sku_history.iloc[-1]
        
        future_rows = []
        for d in future_dates:
            row = last_row.copy()
            row['Date'] = d
            
            # Time Features
            row['month_sin'] = np.sin(2 * np.pi * d.month / 12)
            row['is_weekend'] = 1 if d.dayofweek >= 5 else 0
            
            # TREATMENT CONFIGURATION
            row['is_promo'] = 1
            row['discount_depth'] = discount_depth
            # Assume Price Index drops by discount
            row['price_index'] = 1.0 - discount_depth 
            
            future_rows.append(row)
            
        future_df = pd.DataFrame(future_rows)
        
        # Predict Uplift
        preds = self.model.predict_lift(future_df)
        total_lift = preds['ExpectedLift'].sum()
        
        return float(total_lift)
