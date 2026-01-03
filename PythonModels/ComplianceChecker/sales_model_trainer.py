import pandas as pd
import numpy as np
import joblib
import json
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, mean_absolute_percentage_error, r2_score
from datetime import datetime

# --- CONFIGURATION ---
DATA_DIR = os.path.join("models", "Data", "2024")
ARTIFACTS_DIR = "model_artifacts"
MODEL_FILE = os.path.join(ARTIFACTS_DIR, "sales_model.pkl")
METADATA_FILE = os.path.join(ARTIFACTS_DIR, "training_metadata.json")
RANDOM_SEED = 42

def normalize_cols(df):
    """Standardizes column names to TitleCase."""
    # Strip whitespace from original columns
    df.columns = [c.strip() for c in df.columns]
    
    cols = {c.lower(): c for c in df.columns}
    mapping = {}
    if 'date' in cols: mapping[cols['date']] = 'Date'
    if 'sku' in cols: mapping[cols['sku']] = 'SKU'
    if 'unitssold' in cols: mapping[cols['unitssold']] = 'UnitsSold'
    if 'unitpricelkr' in cols: mapping[cols['unitpricelkr']] = 'UnitPriceLKR'
    if 'totalrevenuelkr' in cols: mapping[cols['totalrevenuelkr']] = 'TotalRevenueLKR'
    if 'category' in cols: mapping[cols['category']] = 'Category'
    # Apply
    return df.rename(columns=mapping)

def load_data():
    """Loads Sales and Product data from 2022-2024 and combines them."""
    years = ['2022', '2023', '2024']
    base_data_dir = os.path.join("models", "Data")
    
    all_data = []
    
    # We need a master product list for the Encoder
    # We'll accumulate all product masters we find
    master_products = pd.DataFrame()

    for year in years:
        year_dir = os.path.join(base_data_dir, year)
        if not os.path.exists(year_dir):
            print(f"Skipping {year}, directory not found.")
            continue
            
        print(f"Loading data for {year}...")
        
        # 1. Sales
        sales_file = f"Sales_{year}.csv"
        sales_path = os.path.join(year_dir, sales_file)
        if not os.path.exists(sales_path):
            print(f" - Sales file missing: {sales_path}")
            continue
            
        df_sales = pd.read_csv(sales_path)
        df_sales = normalize_cols(df_sales)
        
        # 2. Product Master
        # Try specific year first, then generic
        prod_file = f"Product_Master_{year}.csv"
        prod_path = os.path.join(year_dir, prod_file)
        if not os.path.exists(prod_path):
             prod_file = "Product_Master.csv"
             prod_path = os.path.join(year_dir, prod_file)
        
        if os.path.exists(prod_path):
            df_prod = pd.read_csv(prod_path)
            df_prod = normalize_cols(df_prod)
            
            # Fix SKU col if needed (some files might have SKU_ID)
            if 'SKU' not in df_prod.columns:
                 # Check for 'sku' case insensitive which normalize handled, but look for other names
                 pass
            
            # Merge Category
            if 'Category' not in df_prod.columns:
                 df_prod['Category'] = 'Unknown'
            
            # Keep for Master List
            master_products = pd.concat([master_products, df_prod[['SKU', 'Category']]])
            
            # Merge
            df_merged = pd.merge(df_sales, df_prod[['SKU', 'Category']], on='SKU', how='left')
            all_data.append(df_merged)
            
        else:
            print(f" - Product master missing for {year}, using sales only (Category will be unknown)")
            df_sales['Category'] = 'Unknown'
            all_data.append(df_sales)

    if not all_data:
        raise ValueError("No data loaded from any year!")
        
    final_df = pd.concat(all_data, ignore_index=True)
    print(f"✅ Combined Data: {len(final_df)} rows from {years}")
    print(f"Combined Cols: {list(final_df.columns)}") # DEBUG
    
    # Fill numeric NaNs
    if 'UnitPriceLKR' in final_df.columns:
        final_df['UnitPriceLKR'] = pd.to_numeric(final_df['UnitPriceLKR'], errors='coerce').fillna(0)
    
    # --- GLOBAL PRODUCT MASTER FOR ENCODER ---
    # Deduplicate master products
    master_products = master_products.drop_duplicates(subset=['SKU'])
    # Handle the "Baby Products" fix: Manual check if we need to load the main 2024 one again if it wasn't caught
    # (It should have been caught in the loop)
    
    return final_df, master_products

def augment_data(df):
    """
    Synthetically injects 'Shelf_Level' and adjusts 'Target_UnitsSold' 
    to simulate shelf placement impact for academic demonstration.
    """
    print("Augmenting data with synthetic Shelf Placement features...")
    np.random.seed(RANDOM_SEED)
    
    # --- Feature Engineering: Date ---
    if 'Date' in df.columns:
        df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
        # Drop invalid dates
        df = df.dropna(subset=['Date'])
        
        # IsWeekend (Saturday=5, Sunday=6)
        df['IsWeekend'] = df['Date'].dt.dayofweek.isin([5, 6]).astype(int)
        
        # New Features for Accuracy
        df['Month'] = df['Date'].dt.month
        df['DayOfWeek'] = df['Date'].dt.dayofweek
        
        # IsHoliday - Placeholder (Assume NO unless specified)
        if 'IsHoliday' not in df.columns:
            df['IsHoliday'] = 0
            
    else:
        # Fallback if no date
        print("Warning: Date column missing. Defaulting time features.")
        df['IsWeekend'] = 0
        df['Month'] = 1
        df['DayOfWeek'] = 0
        df['IsHoliday'] = 0

    # Simulate historical shelf placements (1=Bottom, 5=Eye Level)
    df['Shelf_Level'] = np.random.randint(1, 6, size=len(df))
    
    # Placement Elasticity Factor
    # Level 1: 0.8x, Level 3: 1.0x, Level 5: 1.3x
    elasticity_map = {1: 0.8, 2: 0.9, 3: 1.0, 4: 1.15, 5: 1.3}
    df['Placement_Factor'] = df['Shelf_Level'].map(elasticity_map)
    
    # Noise factor
    noise = np.random.normal(0, 0.05, size=len(df))
    
    # Adjust UnitsSold to create the "Ground Truth" for training
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
    df, df_product_master = load_data() 
    
    # Augment
    df = augment_data(df)
    
    # 3. Features
    # Encode Categoricals using FULL Product Catalog to ensure completeness
    le_cat = LabelEncoder()
    # Fit on ALL known categories from master + 'Unknown'
    if 'Category' not in df_product_master.columns:
         df_product_master['Category'] = 'Unknown'
         
    all_categories = df_product_master['Category'].astype(str).unique()
    le_cat.fit(all_categories)
    
    # Transform training data
    # Handle any categories in training that somehow aren't in master (unlikely but safe)
    df['Category'] = df['Category'].astype(str)
    
    # Filter out or map unknown
    # Ideally we'd map to 'Unknown', but for now finding common ground
    known_cats = set(le_cat.classes_)
    df['Category'] = df['Category'].apply(lambda x: x if x in known_cats else 'Unknown')
    
    # If 'Unknown' wasn't in master, we might have an issue. 
    # Let's ensure 'Unknown' is in classes
    if 'Unknown' not in known_cats:
        # Re-fit including Unknown
        all_categories = np.append(all_categories, 'Unknown')
        le_cat.fit(all_categories)
        
    df['Category_Code'] = le_cat.transform(df['Category'])
    
    features = ['UnitPriceLKR', 'Shelf_Level', 'Category_Code', 'IsWeekend', 'IsHoliday', 'Month', 'DayOfWeek']
    target = 'Augmented_UnitsSold'
    
    X = df[features]
    y = df[target]
    
    # 4. Split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=RANDOM_SEED)
    
    # 5. Train
    print("Training Random Forest Regressor (Optimized)...")
    model = RandomForestRegressor(n_estimators=200, max_depth=None, random_state=RANDOM_SEED, n_jobs=-1)
    model.fit(X_train, y_train)
    
    # 6. Evaluate
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    mape = mean_absolute_percentage_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    
    print(f"Model Evaluation:\n MAE: {mae:.4f}\n RMSE: {rmse:.4f}\n R2 Score: {r2:.4f}")
    
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
            "MAPE": mape,
            "R2_Score": r2,
            "Accuracy_Percent": round(max(0, r2) * 100, 2)
        },
        "params": {
            "model": "RandomForestRegressor",
            "n_estimators": 200,
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
    try:
        train_model()
    except Exception as e:
        print(f"❌ CRITICAL FAILURE: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
