import pandas as pd
import numpy as np
from datetime import timedelta, date
from typing import List
from src.domain.entities import SKUInfo
from src.engine.forecasting.hybrid_model import HybridForecaster
from src.adapters.data_loader import DataLoader
from src.engine.pipelines import FeaturePipeline

class FuturistAgent:
    """
    The Forecaster Agent.
    Responsibilities:
    - Load the Hybrid AI Model.
    - Predict 'Baseline Demand' (Organic Sales) for SKUs.
    - Understand Seasonality and Trends.
    """
    
    def __init__(self):
        self.model = HybridForecaster()
        try:
            self.model.load()
            self.is_ready = True
        except:
            print("!! Futurist: No trained model found. Using naive fallback.")
            self.is_ready = False
            
    def predict_baseline(self, sku: SKUInfo, days: int, context_df: pd.DataFrame) -> float:
        """
        Predicts baseline units for the next N days.
        """
        if not self.is_ready:
            # Fallback: Simple daily average based on stock velocity
            return (sku.stock_level / 20) * days 
            
        sku_history = context_df[context_df['SKU'] == sku.sku_id].sort_values('Date')
        
        if sku_history.empty:
             return 0.0
             
        # Create Future Frame
        last_date = sku_history['Date'].iloc[-1]
        future_dates = [last_date + timedelta(days=i+1) for i in range(days)]
        
        # We need to construct a DF with features for these future dates
        # Simplification: Forward fill the latest known static features (Price, Brand, etc.)
        last_row = sku_history.iloc[-1]
        
        future_rows = []
        for d in future_dates:
            row = last_row.copy()
            row['Date'] = d
            row['ds'] = d
            
            # Recalculate Time Features
            row['month_sin'] = np.sin(2 * np.pi * d.month / 12)
            row['dow_sin'] = np.sin(2 * np.pi * d.dayofweek / 7)
            row['is_weekend'] = 1 if d.dayofweek >= 5 else 0
            
            # Assumptions for Baseline:
            # - No Promo
            # - Regular Price
            row['is_promo'] = 0
            row['discount_depth'] = 0.0
            row['price_index'] = 1.0 
            
            future_rows.append(row)
            
        future_df = pd.DataFrame(future_rows)
        
        # Predict
        preds = self.model.predict(future_df)
        total_demand = preds['PredictedDemand'].sum()
        
        return float(total_demand)
