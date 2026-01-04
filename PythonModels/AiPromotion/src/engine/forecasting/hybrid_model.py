import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import TimeSeriesSplit, RandomizedSearchCV
import joblib
import os
import json
from datetime import datetime
from sklearn.metrics import mean_squared_error, r2_score

class HybridForecaster:
    """
    High-Performance Forecaster (Pure ML with Log-Transform)
    Prioritizes Rolling Means and Price/Promo features.
    """
    
    def __init__(self, metadata_path: str = "models/artifacts"):
        self.metadata_path = metadata_path
        self.model = None
        self.features = [
            'price_index', 'is_promo', 'discount_depth',
            'lag_1', 'lag_7', 'lag_14', 
            'rolling_mean_7', 'rolling_mean_30', 'rolling_std_7',
            'month_sin', 'dow_sin', 'is_weekend', 'is_rainy', 'event_impact'
        ]
        os.makedirs(metadata_path, exist_ok=True)
        
    def fit(self, df: pd.DataFrame, target_col: str = 'TrueDemand'):
        # Log Transform Target to handle skew and scale
        df['target_log'] = np.log1p(df[target_col])
        
        # Robust Features
        features = [
            'price_index', 'is_promo', 'discount_depth',
            'lag_1', 'lag_7', 'lag_14', 
            'rolling_mean_7', 'rolling_mean_30', 'rolling_std_7',
            'month_sin', 'dow_sin', 'is_weekend', 'is_rainy', 'event_impact'
        ]
        
        # Handle nan in features (though Pipeline handles some, lags create NaNs)
        train_df = df.dropna(subset=features + ['target_log'])
        
        X = train_df[features]
        y = train_df['target_log']
        
        # RandomForest is robust and rarely overfits wildly if params are sane.
        # It captures non-linearities well.
        self.model = RandomForestRegressor(
            n_estimators=200,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            n_jobs=-1,
            random_state=42
        )
        
        print(f"Training RF on {len(X)} samples...")
        self.model.fit(X, y)
        
        # --- Metadata Generation (In-Training) ---
        # Calculate Training Metrics (In-Sample)
        y_pred = self.model.predict(X)
        mse = mean_squared_error(y, y_pred)
        r2 = r2_score(y, y_pred)
        
        importances = dict(zip(self.features, self.model.feature_importances_))
        
        # Infer Data Years
        years = sorted(df['Date'].dt.year.unique().astype(str).tolist())
        
        metadata = {
            "training_date": datetime.now().isoformat(),
            "mse": float(mse),
            "r2_score": float(r2),
            "feature_importances": importances,
            "features": self.features,
            "data_years": years
        }
        
        # Save to models/model_performance.json (assuming metadata_path is models/artifacts)
        # Go up one level from artifacts
        models_dir = os.path.dirname(self.metadata_path.rstrip(os.sep))
        output_path = os.path.join(models_dir, "model_performance.json")
        
        with open(output_path, 'w') as f:
            json.dump(metadata, f, indent=4)
            
        print(f"Metadata generated at: {output_path}")
        
        # Feature Importance Check (Optional print)
        # importances = dict(zip(features, self.model.feature_importances_))
        # print("Top Features:", sorted(importances.items(), key=lambda x: x[1], reverse=True)[:5])
        
    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        
        features = [
            'price_index', 'is_promo', 'discount_depth',
            'lag_1', 'lag_7', 'lag_14', 
            'rolling_mean_7', 'rolling_mean_30', 'rolling_std_7',
            'month_sin', 'dow_sin', 'is_weekend', 'is_rainy', 'event_impact'
        ]
        
        # Ensure features exist
        for f in features:
            if f not in df.columns:
                df[f] = 0
                
        # Fill NaNs with 0 or mean just for safety in inference
        X = df[features].fillna(0)
        
        pred_log = self.model.predict(X)
        df['PredictedDemand'] = np.expm1(pred_log) # Inverse Log
        
        return df

    def save(self):
        joblib.dump(self.model, os.path.join(self.metadata_path, 'rf_model.joblib'))
        
    def load(self):
        self.model = joblib.load(os.path.join(self.metadata_path, 'rf_model.joblib'))
