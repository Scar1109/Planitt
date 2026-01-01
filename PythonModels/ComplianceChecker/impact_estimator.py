import joblib
import pandas as pd
import numpy as np
import os
import json
import traceback

class ImpactEstimator:
    def __init__(self, artifacts_dir="model_artifacts", data_dir=os.path.join("models", "Data", "2024")):
        self.artifacts_dir = artifacts_dir
        self.data_dir = data_dir
        self.model = None
        self.encoder = None
        self.product_map = {}
        
        self._load_resources()

    def _load_resources(self):
        # Load Model and Encoder
        model_path = os.path.join(self.artifacts_dir, "sales_model.pkl")
        encoder_path = os.path.join(self.artifacts_dir, "category_encoder.pkl")
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found at {model_path}. Run training first.")
            
        self.model = joblib.load(model_path)
        self.encoder = joblib.load(encoder_path)
        
        # Load Product Master for metadata
        prod_path = os.path.join(self.data_dir, "Product_Master.csv")
        product_meta = {}
        if os.path.exists(prod_path):
            try:
                df_prod = pd.read_csv(prod_path)
                # Create a dict: SKU -> { Category, ProductName }
                product_meta = df_prod.set_index('SKU')[['Category', 'ProductName']].to_dict('index')
            except Exception as e:
                print(f"Error loading Product Master: {e}")
            
        # Load Sales Data for Pricing (UnitPriceLKR)
        sales_path = os.path.join(self.data_dir, "Sales_2024.csv")
        price_map = {}
        if os.path.exists(sales_path):
            try:
                df_sales = pd.read_csv(sales_path)
                # Calculate average price per SKU
                # Ensure UnitPriceLKR is numeric
                df_sales['UnitPriceLKR'] = pd.to_numeric(df_sales['UnitPriceLKR'], errors='coerce')
                price_series = df_sales.mask(df_sales['UnitPriceLKR'] <= 0).groupby('SKU')['UnitPriceLKR'].mean()
                price_map = price_series.to_dict()
            except Exception as e:
                print(f"Error loading Sales Data: {e}")
            
        # Merge into unified product_map
        self.product_map = {}
        all_skus = set(product_meta.keys()) | set(price_map.keys())
        for sku in all_skus:
            meta = product_meta.get(sku, {})
            price = price_map.get(sku, 0.0)
            if np.isnan(price): price = 0.0
            
            self.product_map[sku] = {
                'Category': meta.get('Category', 'Unknown'),
                'ProductName': meta.get('ProductName', 'Unknown'),
                'UnitPriceLKR': price
            }

    def predict_impact(self, deviations: list) -> list:
        """
        Augments the deviation list with 'impact_prediction' details.
        """
        results = []
        feature_cols = ['UnitPriceLKR', 'Shelf_Level', 'Category_Code', 'IsWeekend', 'IsHoliday']
        
        for dev in deviations:
            try:
                sku = dev.get('sku')
                info = self.product_map.get(sku, {})
                
                if not info:
                    dev['impact_prediction'] = {"error": "Product data not found"}
                    results.append(dev)
                    continue
                    
                price = info.get('UnitPriceLKR', 0)
                category = str(info.get('Category', 'Unknown'))
                
                # Encode Category
                try:
                    cat_code = self.encoder.transform([category])[0]
                except (ValueError, Exception):
                    cat_code = 0 
                
                base_features = {
                    'UnitPriceLKR': price,
                    'Category_Code': cat_code,
                    'IsWeekend': 0,
                    'IsHoliday': 0
                }
                
                # 1. Estimate Current Sales
                shelf_current = 0
                if dev.get('type') == 'MISSING_ITEM':
                    shelf_current = 0
                elif dev.get('current_state'):
                    shelf_current = dev['current_state'].get('levelIndex', 1)

                sales_current = 0
                if shelf_current > 0:
                    feat_cur = base_features.copy()
                    feat_cur['Shelf_Level'] = shelf_current
                    # Predict
                    X_cur = pd.DataFrame([feat_cur])[feature_cols]
                    sales_current = self.model.predict(X_cur)[0]
                
                # 2. Estimate Optimized Sales
                shelf_opt = 0
                if dev.get('type') == 'EXTRA_ITEM':
                    shelf_opt = 0 
                elif dev.get('optimized_state'):
                    shelf_opt = dev['optimized_state'].get('levelIndex', 1)
                    
                sales_opt = 0
                if shelf_opt > 0:
                    feat_opt = base_features.copy()
                    feat_opt['Shelf_Level'] = shelf_opt
                    X_opt = pd.DataFrame([feat_opt])[feature_cols]
                    sales_opt = self.model.predict(X_opt)[0]
                    
                # 3. Calculate Impact
                sales_current = max(0, sales_current)
                sales_opt = max(0, sales_opt)
                
                unit_diff = sales_opt - sales_current
                revenue_diff = unit_diff * price
                
                uplift_pct = 0.0
                if sales_current > 0:
                    uplift_pct = (unit_diff / sales_current) * 100
                
                dev['impact_prediction'] = {
                    "sales_units_current": round(sales_current, 2),
                    "sales_units_optimized": round(sales_opt, 2),
                    "unit_opportunity": round(revenue_diff, 2), # Using revenue as opp
                    "revenue_opportunity": round(revenue_diff, 2),
                    "uplift_percentage": round(uplift_pct, 1),
                    "currency": "LKR"
                }
            except Exception as e:
                # Capture traceback
                trace = traceback.format_exc()
                dev['impact_prediction'] = {"error": str(e), "trace": trace}
            
            results.append(dev)
            
        return results

if __name__ == "__main__":
    # Test Stub
    try:
        estimator = ImpactEstimator()
        test_devs = [
            {
                "type": "MISPLACED_ITEM", 
                "sku": "LOC-COCO-500ML", 
                "current_state": {"levelIndex": 1},
                "optimized_state": {"levelIndex": 5}
            }
        ]
        # Just grab a real SKU from map if possible for test
        if estimator.product_map:
            sku = list(estimator.product_map.keys())[0]
            print(f"Testing with SKU: {sku}")
            test_devs[0]['sku'] = sku
            
        print(json.dumps(estimator.predict_impact(test_devs), indent=2))
    except Exception as e:
        print(f"Error: {e}")
