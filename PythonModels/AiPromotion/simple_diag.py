import pandas as pd
import os

DATA_DIR = "c:/D/Github/PlanItt--Copy/Dataset/2023"
PROD_FILE = os.path.join(DATA_DIR, "Product_Master.csv")
SALES_FILE = os.path.join(DATA_DIR, "Sales_2023.csv")
OUT_FILE = "inspection_result.txt"

def run_diag():
    with open(OUT_FILE, "w") as f:
        f.write("Starting Diagnosis...\n")
        
        try:
            # Load Product Master
            if not os.path.exists(PROD_FILE):
                f.write(f"ERROR: Product file not found at {PROD_FILE}\n")
                return
            
            p_df = pd.read_csv(PROD_FILE)
            p_skus = set(p_df['SKU'].astype(str).str.strip())
            p_barcodes = set(p_df['Barcode'].astype(str).str.strip())
            f.write(f"Loaded Product Master. SKUs: {len(p_skus)}, Barcodes: {len(p_barcodes)}\n")
            f.write(f"Sample P_SKUs: {list(p_skus)[:5]}\n")
            
            # Load Sales Sample
            if not os.path.exists(SALES_FILE):
                f.write(f"ERROR: Sales file not found at {SALES_FILE}\n")
                return
                
            s_df = pd.read_csv(SALES_FILE, nrows=5000)
            s_skus = set(s_df['SKU'].astype(str).str.strip())
            f.write(f"Loaded Sales Sample (5000 rows). Unique Sales SKUs: {len(s_skus)}\n")
            f.write(f"Sample S_SKUs: {list(s_skus)[:5]}\n")
            
            # Check Overlap
            sku_overlap = p_skus.intersection(s_skus)
            barcode_overlap = p_barcodes.intersection(s_skus)
            
            f.write(f"\nDirect SKU Overlap: {len(sku_overlap)}\n")
            f.write(f"Barcode -> SKU Overlap: {len(barcode_overlap)}\n")
            
            if len(sku_overlap) > 0:
                f.write(f"MATCH FOUND via SKU! Example: {list(sku_overlap)[0]}\n")
            elif len(barcode_overlap) > 0:
                f.write(f"MATCH FOUND via Barcode! Sales 'SKU' is actually Product 'Barcode'. Example: {list(barcode_overlap)[0]}\n")
            else:
                f.write("NO MATCH FOUND. Data is disjoint.\n")
                
        except Exception as e:
            f.write(f"EXCEPTION: {str(e)}\n")

if __name__ == "__main__":
    run_diag()
