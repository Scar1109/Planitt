
import pickle
import json
import os
import pandas as pd
from datetime import datetime

MODELS_DIR = "PythonModels/InventoryForecasting/models"
OUTPUT_FILE = "PythonModels/InventoryForecasting/MODEL_METADATA.json"

def generate_metadata():
    print("Loading model artifacts...")
    metadata = {
        "generated_at": datetime.now().isoformat(),
        "model_type": "Inventory Demand Forecasting (HistGradientBoostingRegressor)",
        "version": "SmartReplan+ v2.0 (Multi-Year)",
        "artifacts": {},
        "metrics": {},
        "parameters": {},
        "features": []
    }

    # 1. Load Model Params
    model_path = os.path.join(MODELS_DIR, "demand_forecast_model.pkl")
    if os.path.exists(model_path):
        with open(model_path, "rb") as f:
            model = pickle.load(f)
            metadata["artifacts"]["model_size_bytes"] = os.path.getsize(model_path)
            try:
                # HistGradientBoostingRegressor params
                params = model.get_params()
                # filter out complex objects if any
                metadata["parameters"] = {k: str(v) for k, v in params.items()}
            except:
                metadata["parameters"] = str(model)
    
    # 2. Load Metrics
    metrics_path = os.path.join(MODELS_DIR, "demand_metrics.pkl")
    if os.path.exists(metrics_path):
        with open(metrics_path, "rb") as f:
            metrics = pickle.load(f)
            safe_metrics = {}
            for k, v in metrics.items():
                try:
                    safe_metrics[k] = float(v)
                except:
                    safe_metrics[k] = str(v)
            metadata["metrics"] = safe_metrics

    # 3. Load Features
    features_path = os.path.join(MODELS_DIR, "demand_feature_cols.pkl")
    if os.path.exists(features_path):
        with open(features_path, "rb") as f:
            features = pickle.load(f)
            metadata["features"] = features

    # 4. Load Feature Importance
    imp_path = os.path.join(MODELS_DIR, "feature_importance.csv")
    if os.path.exists(imp_path):
        df = pd.read_csv(imp_path)
        # Take top 20
        metadata["top_features"] = df.head(20).to_dict(orient="records")

    # Save
    with open(OUTPUT_FILE, "w") as f:
        json.dump(metadata, f, indent=4)
    
    print(f"Metadata saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_metadata()
