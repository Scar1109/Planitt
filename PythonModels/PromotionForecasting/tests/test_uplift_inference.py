import sys
import os
import pandas as pd
import numpy as np

# Path Hack
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.engine.uplift.t_learner import TLearnerUplift

def test_uplift():
    print(">>> Testing Uplift Inference...")
    
    learner = TLearnerUplift()
    learner.load()
    
    # Create Mock Data (One Control, One Treated scenario)
    df = pd.DataFrame([
        {
            'SKU': 'TEST-001',
            'Category': 'Snacks',
            'Brand': 'Generic', 
            'price_index': 1.0, # Normal Price
            'lag_7': 100,
            'rolling_mean_30': 100,
            'month_sin': 0.5,
            'is_weekend': 0,
            'is_promo': 0
        },
        {
            'SKU': 'TEST-001', 
            'Category': 'Snacks', 
            'Brand': 'Generic',
            'price_index': 0.8, # 20% Discount
            'lag_7': 100,
            'rolling_mean_30': 100,
            'month_sin': 0.5,
            'is_weekend': 0,
            'is_promo': 1       # TREATED
        }
    ])
    
    # Predict Lift
    # Note: T-Learner predicts Individual Treatment Effect (ITE)
    # The 'predict_lift' method uses the models to estimate E[Y|T=1] - E[Y|T=0]
    # In our implementation, predict_lift computes this difference.
    
    result = learner.predict_lift(df)
    
    print("\n--- Inference Results ---")
    print(result[['price_index', 'is_promo', 'ExpectedLift']])
    
    lift_val = result.iloc[1]['ExpectedLift']
    if lift_val != 0:
        print(f"\n[PASS] Non-zero lift detected: {lift_val:.4f}")
    else:
        print("\n[WARN] Lift is exactly 0. Model might not have learned sensitivity.")

if __name__ == "__main__":
    test_uplift()
