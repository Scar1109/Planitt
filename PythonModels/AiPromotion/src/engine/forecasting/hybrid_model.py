import pandas as pd
import numpy as np
import lightgbm as lgb
from prophet import Prophet
from typing import Dict, Any, Tuple
import joblib
import os

class HybridForecaster:
    """
    Stage 1: Prophet (Global Trend/Seasonality per Category)
    Stage 2: LightGBM (Local Residuals per SKU)
    """
    
    def __init__(self, metadata_path: str = "models/artifacts"):
        self.metadata_path = metadata_path
        self.prophet_models = {}
        self.lgb_model = None
        os.makedirs(metadata_path, exist_ok=True)
        
    def fit(self, df: pd.DataFrame, target_col: str = 'TrueDemand'):
        """
        Train the hybrid model.
        """
        # 1. Fit Global Prophet Models (One per Category)
        # Allows capturing "Ice Cream Season" vs "Umbrella Season"
        categories = df['Category'].unique()
        df['prophet_trend'] = 0.0
        
        for cat in categories:
            cat_df = df[df['Category'] == cat].groupby('Date')[target_col].sum().reset_index()
            cat_df.columns = ['ds', 'y']
            
            try:
                m = Prophet(yearly_seasonality=True, weekly_seasonality=True)
                m.fit(cat_df)
                self.prophet_models[cat] = m
                
                # Predict Trend
                future = m.make_future_dataframe(periods=0)
                forecast = m.predict(future)
                trend_map = forecast.set_index('ds')['trend']
                mask = df['Category'] == cat
                df.loc[mask, 'prophet_trend'] = df.loc[mask, 'Date'].map(trend_map)
                
            except Exception as e:
                # Fallback: Seasonal Naive Method (Pandas-Native)
                # Prophet failed (likely C++ issue). We simulate seasonality using GroupBy.
                # Trend = Rolling Mean (Smooth)
                # Seasonality = DayOfWeek Multipliers
                
                # 1. Smooth Trend (7-day rolling)
                cat_df = cat_df.sort_values('ds')
                cat_df['smooth_trend'] = cat_df['y'].rolling(28, min_periods=1, center=True).mean()
                cat_df['smooth_trend'] = cat_df['smooth_trend'].fillna(method='bfill').fillna(method='ffill')
                
                # 2. Extract DOW Seasonality (Index 0-6)
                cat_df['dow'] = cat_df['ds'].dt.dayofweek
                dow_seasonality = cat_df.groupby('dow')['y'].transform('mean') / cat_df['y'].mean()
                
                # 3. Combine: Trend * Seasonality
                cat_df['final_trend_proxy'] = cat_df['smooth_trend'] * dow_seasonality
                
                trend_map = cat_df.set_index('ds')['final_trend_proxy']
                mask = df['Category'] == cat
                df.loc[mask, 'prophet_trend'] = df.loc[mask, 'Date'].map(trend_map)
                
                # Store (Fallback Type, DOW_Factors_Dict, Mean_Value)
                dow_factors = cat_df.groupby('dow')['y'].mean().to_dict()
                self.prophet_models[cat] = ("FALLBACK_SEASONAL", dow_factors, cat_df['y'].mean())
            
        # 2. Calculate Residuals
        # We assume SKU demand tracks Category Trend + Local Variations
        # Normalize trend by SKU share? 
        # For simplicity in this version: Residual = Log(Target) - Log(Trend + 1)
        # Working in Log space handles scale differences
        
        df['target_log'] = np.log1p(df[target_col])
        df['trend_log'] = np.log1p(df['prophet_trend'])
        # The residual is what LGBM needs to learn (Price Elasticity, Promo impact)
        df['residual'] = df['target_log'] - df['trend_log']
        
        # 3. Fit LightGBM on Residuals
        features = [
            'price_index', 'is_promo', 'discount_depth',
            'lag_1', 'lag_7', 'rolling_mean_7', 
            'month_sin', 'dow_sin', 'is_weekend',
            'is_rainy', 'event_impact'
        ]
        
        # Filter valid rows (lags create NaNs)
        train_df = df.dropna(subset=features + ['residual'])
        
        X = train_df[features]
        y = train_df['residual']
        
        # Simple LGBM Regressor
        # We use 'fair' objective for robustness to outliers
        self.lgb_model = lgb.LGBMRegressor(
            n_estimators=500,
            learning_rate=0.05,
            objective='regression',
            metric='rmse',
            verbose=-1
        )
        self.lgb_model.fit(X, y)
        
        print(f"Hybrid Training Complete. Prophet Models: {len(self.prophet_models)}, LGBM Features: {len(features)}")
        
    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Predicts absolute units.
        """
        df = df.copy()
        
        # 1. Predict Trend
        df['pred_trend'] = 0.0
        for cat, model in self.prophet_models.items():
            mask = df['Category'] == cat
            if not mask.any(): 
                continue
            
            # Helper to check if model is a real Prophet object
            if isinstance(model, tuple) and model[0] == "FALLBACK_SEASONAL":
                 # Reconstruct Seasonal Naive Forecast
                 # Trend = Global Mean (Simplification for future) * Seasonality
                 _, dow_factors, global_mean = model
                 
                 mask_dates = df.loc[mask, 'Date']
                 dows = mask_dates.dt.dayofweek
                 
                 # Map DOW to factor. If new DOW (unlikely), use global mean.
                 pred = dows.map(dow_factors).fillna(global_mean)
                 df.loc[mask, 'pred_trend'] = pred

            elif isinstance(model, tuple) and model[0] == "FALLBACK":
                 # Old Simple Fallback
                 df.loc[mask, 'pred_trend'] = model[1] 

            elif hasattr(model, 'predict'):
                dates = df.loc[mask, 'Date'].unique()
                future = pd.DataFrame({'ds': dates})
                forecast = model.predict(future)
                trend_map = forecast.set_index('ds')['trend']
                df.loc[mask, 'pred_trend'] = df.loc[mask, 'Date'].map(trend_map)
            
        # 2. Predict Residual (LGBM)
        features = [
            'price_index', 'is_promo', 'discount_depth',
            'lag_1', 'lag_7', 'rolling_mean_7', 
            'month_sin', 'dow_sin', 'is_weekend',
            'is_rainy', 'event_impact'
        ]
        
        # Handle missing features (if new SKUs)
        for f in features:
            if f not in df.columns:
                df[f] = 0
                
        pred_residual = self.lgb_model.predict(df[features])
        
        # 3. Combine
        # log_y = log_trend + residual
        # y = exp(log_trend + residual) - 1
        
        # Fallback for negative trends/residuals
        log_trend = np.log1p(df['pred_trend'].clip(lower=0))
        final_log = log_trend + pred_residual
        df['PredictedDemand'] = np.expm1(final_log).clip(lower=0)
        
        return df

    def save(self):
        joblib.dump(self.lgb_model, os.path.join(self.metadata_path, 'lgb_residual.joblib'))
        # Prophet models can be large, save dict
        joblib.dump(self.prophet_models, os.path.join(self.metadata_path, 'prophet_cats.joblib'))
        
    def load(self):
        self.lgb_model = joblib.load(os.path.join(self.metadata_path, 'lgb_residual.joblib'))
        self.prophet_models = joblib.load(os.path.join(self.metadata_path, 'prophet_cats.joblib'))
