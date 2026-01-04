
import sys
import os

# Ensure src is importable
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.adapters.data_loader import DataLoader
from src.engine.forecasting.hybrid_model import HybridForecaster
from src.engine.pipelines import FeaturePipeline

def main():
    print(">>> Starting Training Pipeline...")
    
    # 1. Load Data (Relative to this script in src/)
    # Dataset is at ../../../Dataset relative to src (PythonModels/AiPromotion/src)
    dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../Dataset")) # Actually ../../ is PythonModels/Dataset. User confirmed Dataset is at ../../../Dataset relative to scripts. Scripts was at AiPromotion/scripts. Src is at AiPromotion/src. So depth is same.
    # Wait, list_dir showed c:\Users\kavee\Downloads\Planitt-suouni\Dataset
    # File is at c:\Users\kavee\Downloads\Planitt-suouni\PythonModels\AiPromotion\src\train.py
    # .. -> AiPromotion
    # ../.. -> PythonModels
    # ../../../ -> Planitt-suouni
    # So ../../../Dataset is correct.
    dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../Dataset"))
    loader = DataLoader(dataset_path=dataset_path)
    
    try:
        print("Loading Golden Table (2022-2024)...")
        raw_df = loader.build_golden_table(years=[2022, 2023, 2024])
    except Exception as e:
        print(f"Error loading data: {e}")
        return

    # 2. Pipeline
    print("Running Feature Pipeline...")
    pipeline = FeaturePipeline()
    df = pipeline.transform(raw_df, is_training=True)
    
    # Check Target
    target_col = 'TrueDemand' if 'TrueDemand' in df.columns else 'UnitsSold'
    df = df.dropna(subset=[target_col])
    
    # 3. Model Training
    print("Initializing Model...")
    # Metadata path: ../models/artifacts relative to src/
    metadata_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../models/artifacts"))
    model = HybridForecaster(metadata_path=metadata_path)
    
    print("Fitting Model (this triggers metadata generation)...")
    model.fit(df, target_col=target_col)
    
    # 4. Save Artifacts
    print("Saving Model Artifacts...")
    model.save()
    
    print(">>> Training Complete.")

if __name__ == "__main__":
    main()
