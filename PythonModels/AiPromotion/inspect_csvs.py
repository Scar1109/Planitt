import pandas as pd
import glob
import os

DATASET_PATH = "c:/D/Github/PlanItt--Copy/Dataset"

def inspect_data():
    print(">>> Inspecting CSVs for Merge Issue")
    
    # 1. Product Master
    p_files = glob.glob(os.path.join(DATASET_PATH, "**", "Product_Master.csv"), recursive=True)
    if not p_files:
        print("!! Product Master NOT FOUND")
        return
    
    print(f"\nLOADING PRODUCT MASTER: {p_files[0]}")
    p_df = pd.read_csv(p_files[0])
    print(f"Columns: {list(p_df.columns)}")
    print(f"SKU Dtype: {p_df['SKU'].dtype}")
    print(f"First 5 SKUs: {p_df['SKU'].head().tolist()}")
    
    # 2. Sales 2023
    s_files = glob.glob(os.path.join(DATASET_PATH, "**", "Sales_2023.csv"), recursive=True)
    if not s_files:
        print("!! Sales 2023 NOT FOUND")
        return
        
    print(f"\nLOADING SALES 2023: {s_files[0]}")
    s_df = pd.read_csv(s_files[0], nrows=1000) # Read sample
    print(f"Columns: {list(s_df.columns)}")
    print(f"SKU Dtype: {s_df['SKU'].dtype}")
    print(f"First 5 SKUs: {s_df['SKU'].head().tolist()}")
    
    # 3. Check Overlap
    p_skus = set(p_df['SKU'].astype(str))
    s_skus = set(s_df['SKU'].astype(str))
    overlap = p_skus.intersection(s_skus)
    print(f"\nSKU OVERLAP ANALYSIS:")
    print(f"Product Master SKUs: {len(p_skus)}")
    print(f"Sales Sample SKUs: {len(s_skus)}")
    print(f"Common SKUs: {len(overlap)}")
    
    if len(overlap) == 0:
        print("!!! ZERO OVERLAP. MERGE WILL FAIL.")
        print("Checking for whitespace/formatting issues...")
        print(f"Sample P: '{list(p_skus)[0]}'")
        print(f"Sample S: '{list(s_skus)[0]}'")

if __name__ == "__main__":
    inspect_data()
