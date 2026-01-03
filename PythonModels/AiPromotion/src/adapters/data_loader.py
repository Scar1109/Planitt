import pandas as pd
import glob
import os
from typing import List, Dict

class DataLoader:
    def __init__(self, dataset_path: str):
        self.dataset_path = dataset_path

    def load_product_master(self) -> pd.DataFrame:
        """Loads Product_Master.csv"""
        # Search recursively for Product_Master.csv
        files = glob.glob(os.path.join(self.dataset_path, "**", "Product_Master.csv"), recursive=True)
        if not files:
            # If Product Master not found, return an empty DataFrame with expected columns
            print("!! Product Master not found. Will infer metadata.")
            return pd.DataFrame(columns=['SKU', 'Category', 'CostPriceLKR', 'ProductName'])
        
        df = pd.read_csv(files[0])
        # Ensure SKU is string and stripped
        df['SKU'] = df['SKU'].astype(str).str.strip()
        return df

    def load_sales_history(self, years: List[int]) -> pd.DataFrame:
        """Loads and concatenates Sales_YYYY.csv"""
        dfs = []
        for year in years:
            files = glob.glob(os.path.join(self.dataset_path, "**", f"Sales_{year}.csv"), recursive=True)
            if files:
                dfs.append(pd.read_csv(files[0]))
        
        if not dfs:
            raise FileNotFoundError("No Sales history found")
            
        df = pd.concat(dfs, ignore_index=True)
        # Ensure SKU is string and stripped
        df['SKU'] = df['SKU'].astype(str).str.strip()
        return df

    def load_inventory_snapshot(self, year: int) -> pd.DataFrame:
        """Loads Inventory_Snapshot_YYYY.csv"""
        files = glob.glob(os.path.join(self.dataset_path, "**", f"Inventory_Snapshot_{year}.csv"), recursive=True)
        if not files:
            raise FileNotFoundError(f"Inventory_Snapshot_{year}.csv not found")
            
        df = pd.read_csv(files[0])
        # Ensure SKU is string and stripped
        df['SKU'] = df['SKU'].astype(str).str.strip()
        return df

    def load_weather(self, years: List[int]) -> pd.DataFrame:
        """Loads Weather_Ambalangoda_YYYY.csv"""
        dfs = []
        for year in years:
            files = glob.glob(os.path.join(self.dataset_path, "**", f"Weather_Ambalangoda_{year}.csv"), recursive=True)
            if files:
                dfs.append(pd.read_csv(files[0]))
        
        if not dfs:
             # Return empty DF if weather misses, don't crash, handle in Guardian
            return pd.DataFrame()
            
        return pd.concat(dfs, ignore_index=True)

    def build_golden_table(self, years: List[int] = [2022, 2023, 2024]) -> pd.DataFrame:
        """
        Joins all sources into the SKU_DAILY_FACT table.
        This is the raw join, cleaning happens in DataGuardian.
        """
        
        # 1. Load Sources
        sales = self.load_sales_history(years)
        products = self.load_product_master()
        weather = self.load_weather(years)
        
        # 2. Standardize Dates
        sales['Date'] = pd.to_datetime(sales['Date'])
        weather['Date'] = pd.to_datetime(weather['Date'])
        
        # 3. Join Product Master
        # Sales.SKU -> Product.SKU
        # NOTE: We use left join to preserve sales even if product master is missing/mismatched
        merged = pd.merge(sales, products, on='SKU', how='left')
        
        # 4. Join Weather
        # Sales.Date -> Weather.Date
        merged = pd.merge(merged, weather, on='Date', how='left')
        
        # 5. Inventory Context (Using latest snapshot as proxy features)
        # 6. Finalize via DataCleaner
        from src.data_engineering.cleaner import DataCleaner
        cleaner = DataCleaner()
        merged = cleaner.finalize_golden_table(merged)
        
        return merged
