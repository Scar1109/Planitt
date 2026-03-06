import pandas as pd
import numpy as np
from typing import List, Tuple

class FeaturePipeline:
    """
    Centralized Feature Engineering Logic.
    Generates Lags, Rolling Windows, and Time-based features.
    """
    
    def transform(self, df: pd.DataFrame, is_training: bool = True) -> pd.DataFrame:
        """
        Main entry point. Applied to both Training and Inference.
        """
        df = df.copy()
        
        # 1. Date Features
        df = self._add_date_features(df)
        
        # 2. Price Features
        df = self._add_price_features(df)
        
        # 3. Time Series Lags (Only possible if we have history)
        # For real-time inference, these must be fetched from Feature Store.
        # Here we assume the input df contains necessary history context.
        df = self._add_lag_features(df)
        
        # 4. Context/Weather
        df = self._add_context_features(df)
        
        # 5. Inventory Constraints (for filtering, usually not for demand model, 
        # but used for "Stockout Correction")
        if is_training:
            df = self._correct_stockouts(df)
            
        return df

    def _add_date_features(self, df: pd.DataFrame) -> pd.DataFrame:
        if 'Date' not in df.columns:
            return df
            
        df['Date'] = pd.to_datetime(df['Date'])
        # Cyclical encoding for seasonality
        df['month_sin'] = np.sin(2 * np.pi * df['Date'].dt.month / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['Date'].dt.month / 12)
        df['dow_sin'] = np.sin(2 * np.pi * df['Date'].dt.dayofweek / 7)
        df['day_of_month'] = df['Date'].dt.day
        df['is_weekend'] = df['Date'].dt.dayofweek >= 5
        return df

    def _add_price_features(self, df: pd.DataFrame) -> pd.DataFrame:
        # Guarantee 'BaseUnitPriceLKR' exists
        if 'BaseUnitPriceLKR' not in df.columns:
            # Heuristic: Base Price = Max Observed Price for that SKU
            # This allows us to detect "Hidden" promotions in sales history
            if 'SKU' in df.columns and 'AvgPrice' in df.columns:
                 df['BaseUnitPriceLKR'] = df.groupby('SKU')['AvgPrice'].transform('max')
            else:
                 df['BaseUnitPriceLKR'] = df.get('AvgPrice', 0.0)

        # 1. Price Index (Relative to Base)
        # Avoid division by zero
        df['price_index'] = df['AvgPrice'] / (df['BaseUnitPriceLKR'].replace(0, 1))
            
        # 2. Discount Depth
        # (Base - Actual) / Base
        df['discount_depth'] = (df['BaseUnitPriceLKR'] - df['AvgPrice']) / (df['BaseUnitPriceLKR'].replace(0, 1))
        df['discount_depth'] = df['discount_depth'].clip(lower=0) # No negative discounts
        
        # 3. Promo Flag
        if 'PromoFlag' in df.columns:
            df['is_promo'] = df['PromoFlag'].fillna(0).astype(int)
        else:
            # Infer Promo from Discount Depth (e.g. > 5% off)
            df['is_promo'] = (df['discount_depth'] > 0.05).astype(int)
            
        return df

    def _add_lag_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Adds 7d, 14d, 30d lags and rolling means.
        Requires DF to be sorted by SKU, Date.
        """
        if 'UnitsSold' not in df.columns:
            return df
            
        # Ensure Sort order
        df = df.sort_values(['SKU', 'Date'])
        
        # Group by SKU to avoid leakage across products
        g = df.groupby('SKU')['UnitsSold']
        
        # Shifts (Autoregression)
        df['lag_1'] = g.shift(1)
        df['lag_3'] = g.shift(3)
        df['lag_7'] = g.shift(7)
        df['lag_14'] = g.shift(14)
        df['lag_21'] = g.shift(21)
        
        # Rolling Windows (Trend)
        df['rolling_mean_7'] = g.transform(lambda x: x.shift(1).rolling(7).mean())
        df['rolling_mean_14'] = g.transform(lambda x: x.shift(1).rolling(14).mean())
        df['rolling_mean_30'] = g.transform(lambda x: x.shift(1).rolling(30).mean())
        df['rolling_std_7'] = g.transform(lambda x: x.shift(1).rolling(7).std())
        df['rolling_std_30'] = g.transform(lambda x: x.shift(1).rolling(30).std())
        
        return df

    def _add_context_features(self, df: pd.DataFrame) -> pd.DataFrame:
        # Simple OneHot or Binary encoding for Weather
        if 'IsRainy' in df.columns:
            df['is_rainy'] = df['IsRainy'].fillna(False).astype(int)
        else:
            df['is_rainy'] = 0
            
        if 'EventScore' in df.columns:
            df['event_impact'] = df['EventScore'].fillna(0)
        else:
            df['event_impact'] = 0.0
            
        return df

    def _correct_stockouts(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Creates 'TrueDemand' column.
        If StockoutFlag is True, we assume Sales were capped.
        We estimate TrueDemand = UnitsSold + LostSalesEst
        """
        if 'StockoutFlag' in df.columns and 'LostSalesEstimate' in df.columns:
            df['TrueDemand'] = df['UnitsSold']
            mask = df['StockoutFlag'] == 1
            df.loc[mask, 'TrueDemand'] += df.loc[mask, 'LostSalesEstimate']
            
            # Fallback if LostSalesEst is missing but Stockout is True
            # Use rolling mean as proxy
            if 'rolling_mean_7' in df.columns:
                mask_nan_est = mask & df['LostSalesEstimate'].isna()
                df.loc[mask_nan_est, 'TrueDemand'] = df.loc[mask_nan_est, ['UnitsSold', 'rolling_mean_7']].max(axis=1)
        else:
            # Default to UnitsSold if no correction info
            if 'UnitsSold' in df.columns:
                df['TrueDemand'] = df['UnitsSold']
                
        return df
