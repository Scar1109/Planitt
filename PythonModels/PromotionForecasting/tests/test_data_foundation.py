import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.adapters.data_loader import DataLoader
from src.agents.workers.guardian import DataGuardian

def test_data_ingest():
    with open("debug_start.txt", "w") as f:
        f.write("Started\n")
    print(">>> Testing Data Foundation Layer")
    
    # Path to real dataset
    # Assuming relative to script or hardcoded absolute for dev
    dataset_path = "c:/D/Github/PlanItt--Copy/Dataset"
    
    loader = DataLoader(dataset_path)
    guardian = DataGuardian()
    
    try:
        print("1. Loading Data Sources...")
        df = loader.build_golden_table(years=[2023, 2024])
        print(f"   Values Loaded. Shape: {df.shape}")
        print(f"   Columns: {df.columns.tolist()[:10]}...")
        
        print("\n2. Running Data Guardian...")
        report = guardian.validate_ingest(df)
        print(f"   Validation Report: {report}")
        
        if report['status'] == 'PASS':
            print("\n3. Cleaning Data...")
            clean_df = guardian.clean_and_impute(df)
            print(f"   Cleaned Shape: {clean_df.shape}")
            
            # Save for inspection
            output_path = "c:/D/Github/PlanItt--Copy/PythonModels/PromotionForecasting/datasets/debug_golden_table.csv"
            clean_df.head(100).to_csv(output_path, index=False)
            print(f"\nSUCCESS: Saved sample to {output_path}")
            
    except Exception as e:
        print(f"\nCRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_data_ingest()
