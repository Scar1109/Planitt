import sys
import os
import pandas as pd
import numpy as np
import warnings
from typing import Tuple

# Path Hack
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Suppress noisy warnings for cleaner output
warnings.simplefilter(action='ignore', category=FutureWarning)
os.environ["DISABLE_PANDERA_IMPORT_WARNING"] = "True"

from src.adapters.data_loader import DataLoader
from src.agents.workers.guardian import DataGuardian
from src.engine.pipelines import FeaturePipeline
from src.engine.forecasting.hybrid_model import HybridForecaster
from src.engine.uplift.t_learner import TLearnerUplift

def train_pipeline(data_path: str = "../../Dataset"):
    print(">>> Starting AI Training Pipeline")
    
    # 1. Load & Validate
    loader = DataLoader(data_path)
    guardian = DataGuardian()
    
    print("...Loading Golden Table")
    raw_df = loader.build_golden_table([2023, 2024])
    
    print("...Validating")
    report = guardian.validate_ingest(raw_df)
    if report['status'] == 'FAIL':
        print(f"xx Data Validation Failed: {report}")
        return
        
    df = guardian.clean_and_impute(raw_df)
    
    # 2. Feature Engineering
    print("...Engineering Features")
    pipeline = FeaturePipeline()
    featured_df = pipeline.transform(df, is_training=True)
    
    # 3. Train Forecaster
    print("...Training Hybrid Forecaster (Prophet + LightGBM)")
    forecaster = HybridForecaster()
    # We train on non-promo days mainly for baseline? 
    # Or train on all and let promo feature handle it?
    # Hybrid approach usually trains on all and uses 'is_promo' flag in residual model.
    forecaster.fit(featured_df, target_col='TrueDemand')
    forecaster.save()
    
    # 4. Train Uplift
    print("...Training Causal Uplift (T-Learner)")
    uplift_model = TLearnerUplift()
    uplift_model.fit(featured_df, target='UnitsSold', treatment_col='is_promo')
    uplift_model.save()
    
    print(">>> Training Complete. Models Saved.")
    
if __name__ == "__main__":
    train_pipeline()
