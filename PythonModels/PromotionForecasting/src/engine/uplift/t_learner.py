import pandas as pd
import xgboost as xgb
import os
import joblib

class TLearnerUplift:
    """
    Causal Inference Model (T-Learner).
    Estimates CATE (Conditional Average Treatment Effect).
    Lift = E[Y|T=1, X] - E[Y|T=0, X]
    """
    
    def __init__(self, metadata_path: str = "models/artifacts"):
        self.metadata_path = metadata_path
        self.m0 = None # Control Model
        self.m1 = None # Treatment Model
        os.makedirs(metadata_path, exist_ok=True)
        
    def fit(self, df: pd.DataFrame, target: str = 'UnitsSold', treatment_col: str = 'is_promo'):
        """
        Trains two separate XGBoost models.
        """
        features = [
            'price_index', 'lag_7', 'rolling_mean_30', 'month_sin', 
            'is_weekend', 'Category', 'Brand' # Categoricals handled by XGBoost
        ]
        
        # Enable categorical support
        vocab = {c: df[c].astype('category') for c in ['Category', 'Brand']}
        df_enc = df.copy()
        for col in ['Category', 'Brand']:
            df_enc[col] = df_enc[col].astype('category')
            
        # Split Data
        control_df = df_enc[df_enc[treatment_col] == 0]
        treat_df = df_enc[df_enc[treatment_col] == 1]
        
        # Model 0: Control
        self.m0 = xgb.XGBRegressor(enable_categorical=True, n_estimators=100)
        self.m0.fit(control_df[features], control_df[target])
        
        # Model 1: Treatment
        self.m1 = xgb.XGBRegressor(enable_categorical=True, n_estimators=100)
        self.m1.fit(treat_df[features], treat_df[target])
        
        print(f"Uplift Training Complete. Control Size: {len(control_df)}, Treat Size: {len(treat_df)}")

    def predict_lift(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Returns the expected Uplift (Units) for each row.
        """
        df_enc = df.copy()
        cols = ['Category', 'Brand']
        for c in cols:
            if c in df_enc.columns:
                df_enc[c] = df_enc[c].astype('category')
        
        features = [
            'price_index', 'lag_7', 'rolling_mean_30', 'month_sin', 
            'is_weekend', 'Category', 'Brand'
        ]
        
        # Counterfactuals
        pred_control = self.m0.predict(df_enc[features])
        pred_treat = self.m1.predict(df_enc[features])
        
        df['ExpectedLift'] = pred_treat - pred_control
        # If lift is negative (price elasticity broke), clip to 0 for safety?
        # Or keep it to warn user "This promo hurts sales"?
        # We keep it. 
        
        return df

    def save(self):
        joblib.dump(self.m0, os.path.join(self.metadata_path, 'uplift_m0.joblib'))
        joblib.dump(self.m1, os.path.join(self.metadata_path, 'uplift_m1.joblib'))
        
    def load(self):
        self.m0 = joblib.load(os.path.join(self.metadata_path, 'uplift_m0.joblib'))
        self.m1 = joblib.load(os.path.join(self.metadata_path, 'uplift_m1.joblib'))
