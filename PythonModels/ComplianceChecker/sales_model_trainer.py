import pandas as pd
import numpy as np
import joblib
import json
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, mean_absolute_percentage_error
from datetime import datetime

# --- CONFIGURATION ---
DATA_DIR = os.path.join("models", "Data", "2024")
ARTIFACTS_DIR = "model_artifacts"
MODEL_FILE = os.path.join(ARTIFACTS_DIR, "sales_model.pkl")
METADATA_FILE = os.path.join(ARTIFACTS_DIR, "training_metadata.json")
RANDOM_SEED = 42

def load_data():
    """Loads Sales and Product data."""
    sales_path = os.path.join(DATA_DIR, "Sales_2024.csv")
    product_path = os.path.join(DATA_DIR, "Product_Master.csv")
    
    if not os.path.exists(sales_path) or not os.path.exists(product_path):
        raise FileNotFoundError(f"Data files not found in {DATA_DIR}")
        
    print(f"Loading data from {DATA_DIR}...")
    df_sales = pd.read_csv(sales_path)
    df_product = pd.read_csv(product_path)
    
    # Merge on SKU
    df = pd.merge(df_sales, df_product[['SKU', 'Category', 'SubCategory']], on='SKU', how='left')
    return df

def augment_data(df):
    """
    Synthetically injects 'Shelf_Level' and adjusts 'Target_UnitsSold' 
    to simulate shelf placement impact for academic demonstration.
    
    Assumption: Eye-level (Level 4 & 5) increases sales by ~20-30%.
    """
    print("Augmenting data with synthetic Shelf Placement features...")
    np.random.seed(RANDOM_SEED)
    
    # Simulate historical shelf placements (1=Bottom, 5=Eye Level)
    df['Shelf_Level'] = np.random.randint(1, 6, size=len(df))
    
    # Placement Elasticity Factor
    # Level 1: 0.8x, Level 3: 1.0x, Level 5: 1.3x
    elasticity_map = {1: 0.8, 2: 0.9, 3: 1.0, 4: 1.15, 5: 1.3}
    df['Placement_Factor'] = df['Shelf_Level'].map(elasticity_map)
    
    # Noise factor
    noise = np.random.normal(0, 0.05, size=len(df))
    
    # Adjust UnitsSold to create the "Ground Truth" for training
    # We assume the historical 'UnitsSold' in CSV was the result of this specific placement
    # BUT for the model to learn, we don't change the target, we use this as a feature.
    # WAIT. If we want to predict "Uplift", we need the model to learn: Sales = f(Price, ShelfLevel, ...)
    # The current CSV data 'UnitsSold' likely doesn't correlate with our random 'Shelf_Level'.
    # So we must MODIFY 'UnitsSold' to force a correlation, or else the model will learn nothing.
    
    df['Base_Demand'] = df['UnitsSold'] # Treat CSV as base demand
    df['Augmented_UnitsSold'] = df['Base_Demand'] * (df['Placement_Factor'] + noise)
    df['Augmented_UnitsSold'] = df['Augmented_UnitsSold'].round().astype(int)
    
    return df

def train_model():
    """Pipeline: Load -> Augment -> Preprocess -> Train -> Eval -> Save"""
    
    # 1. Setup
    if not os.path.exists(ARTIFACTS_DIR):
        os.makedirs(ARTIFACTS_DIR)
        
    start_time = datetime.now().isoformat()
    
    # 2. Data
    df = load_data()
    df = augment_data(df)
    
    # 3. Features
    # Encode Categoricals
    le_cat = LabelEncoder()
    df['Category_Code'] = le_cat.fit_transform(df['Category'].astype(str))
    
    features = ['UnitPriceLKR', 'Shelf_Level', 'Category_Code', 'IsWeekend', 'IsHoliday']
    target = 'Augmented_UnitsSold'
    
    X = df[features]
    y = df[target]
    
    # 4. Split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=RANDOM_SEED)
    
    # 5. Train
    print("Training Random Forest Regressor...")
    model = RandomForestRegressor(n_estimators=100, random_state=RANDOM_SEED)
    model.fit(X_train, y_train)
    
    # 6. Evaluate
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    mape = mean_absolute_percentage_error(y_test, predictions)
    
    print(f"Model Evaluation:\n MAE: {mae:.4f}\n RMSE: {rmse:.4f}\n MAPE: {mape:.4f}")
    
    # 7. Consistency Checks
    # Verify that higher shelf level predicts higher sales for a sample
    sample_item = X_test.iloc[0].copy()
    sample_item['Shelf_Level'] = 1
    pred_low = model.predict(pd.DataFrame([sample_item]))[0]
    sample_item['Shelf_Level'] = 5
    pred_high = model.predict(pd.DataFrame([sample_item]))[0]
    
    uplift_check = ((pred_high - pred_low) / pred_low) * 100
    print(f"Sanity Check (Level 1 vs 5 Uplift): {uplift_check:.2f}%")
    
    # 8. Save Artifacts
    joblib.dump(model, MODEL_FILE)
    joblib.dump(le_cat, os.path.join(ARTIFACTS_DIR, "category_encoder.pkl"))
    
    metadata = {
        "timestamp": start_time,
        "metrics": {
            "MAE": mae,
            "RMSE": rmse,
            "MAPE": mape
        },
        "params": {
            "model": "RandomForestRegressor",
            "n_estimators": 100,
            "seed": RANDOM_SEED
        },
        "features": features,
        "sanity_check_uplift_percent": uplift_check
    }
    
    with open(METADATA_FILE, 'w') as f:
        json.dump(metadata, f, indent=4)
        
    print(f"Model saved to {MODEL_FILE}")
    print(f"Metadata saved to {METADATA_FILE}")

if __name__ == "__main__":
    train_model()
