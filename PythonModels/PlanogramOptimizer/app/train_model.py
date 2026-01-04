import pandas as pd
import numpy as np
import os
import joblib
import json
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DemandModelTrainer:
    def __init__(self):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.data_dir = os.path.join(self.base_dir, "..", "data")
        self.models_dir = os.path.join(self.base_dir, "..", "models")
        
        os.makedirs(self.models_dir, exist_ok=True)
        
        self.years = ["2022", "2023", "2024"]

    def load_and_prep_data(self):
        all_sales = []
        all_inventory = []
        
        for year in self.years:
            sales_path = os.path.join(self.data_dir, year, f"Sales_{year}.csv")
            inv_path = os.path.join(self.data_dir, year, f"Inventory_Snapshot_{year}.csv")
            
            if os.path.exists(sales_path):
                logger.info(f"Loading {sales_path}")
                df = pd.read_csv(sales_path)
                df['year'] = int(year)
                # Cleanup cols: strip and lower
                df.columns = [c.strip().lower() for c in df.columns]
                logger.info(f"Columns for {year}: {df.columns.tolist()}")
                
                # Check for known variations
                if 'unitssold' in df.columns:
                     df.rename(columns={'unitssold': 'units_sold'}, inplace=True)
                
                all_sales.append(df)
            
            if os.path.exists(inv_path):
                logger.info(f"Loading {inv_path}")
                df = pd.read_csv(inv_path, low_memory=False)
                df['year'] = int(year)
                df.columns = [c.lower() for c in df.columns]
                all_inventory.append(df)
                
        if not all_sales:
            raise ValueError("No sales data found.")
            
        sales_df = pd.concat(all_sales, ignore_index=True)
        
        # Date Conversion
        sales_df['date'] = pd.to_datetime(sales_df['date'])
        sales_df['week'] = sales_df['date'].dt.isocalendar().week
        
        # Aggregations for Features
        logger.info("Aggregating data...")
        
        # 1. Weekly Sales (Target)
        weekly_sales = sales_df.groupby(['sku', 'year', 'week'])['units_sold'].sum().reset_index()
        weekly_sales.rename(columns={'units_sold': 'weekly_sales'}, inplace=True)
        
        # 2. Avg Daily Sales (Velocity)
        # Using daily mean per SKU/Year to approximate
        sku_yearly_stats = sales_df.groupby(['sku', 'year'])['units_sold'].mean().reset_index()
        sku_yearly_stats.rename(columns={'units_sold': 'avg_daily_sales'}, inplace=True)
        
        # 3. Seasonality Index
        # Calculate Global Average per SKU
        sku_global_avg = sales_df.groupby('sku')['units_sold'].mean().reset_index()
        sku_global_avg.rename(columns={'units_sold': 'global_avg'}, inplace=True)
        
        # Join to get weekly seasonality
        # This is a simplified seasonality (Current Week Sales / Global Avg Daily * 7)
        # Better: Average sales for this specific week number across years vs global average
        
        # Let's calculate avg sales for each week number across years per SKU
        seasonality_df = sales_df.groupby(['sku', 'week'])['units_sold'].mean().reset_index()
        seasonality_df.rename(columns={'units_sold': 'avg_sales_for_week'}, inplace=True)
        
        # Merge global avg to calc index
        seasonality_df = seasonality_df.merge(sku_global_avg, on='sku', how='left')
        seasonality_df['seasonality_index'] = seasonality_df['avg_sales_for_week'] / (seasonality_df['global_avg'] + 1e-5)
        
        # 4. Inventory Metrics (Low Stock Ratio, Turnover, Discard)
        # Needs inventory data joined by date/week. Since snapshots might be sparse, we compute global stats per product/year.
        inventory_stats = pd.DataFrame()
        if all_inventory:
            inv_df = pd.concat(all_inventory, ignore_index=True)
            # Assuming 'stock_on_hand' or 'opening_stock' exists. checking cols...
            # From earlier `head` output: 'OpeningStock', 'SoldQty', 'Discarded' (maybe)
            
            # Map columns loosely
            cols_map = {
                'openingstock': 'stock', 
                'opening_stock': 'stock', 
                'discarded': 'discard', 
                'total_discard': 'discard',
                'discardqty': 'discard',
                'waste': 'discard'
            }
            inv_df.rename(columns=lambda x: cols_map.get(x, x), inplace=True)
            
            logger.info(f"Inventory Columns after rename: {inv_df.columns.tolist()}")
            
            # Low Stock Ratio: Count of days with stock < threshold
            # We treat 'stock' column as daily snapshot if date exists, else aggregate
            # Assuming 'date' in inv_df
            inv_df['is_low_stock'] = inv_df['stock'] < 10 # Arbitrary threshold
            
            agg_dict = {
                'stock': 'mean', # Avg Inventory
                'is_low_stock': 'mean', # Ratio of days low stock
            }
            
            if 'discard' in inv_df.columns:
                agg_dict['discard'] = 'sum'
            
            inv_stats = inv_df.groupby(['sku', 'year']).agg(agg_dict).reset_index()
            
            # Ensure 'discard' exists in output even if not aggregated
            if 'discard' not in inv_stats.columns:
                inv_stats['discard'] = 0.0
            
            inv_stats.rename(columns={
                'stock': 'avg_inventory',
                'is_low_stock': 'low_stock_ratio',
                'discard': 'total_discard'
            }, inplace=True)
            
            inventory_stats = inv_stats

        # --- Merge Features ---
        # Base: Weekly Sales (Target is next week? For sim usage we predict "Demand" generally)
        # Let's frame it: Predict Weekly Sales based on features.
        
        dataset = weekly_sales.merge(sku_yearly_stats, on=['sku', 'year'], how='left')
        dataset = dataset.merge(seasonality_df[['sku', 'week', 'seasonality_index']], on=['sku', 'week'], how='left')
        
        if not inventory_stats.empty:
            dataset = dataset.merge(inventory_stats, on=['sku', 'year'], how='left')
        
        # Fill NaNs
        dataset.fillna(0, inplace=True)
        
        # Feature: Turnover Days
        # Avg Inventory / Avg Daily Sales
        dataset['turnover_days'] = dataset['avg_inventory'] / (dataset['avg_daily_sales'] + 1e-5)
        
        return dataset

    def train(self):
        logger.info("Starting model training...")
        
        df = self.load_and_prep_data()
        
        # Encoder
        le = LabelEncoder()
        df['sku_encoded'] = le.fit_transform(df['sku'])
        
        # Save Encoder
        joblib.dump(le, os.path.join(self.models_dir, "sku_encoder.joblib"))
        
        # Features & Target
        # Features: SKU, Seasonality, Avg Daily Sales (lagged knowledge), Stock signals
        # Target: Weekly Sales
        feature_cols = ['sku_encoded', 'week', 'avg_daily_sales', 'seasonality_index', 'low_stock_ratio', 'total_discard', 'turnover_days']
        target_col = 'weekly_sales'
        
        X = df[feature_cols]
        y = df[target_col]
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)
        
        # Evaluation
        preds = model.predict(X_test)
        mse = mean_squared_error(y_test, preds)
        r2 = r2_score(y_test, preds)
        
        logger.info(f"Model Trained. MSE: {mse:.2f}, R2: {r2:.2f}")
        
        # Feature Importance
        importances = dict(zip(feature_cols, model.feature_importances_))
        logger.info(f"Feature Importances: {importances}")
        
        # Save Model
        joblib.dump(model, os.path.join(self.models_dir, "demand_model.joblib"))
        
        # Save Metadata
        metadata = {
            "training_date": datetime.now().isoformat(),
            "mse": mse,
            "r2_score": r2,
            "feature_importances": importances,
            "features": feature_cols,
            "data_years": self.years
        }
        
        with open(os.path.join(self.models_dir, "model_metadata.json"), "w") as f:
            json.dump(metadata, f, indent=4)
            
        logger.info("Training complete. Artifacts saved.")

if __name__ == "__main__":
    trainer = DemandModelTrainer()
    trainer.train()
