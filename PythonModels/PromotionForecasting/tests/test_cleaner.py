import sys
import os
import pandas as pd
import numpy as np

# Path Hack
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.data_engineering.cleaner import DataCleaner

def test_cleaner_logic():
    print(">>> Testing DataCleaner...")
    
    # 1. Create Mock Dirty Data
    # Scenario: 
    # - SKU 1: LK-VEG-001 (Vegetables -> 35% margin)
    # - SKU 2: STR-SNK-002 (Snacks -> 20% margin)
    # - SKU 3: UNK-003 (General -> 20% margin)
    
    df = pd.DataFrame({
        'SKU': ['LK-VEG-001', 'STR-SNK-002', 'UNK-003'],
        'UnitPriceLKR': [100.0, 50.0, 10.0],
        'Category': [pd.NA, pd.NA, pd.NA], 
        'UnitsSold': [10, 5, 1]
    })
    
    cleaner = DataCleaner()
    cleaned = cleaner.finalize_golden_table(df)
    
    print("Cleaned Columns:", cleaned.columns.tolist())
    
    # Check 1: AvgPrice Created
    if cleaned.iloc[0]['AvgPrice'] == 100.0:
        print("[PASS] AvgPrice derived")
        
    # Check 2: Category Inference
    cat_0 = cleaned.iloc[0]['Category']
    if cat_0 == "Vegetables":
        print(f"[PASS] Category inferred correctly: {cat_0}")
    else:
        print(f"[FAIL] Category inference failed. Got: {cat_0}")
        
    # Check 3: Cost Imputation (Variable Margins)
    # Veg: 100 * (1 - 0.35) = 65.0
    cost_veg = cleaned.iloc[0]['CostPriceLKR']
    if abs(cost_veg - 65.0) < 0.1:
        print(f"[PASS] Veg Cost imputed correctly (35% margin): {cost_veg}")
    else:
        print(f"[FAIL] Veg Cost imputation failed. Got: {cost_veg}")

    # Snack: 50 * (1 - 0.20) = 40.0
    cost_snk = cleaned.iloc[1]['CostPriceLKR']
    if abs(cost_snk - 40.0) < 0.1:
        print(f"[PASS] Snack Cost imputed correctly (20% margin): {cost_snk}")
    else:
        print(f"[FAIL] Snack Cost imputation failed. Got: {cost_snk}")

if __name__ == "__main__":
    test_cleaner_logic()
