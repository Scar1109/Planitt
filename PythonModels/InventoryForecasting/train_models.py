"""
SmartReplan+ Model Training Script - ENHANCED
==============================================
Multi-Year Weather & External Factors Analysis (2022-2024)

Trains AI models for demand forecasting and waste risk prediction with:
- Multi-year weather patterns
- Sri Lankan cultural events (Poya days, holidays)
- Monsoon season effects
- Weather-product category interactions
- Economic factors by year

Your CSV Structure (lowercase columns):
- sales_{year}.csv: date, sku, unitssold, unitpricelkr, promotionflag, promotiontype, stockoutflag
- inventory_snapshot_{year}.csv: date, sku, openingstock, receivedqty, soldqty, discardedqty, closingstock, etc.
- product_master_{year}.csv: sku, barcode, productname, category, brand, unitsize, basepricelkr, typicalshelflifedays, etc.
- weather_ambalangoda_{year}.csv: date, avgtemperaturec, rainfallmm, condition, humiditypercent

Usage:
    python train_models.py
"""

import os
import logging
import pickle
import warnings
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error,
    classification_report, accuracy_score, precision_score, recall_score, f1_score
)

warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Paths
BASE_DIR = Path(__file__).parent
# DATA_DIR = BASE_DIR / "data"  <-- Old path
DATA_DIR = BASE_DIR.parent.parent / "Dataset" # Point to root Dataset folder
MODELS_DIR = BASE_DIR / "models"

# Create models directory
MODELS_DIR.mkdir(exist_ok=True)


def load_all_data():
    """Load and combine all CSV data from 2022, 2023, 2024 folders."""
    logger.info("=" * 70)
    logger.info("📂 LOADING DATA FROM CSV FILES")
    logger.info("=" * 70)
    
    all_sales = []
    all_inventory = []
    all_products = []
    all_weather = []
    
    years = ["2022", "2023", "2024"]
    
    for year in years:
        year_path = DATA_DIR / year
        if not year_path.exists():
            logger.warning(f"⚠️  Folder not found: {year_path}")
            continue
        
        logger.info(f"\n📁 Processing {year} folder...")
        
        # Sales data
        sales_file = year_path / f"Sales_{year}.csv"
        if sales_file.exists():
            df = pd.read_csv(sales_file)
            df.columns = df.columns.str.lower()
            df['data_year'] = int(year)
            all_sales.append(df)
            logger.info(f"   ✅ Sales_{year}.csv: {len(df):,} rows")
        
        # Inventory data
        inv_file = year_path / f"Inventory_Snapshot_{year}.csv"
        if inv_file.exists():
            df = pd.read_csv(inv_file)
            df.columns = df.columns.str.lower()
            df['data_year'] = int(year)
            all_inventory.append(df)
            logger.info(f"   ✅ Inventory_Snapshot_{year}.csv: {len(df):,} rows")
        
        # Product master
        prod_file = year_path / f"Product_Master_{year}.csv"
        if prod_file.exists():
            df = pd.read_csv(prod_file)
            df.columns = df.columns.str.lower()
            all_products.append(df)
            logger.info(f"   ✅ Product_Master_{year}.csv: {len(df):,} rows")
        
        # Weather data
        weather_file = year_path / f"Weather_Ambalangoda_{year}.csv"
        if weather_file.exists():
            df = pd.read_csv(weather_file)
            df.columns = df.columns.str.lower()
            all_weather.append(df)
            logger.info(f"   ✅ Weather_Ambalangoda_{year}.csv: {len(df):,} rows")
    
    # Combine all data
    sales_df = pd.concat(all_sales, ignore_index=True) if all_sales else pd.DataFrame()
    inventory_df = pd.concat(all_inventory, ignore_index=True) if all_inventory else pd.DataFrame()
    products_df = pd.concat(all_products, ignore_index=True).drop_duplicates(subset=['sku']) if all_products else pd.DataFrame()
    weather_df = pd.concat(all_weather, ignore_index=True).drop_duplicates(subset=['date']) if all_weather else pd.DataFrame()
    
    logger.info(f"\n📊 Data Summary:")
    logger.info(f"   - Total Sales records: {len(sales_df):,}")
    logger.info(f"   - Total Inventory records: {len(inventory_df):,}")
    logger.info(f"   - Unique Products: {len(products_df):,}")
    logger.info(f"   - Weather records: {len(weather_df):,}")
    
    return sales_df, inventory_df, products_df, weather_df


def prepare_demand_features(sales_df, weather_df, products_df):
    """
    Prepare features for demand forecasting with multi-year analysis and external factors.
    
    Enhanced to consider:
    - Multi-year weather patterns (2022-2024)
    - Sri Lankan cultural events (Poya days, holidays)
    - Monsoon season effects (SW & NE monsoons)
    - Weather-product category interactions
    - Economic factors by year
    """
    logger.info("\n🔧 Preparing Enhanced Demand Forecasting Features...")
    logger.info("   📊 Including: Multi-year patterns, Weather impacts, External factors")
    
    if sales_df.empty:
        logger.error("❌ No sales data available!")
        return None, None, None, None
    
    # Parse dates
    sales_df['date'] = pd.to_datetime(sales_df['date'], errors='coerce')
    sales_df = sales_df.dropna(subset=['date'])
    
    # Merge with weather data
    if not weather_df.empty:
        weather_df['date'] = pd.to_datetime(weather_df['date'], errors='coerce')
        sales_df = sales_df.merge(weather_df, on='date', how='left')
        logger.info("   ✅ Merged weather data")
    
    # Merge with product data for category info
    if not products_df.empty:
        sales_df = sales_df.merge(products_df[['sku', 'category', 'typicalshelflifedays']], on='sku', how='left')
        logger.info("   ✅ Merged product data")
    
    # ============================================
    # TIME-BASED FEATURES
    # ============================================
    sales_df['year'] = sales_df['date'].dt.year
    sales_df['dayofweek'] = sales_df['date'].dt.dayofweek
    sales_df['dayofmonth'] = sales_df['date'].dt.day
    sales_df['month'] = sales_df['date'].dt.month
    sales_df['quarter'] = sales_df['date'].dt.quarter
    sales_df['weekofyear'] = sales_df['date'].dt.isocalendar().week.astype(int)
    sales_df['dayofyear'] = sales_df['date'].dt.dayofyear
    sales_df['isweekend'] = (sales_df['dayofweek'] >= 5).astype(int)
    sales_df['ismonthend'] = (sales_df['dayofmonth'] >= 25).astype(int)
    sales_df['ismonthstart'] = (sales_df['dayofmonth'] <= 5).astype(int)
    
    # ============================================
    # SRI LANKAN CULTURAL & RELIGIOUS EVENTS
    # ============================================
    logger.info("   🇱🇰 Adding Sri Lankan cultural events...")
    
    # Poya days (Full Moon - approximately 14-16 of each month)
    sales_df['ispoyaday'] = ((sales_df['dayofmonth'] >= 14) & (sales_df['dayofmonth'] <= 16)).astype(int)
    
    # Major festivals
    sales_df['isnewyear'] = ((sales_df['month'] == 4) & (sales_df['dayofmonth'].between(13, 15))).astype(int)
    sales_df['isves ak'] = ((sales_df['month'] == 5) & (sales_df['dayofmonth'].between(14, 16))).astype(int)
    sales_df['isramadanperiod'] = (sales_df['month'].isin([3, 4, 5])).astype(int)
    sales_df['ischristmasseason'] = ((sales_df['month'] == 12) & (sales_df['dayofmonth'] >= 20)).astype(int)
    
    # ============================================
    # MONSOON SEASON EFFECTS
    # ============================================
    logger.info("   🌧️ Adding monsoon season patterns...")
    
    sales_df['isswmonsoon'] = (sales_df['month'].between(5, 9)).astype(int)
    sales_df['isnemonsoon'] = (sales_df['month'].isin([10, 11, 12, 1])).astype(int)
    sales_df['isintermonsoon'] = ((sales_df['isswmonsoon'] == 0) & (sales_df['isnemonsoon'] == 0)).astype(int)
    
    # ============================================
    # WEATHER FEATURES WITH IMPACT ANALYSIS
    # ============================================
    logger.info("   🌤️ Processing weather features...")
    
    # Temperature features
    if 'avgtemperaturec' in sales_df.columns:
        sales_df['avgtemperaturec'] = pd.to_numeric(sales_df['avgtemperaturec'], errors='coerce').fillna(28)
        sales_df['temphot'] = (sales_df['avgtemperaturec'] > 30).astype(int)
        sales_df['tempcool'] = (sales_df['avgtemperaturec'] < 25).astype(int)
        sales_df['tempmoderate'] = ((sales_df['avgtemperaturec'] >= 25) & (sales_df['avgtemperaturec'] <= 30)).astype(int)
    
    # Rainfall features
    if 'rainfallmm' in sales_df.columns:
        sales_df['rainfallmm'] = pd.to_numeric(sales_df['rainfallmm'], errors='coerce').fillna(0)
        sales_df['israiny'] = (sales_df['rainfallmm'] > 2.5).astype(int)
        sales_df['isheavyrain'] = (sales_df['rainfallmm'] > 10).astype(int)
        sales_df['isdryday'] = (sales_df['rainfallmm'] == 0).astype(int)
        
        # 7-day rolling rainfall average
        sales_df = sales_df.sort_values('date')
        sales_df['rainfall7dayavg'] = sales_df.groupby('sku')['rainfallmm'].transform(
            lambda x: x.rolling(window=7, min_periods=1).mean()
        )
    
    # Humidity features
    if 'humiditypercent' in sales_df.columns:
        sales_df['humiditypercent'] = pd.to_numeric(sales_df['humiditypercent'], errors='coerce').fillna(75)
        sales_df['highhumidity'] = (sales_df['humiditypercent'] > 80).astype(int)
    
    # ============================================
    # WEATHER-CATEGORY INTERACTIONS
    # ============================================
    logger.info("   🔄 Creating weather-category interactions...")
    
    if 'category' in sales_df.columns:
        sales_df['category'] = sales_df['category'].fillna('Unknown')
        
        # Hot weather + Beverages/Cold products
        sales_df['hotweather_beverage'] = 0
        sales_df['hotweather_icecream'] = 0
        
        if 'temphot' in sales_df.columns:
            sales_df.loc[sales_df['category'].str.contains('Beverage|Drink', case=False, na=False), 
                        'hotweather_beverage'] = sales_df['temphot']
            sales_df.loc[sales_df['category'].str.contains('Frozen|Ice|Dairy', case=False, na=False), 
                        'hotweather_icecream'] = sales_df['temphot']
        
        # Rainy weather + Packaged goods
        sales_df['rainyday_packagedgoods'] = 0
        if 'israiny' in sales_df.columns:
            sales_df.loc[sales_df['category'].str.contains('Packaged|Canned|Dry', case=False, na=False), 
                        'rainyday_packagedgoods'] = sales_df['israiny']
        
        # Poya day + Vegetarian products
        sales_df['poyaday_vegdemand'] = 0
        sales_df['poyaday_meatdecline'] = 0
        
        sales_df.loc[sales_df['category'].str.contains('Fruit|Vegetable|Fresh', case=False, na=False), 
                    'poyaday_vegdemand'] = sales_df['ispoyaday']
        sales_df.loc[sales_df['category'].str.contains('Meat|Fish|Poultry|Seafood', case=False, na=False), 
                    'poyaday_meatdecline'] = sales_df['ispoyaday']
    
    # ============================================
    # YEAR-SPECIFIC FEATURES (Economic Impact)
    # ============================================
    logger.info("   📈 Adding year-specific economic factors...")
    
    sales_df['is2022crisis'] = (sales_df['year'] == 2022).astype(int)
    sales_df['yeartrend'] = sales_df['year'] - 2022
    
    # ============================================
    # LAG FEATURES (TEMPORAL PATTERNS)
    # ============================================
    logger.info("   ⏱️ Creating lag features...")
    
    sales_df = sales_df.sort_values(['sku', 'date'])
    
    # Rolling averages
    sales_df['sales7dayavg'] = sales_df.groupby('sku')['unitssold'].transform(
        lambda x: x.rolling(window=7, min_periods=1).mean()
    )
    
    sales_df['sales30dayavg'] = sales_df.groupby('sku')['unitssold'].transform(
        lambda x: x.rolling(window=30, min_periods=1).mean()
    )
    
    # NEW: Volatility feature (Standard Deviation)
    sales_df['sales7daystd'] = sales_df.groupby('sku')['unitssold'].transform(
        lambda x: x.rolling(window=7, min_periods=1).std()
    ).fillna(0) # Fill NaN (first few days) with 0

    # NEW: Intermediate lag
    sales_df['sales14dayavg'] = sales_df.groupby('sku')['unitssold'].transform(
        lambda x: x.rolling(window=14, min_periods=1).mean()
    )
    
    sales_df['dayofweek_avg'] = sales_df.groupby(['sku', 'dayofweek'])['unitssold'].transform('mean')
    
    # ============================================
    # ENCODE CATEGORICAL FEATURES
    # ============================================
    logger.info("   🔢 Encoding categorical features...")
    
    le_sku = LabelEncoder()
    sales_df['sku_encoded'] = le_sku.fit_transform(sales_df['sku'].astype(str))
    
    le_category = LabelEncoder()
    if 'category' in sales_df.columns:
        sales_df['category_encoded'] = le_category.fit_transform(sales_df['category'])
    
    # ============================================
    # BUILD FEATURE LIST
    # ============================================
    feature_cols = [
        'sku_encoded', 'year', 'dayofweek', 'dayofmonth', 'month', 'quarter', 'weekofyear', 'dayofyear',
        'isweekend', 'ismonthend', 'ismonthstart',
        'ispoyaday', 'isnewyear', 'isves ak', 'isramadanperiod', 'ischristmasseason',
        'isswmonsoon', 'isnemonsoon', 'isintermonsoon',
        'is2022crisis', 'yeartrend',
    ]
    
    # Add promotion features
    if 'promotionflag' in sales_df.columns:
        sales_df['promotionflag'] = sales_df['promotionflag'].map({'true': 1, 'false': 0, True: 1, False: 0})
        sales_df['promotionflag'] = pd.to_numeric(sales_df['promotionflag'], errors='coerce').fillna(0)
        feature_cols.append('promotionflag')
    
    # Add price feature
    if 'unitpricelkr' in sales_df.columns:
        sales_df['unitpricelkr'] = pd.to_numeric(sales_df['unitpricelkr'], errors='coerce').fillna(0)
        feature_cols.append('unitpricelkr')
    
    # Add weather features
    if 'avgtemperaturec' in sales_df.columns:
        feature_cols.extend(['avgtemperaturec', 'temphot', 'tempcool', 'tempmoderate'])
    
    if 'rainfallmm' in sales_df.columns:
        feature_cols.extend(['rainfallmm', 'israiny', 'isheavyrain', 'isdryday', 'rainfall7dayavg'])
    
    if 'humiditypercent' in sales_df.columns:
        feature_cols.extend(['humiditypercent', 'highhumidity'])
    
    # Add interactions
    feature_cols.extend([
        'hotweather_beverage', 'hotweather_icecream', 
        'rainyday_packagedgoods', 'poyaday_vegdemand', 'poyaday_meatdecline'
    ])
    
    # Add lag features
    feature_cols.extend(['sales7dayavg', 'sales14dayavg', 'sales30dayavg', 'sales7daystd', 'dayofweek_avg'])
    
    # Add category
    if 'category_encoded' in sales_df.columns:
        feature_cols.append('category_encoded')
    
    # Target variable
    sales_df['unitssold'] = pd.to_numeric(sales_df['unitssold'], errors='coerce').fillna(0)
    
    # Fill NaN
    sales_df[feature_cols] = sales_df[feature_cols].fillna(0)
    
    X = sales_df[feature_cols].values
    y = sales_df['unitssold'].values
    
    logger.info(f"\n   ✅ Total Features: {len(feature_cols)}")
    logger.info(f"   ✅ Total Samples: {len(X):,}")
    logger.info(f"   ✅ Date Range: {sales_df['date'].min()} to {sales_df['date'].max()}")
    logger.info(f"   ✅ Years Covered: {sorted(sales_df['year'].unique())}")
    
    logger.info(f"\n   📋 Feature Categories:")
    logger.info(f"      - Time features: 13")
    logger.info(f"      - Cultural events: 5")
    logger.info(f"      - Monsoon seasons: 3")
    logger.info(f"      - Weather features: {sum('temp' in f or 'rain' in f or 'humidity' in f for f in feature_cols)}")
    logger.info(f"      - Weather-category interactions: 5")
    logger.info(f"      - Lag features: 3")
    
    # Save artifacts
    with open(MODELS_DIR / "sku_encoder.pkl", 'wb') as f:
        pickle.dump(le_sku, f)
    
    with open(MODELS_DIR / "demand_feature_cols.pkl", 'wb') as f:
        pickle.dump(feature_cols, f)
    
    logger.info(f"\n   💾 Saved encoders and feature list")
    
    return X, y, feature_cols, le_sku


def train_demand_model(X, y, feature_cols):
    """Train enhanced demand forecasting model with multi-year data support."""
    logger.info("\n" + "=" * 70)
    logger.info("🚀 TRAINING ENHANCED DEMAND FORECASTING MODEL")
    logger.info("=" * 70)
    
    if X is None or y is None:
        logger.error("❌ No data to train!")
        return None
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    logger.info(f"   Training samples: {len(X_train):,}")
    logger.info(f"   Test samples: {len(X_test):,}")
    logger.info(f"   Total features: {len(feature_cols)}")
    
    
    # Optimized Gradient Boosting parameters for better accuracy
    # Target: RMSE < 10, MAPE < 15%
    # Using HistGradientBoostingRegressor for speed (LightGBM inspired)
    model = HistGradientBoostingRegressor(
        max_iter=500,               # Equivalent to n_estimators
        learning_rate=0.05,
        max_depth=7,
        max_leaf_nodes=31,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=20,
        random_state=42,
        verbose=1
    )
    logger.info("\n   🔄 Training in progress (optimized for multi-year patterns)...")
    logger.info("   ⏳ This may take several minutes...")
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    y_train_pred = model.predict(X_train)
    
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae_train = mean_absolute_error(y_train, y_train_pred)
    rmse_train = np.sqrt(mean_squared_error(y_train, y_train_pred))
    
    numerator = np.abs(y_test - y_pred)
    denominator = np.abs(y_test) + np.abs(y_pred) + 1e-8
    smape = 100 * np.mean(2 * numerator / denominator)
    
    mask = y_test > 1
    if mask.sum() > 0:
        mape = min(100, np.mean(np.abs((y_test[mask] - y_pred[mask]) / y_test[mask])) * 100)
    else:
        mape = smape
    
    logger.info(f"\n📈 Model Performance:")
    logger.info(f"   Test Set:")
    logger.info(f"      - MAE: {mae:.2f} units")
    logger.info(f"      - RMSE: {rmse:.2f} units")
    logger.info(f"      - MAPE: {mape:.2f}%")
    logger.info(f"      - sMAPE: {smape:.2f}%")
    logger.info(f"   Training Set:")
    logger.info(f"      - MAE: {mae_train:.2f} units")
    logger.info(f"      - RMSE: {rmse_train:.2f} units")
    
    overfitting_ratio = mae / (mae_train + 0.001)
    if overfitting_ratio > 1.5:
        logger.warning(f"   ⚠️ Possible overfitting detected (ratio: {overfitting_ratio:.2f})")
    else:
        logger.info(f"   ✅ Model generalization looks good (ratio: {overfitting_ratio:.2f})")
    
    # Feature importance analysis
    logger.info(f"\n🔍 Feature Importance Analysis:")
    try:
        importance = sorted(zip(feature_cols, model.feature_importances_), key=lambda x: -x[1])
        
        logger.info(f"\n   📊 Top 15 Most Important Features:")
        for i, (feat, imp) in enumerate(importance[:15], 1):
            logger.info(f"      {i:2d}. {feat:30s} - {imp:.4f}")
        
        # Group importance by category
        weather_features = ['avgtemperaturec', 'temphot', 'tempcool', 'tempmoderate', 
                           'rainfallmm', 'israiny', 'isheavyrain', 'isdryday', 'rainfall7dayavg',
                           'humiditypercent', 'highhumidity']
        
        cultural_features = ['ispoyaday', 'isnewyear', 'isves ak', 'isramadanperiod', 'ischristmasseason']
        
        monsoon_features = ['isswmonsoon', 'isnemonsoon', 'isintermonsoon']
        
        interaction_features = ['hotweather_beverage', 'hotweather_icecream', 
                               'rainyday_packagedgoods', 'poyaday_vegdemand', 'poyaday_meatdecline']
        
        year_features = ['year', 'yeartrend', 'is2022crisis']
        lag_features = ['sales7dayavg', 'sales14dayavg', 'sales30dayavg', 'sales7daystd', 'dayofweek_avg']
        
        def get_category_importance(feature_list):
            return sum(imp for feat, imp in importance if feat in feature_list)
        
        weather_imp = get_category_importance(weather_features)
        cultural_imp = get_category_importance(cultural_features)
        monsoon_imp = get_category_importance(monsoon_features)
        interaction_imp = get_category_importance(interaction_features)
        year_imp = get_category_importance(year_features)
        lag_imp = get_category_importance(lag_features)
        
        logger.info(f"\n   📁 Feature Category Impact:")
        logger.info(f"      - Weather Features:          {weather_imp:.4f} ({weather_imp*100:.1f}%)")
        logger.info(f"      - Cultural Events:           {cultural_imp:.4f} ({cultural_imp*100:.1f}%)")
        logger.info(f"      - Monsoon Patterns:          {monsoon_imp:.4f} ({monsoon_imp*100:.1f}%)")
        logger.info(f"      - Weather-Category Interact: {interaction_imp:.4f} ({interaction_imp*100:.1f}%)")
        logger.info(f"      - Year/Economic Factors:     {year_imp:.4f} ({year_imp*100:.1f}%)")
        logger.info(f"      - Lag/Historical Patterns:   {lag_imp:.4f} ({lag_imp*100:.1f}%)")
        
    except AttributeError:
        logger.info("   ℹ️ Feature importance not available for HistGradientBoostingRegressor (skipped)")
        importance = []
        weather_imp = 0.0
        cultural_imp = 0.0
        monsoon_imp = 0.0
        interaction_imp = 0.0
        year_imp = 0.0
        lag_imp = 0.0
    
    model_path = MODELS_DIR / "demand_forecast_model.pkl"
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    logger.info(f"\n💾 Model saved to: {model_path}")
    
    metrics = {
        'mae': float(mae),
        'rmse': float(rmse),
        'mape': float(mape),
        'smape': float(smape),
        'mae_train': float(mae_train),
        'rmse_train': float(rmse_train),
        'overfitting_ratio': float(overfitting_ratio),
        'training_samples': len(X_train),
        'test_samples': len(X_test),
        'total_samples': len(X_train) + len(X_test),
        'total_features': len(feature_cols),
        'weather_importance': float(weather_imp),
        'cultural_importance': float(cultural_imp),
        'monsoon_importance': float(monsoon_imp),
        'interaction_importance': float(interaction_imp),
        'year_importance': float(year_imp),
        'lag_importance': float(lag_imp),
        'top_features': [feat for feat, _ in importance[:10]],
        'trained_at': datetime.now().isoformat()
    }
    with open(MODELS_DIR / "demand_metrics.pkl", 'wb') as f:
        pickle.dump(metrics, f)
    
    importance_df = pd.DataFrame(importance, columns=['Feature', 'Importance'])
    importance_df.to_csv(MODELS_DIR / "feature_importance.csv", index=False)
    logger.info(f"   💾 Feature importance saved to: feature_importance.csv")
    
    return model


def prepare_waste_features(inventory_df, products_df):
    """Prepare features for waste risk prediction using actual columns."""
    logger.info("\n🔧 Preparing Waste Risk Features...")
    
    if inventory_df.empty:
        logger.warning("⚠️ No inventory data available!")
        return None, None, None
    
    inventory_df['date'] = pd.to_datetime(inventory_df['date'], errors='coerce')
    inventory_df = inventory_df.dropna(subset=['date'])
    
    if not products_df.empty:
        inventory_df = inventory_df.merge(products_df[['sku', 'category', 'typicalshelflifedays']], on='sku', how='left')
    
    inventory_df['discardedqty'] = pd.to_numeric(inventory_df['discardedqty'], errors='coerce').fillna(0)
    inventory_df['haswaste'] = (inventory_df['discardedqty'] > 0).astype(int)
    
    logger.info(f"   Waste rate in data: {inventory_df['haswaste'].mean()*100:.2f}%")
    
    le_sku = LabelEncoder()
    inventory_df['sku_encoded'] = le_sku.fit_transform(inventory_df['sku'].astype(str))
    
    le_category = LabelEncoder()
    if 'category' in inventory_df.columns:
        inventory_df['category'] = inventory_df['category'].fillna('Unknown')
        inventory_df['category_encoded'] = le_category.fit_transform(inventory_df['category'])
    
    inventory_df['dayofweek'] = inventory_df['date'].dt.dayofweek
    inventory_df['month'] = inventory_df['date'].dt.month
    
    numeric_cols = [
        'openingstock', 'closingstock', 'soldqty', 'receivedqty',
        'oldstockshare', 'ageriskratio', 'oldestagedays', 'estimatedoldstockqty'
    ]
    
    for col in numeric_cols:
        if col in inventory_df.columns:
            inventory_df[col] = pd.to_numeric(inventory_df[col], errors='coerce').fillna(0)
    
    feature_cols = ['sku_encoded', 'dayofweek', 'month']
    
    for col in numeric_cols:
        if col in inventory_df.columns:
            feature_cols.append(col)
    
    if 'category_encoded' in inventory_df.columns:
        feature_cols.append('category_encoded')
    
    if 'typicalshelflifedays' in inventory_df.columns:
        inventory_df['typicalshelflifedays'] = pd.to_numeric(inventory_df['typicalshelflifedays'], errors='coerce').fillna(7)
        feature_cols.append('typicalshelflifedays')
    
    X = inventory_df[feature_cols].values
    y = inventory_df['haswaste'].values
    
    logger.info(f"   ✅ Features: {len(feature_cols)}")
    logger.info(f"   ✅ Samples: {len(X):,}")
    logger.info(f"   ✅ Feature list: {feature_cols}")
    
    with open(MODELS_DIR / "waste_feature_cols.pkl", 'wb') as f:
        pickle.dump(feature_cols, f)
    
    return X, y, feature_cols


def train_waste_model(X, y, feature_cols):
    """Train waste risk classification model."""
    logger.info("\n" + "=" * 70)
    logger.info("🚀 TRAINING WASTE RISK MODEL")
    logger.info("=" * 70)
    
    if X is None or y is None:
        logger.warning("⚠️ No data for waste model - skipping")
        return None
    
    waste_rate = y.mean()
    if waste_rate < 0.01:
        logger.warning(f"⚠️ Very low waste rate ({waste_rate*100:.2f}%) - model may be unreliable")
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    logger.info(f"   Training samples: {len(X_train):,}")
    logger.info(f"   Test samples: {len(X_test):,}")
    logger.info(f"   Waste rate (train): {y_train.mean()*100:.2f}%")
    
    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=12,
        min_samples_split=10,
        min_samples_leaf=5,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1,
        verbose=1
    )
    
    logger.info("\n   Training in progress...")
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    
    logger.info(f"\n📈 Model Performance:")
    logger.info(f"   - Accuracy: {accuracy*100:.2f}%")
    logger.info(f"   - Precision: {precision*100:.2f}%")
    logger.info(f"   - Recall: {recall*100:.2f}%")
    logger.info(f"   - F1 Score: {f1*100:.2f}%")
    
    logger.info(f"\n🔍 Top 10 Feature Importance:")
    importance = sorted(zip(feature_cols, model.feature_importances_), key=lambda x: -x[1])
    for feat, imp in importance[:10]:
        logger.info(f"   - {feat}: {imp:.4f}")
    
    model_path = MODELS_DIR / "waste_risk_model.pkl"
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    logger.info(f"\n💾 Model saved to: {model_path}")
    
    metrics = {
        'accuracy': float(accuracy),
        'precision': float(precision),
        'recall': float(recall),
        'f1': float(f1),
        'training_samples': len(X_train),
        'test_samples': len(X_test),
        'trained_at': datetime.now().timestamp()
    }
    with open(MODELS_DIR / "waste_metrics.pkl", 'wb') as f:
        pickle.dump(metrics, f)
    
    return model


def main():
    """Main training pipeline for SmartReplan+ with enhanced multi-year analysis"""
    logger.info("=" * 70)
    logger.info("🎯 SMARTREPLAN+ ENHANCED MODEL TRAINING PIPELINE")
    logger.info("   Multi-Year Weather & External Factors Analysis (2022-2024)")
    logger.info(f"   Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("=" * 70)
    
    if not DATA_DIR.exists():
        logger.error(f"❌ Data directory not found: {DATA_DIR}")
        return
    
    sales_df, inventory_df, products_df, weather_df = load_all_data()
    
    if sales_df.empty and inventory_df.empty:
        logger.error("\n❌ No data found! Check your CSV files.")
        return
    
    demand_model_trained = False
    waste_model_trained = False
    
    # TRAIN DEMAND FORECASTING MODEL
    if not sales_df.empty:
        X, y, feature_cols, le_sku = prepare_demand_features(sales_df, weather_df, products_df)
        if X is not None:
            demand_model = train_demand_model(X, y, feature_cols)
            if demand_model is not None:
                demand_model_trained = True
    else:
        logger.warning("⚠️ Skipping demand model - no sales data")
    
    # TRAIN WASTE RISK MODEL
    if not inventory_df.empty:
        X, y, feature_cols = prepare_waste_features(inventory_df, products_df)
        if X is not None:
            waste_model = train_waste_model(X, y, feature_cols)
            if waste_model is not None:
                waste_model_trained = True
    else:
        logger.warning("⚠️ Skipping waste model - no inventory data")
    
    # SAVE PRODUCT MASTER
    if not products_df.empty:
        products_df.to_csv(MODELS_DIR / "product_master.csv", index=False)
        logger.info(f"\n💾 Product master saved to models/product_master.csv")
    
    # COMPREHENSIVE TRAINING SUMMARY
    logger.info("\n" + "=" * 70)
    logger.info("📋 TRAINING SUMMARY REPORT")
    logger.info("=" * 70)
    
    if not sales_df.empty:
        sales_df['date'] = pd.to_datetime(sales_df['date'], errors='coerce')
        logger.info(f"\n📊 Data Coverage:")
        logger.info(f"   Sales Data:")
        logger.info(f"      - Date Range: {sales_df['date'].min()} to {sales_df['date'].max()}")
        logger.info(f"      - Total Transactions: {len(sales_df):,}")
        logger.info(f"      - Unique Products: {sales_df['sku'].nunique():,}")
        
        if 'year' in sales_df.columns:
            logger.info(f"   Year-wise Breakdown:")
            year_counts = sales_df.groupby('year').size()
            for year, count in year_counts.items():
                logger.info(f"      - {year}: {count:,} transactions")
    
    if not weather_df.empty:
        weather_df['date'] = pd.to_datetime(weather_df['date'], errors='coerce')
        logger.info(f"\n   Weather Data:")
        logger.info(f"      - Date Range: {weather_df['date'].min()} to {weather_df['date'].max()}")
        logger.info(f"      - Total Records: {len(weather_df):,}")
    
    if not products_df.empty:
        logger.info(f"\n   Product Master:")
        logger.info(f"      - Total Products: {len(products_df):,}")
        if 'category' in products_df.columns:
            logger.info(f"      - Categories: {products_df['category'].nunique():,}")
    
    logger.info(f"\n🤖 Models Trained:")
    logger.info(f"   - Demand Forecasting Model: {'✅ Success' if demand_model_trained else '❌ Failed'}")
    logger.info(f"   - Waste Risk Model:         {'✅ Success' if waste_model_trained else '❌ Failed'}")
    
    if demand_model_trained:
        try:
            with open(MODELS_DIR / "demand_metrics.pkl", 'rb') as f:
                metrics = pickle.load(f)
            
            logger.info(f"\n📈 Demand Forecast Model Performance:")
            logger.info(f"   - MAPE: {metrics.get('mape', 0):.2f}%")
            logger.info(f"   - RMSE: {metrics.get('rmse', 0):.2f} units")
            logger.info(f"   - Total Features: {metrics.get('total_features', 0)}")
            logger.info(f"   - Training Samples: {metrics.get('training_samples', 0):,}")
            
            logger.info(f"\n   Feature Category Contributions:")
            logger.info(f"      - Weather Impact:        {metrics.get('weather_importance', 0)*100:.1f}%")
            logger.info(f"      - Cultural Events:       {metrics.get('cultural_importance', 0)*100:.1f}%")
            logger.info(f"      - Monsoon Patterns:      {metrics.get('monsoon_importance', 0)*100:.1f}%")
            logger.info(f"      - Weather Interactions:  {metrics.get('interaction_importance', 0)*100:.1f}%")
            logger.info(f"      - Year/Economic:         {metrics.get('year_importance', 0)*100:.1f}%")
            logger.info(f"      - Historical Patterns:   {metrics.get('lag_importance', 0)*100:.1f}%")
            
            if 'top_features' in metrics:
                logger.info(f"\n   Top Contributing Features:")
                for i, feat in enumerate(metrics['top_features'][:5], 1):
                    logger.info(f"      {i}. {feat}")
        except Exception as e:
            logger.warning(f"   Could not load detailed metrics: {e}")
    
    if waste_model_trained:
        try:
            with open(MODELS_DIR / "waste_metrics.pkl", 'rb') as f:
                metrics = pickle.load(f)
            
            logger.info(f"\n🗑️ Waste Risk Model Performance:")
            logger.info(f"   - Accuracy:  {metrics.get('accuracy', 0)*100:.2f}%")
            logger.info(f"   - Precision: {metrics.get('precision', 0)*100:.2f}%")
            logger.info(f"   - Recall:    {metrics.get('recall', 0)*100:.2f}%")
            logger.info(f"   - F1 Score:  {metrics.get('f1', 0)*100:.2f}%")
        except Exception as e:
            logger.warning(f"   Could not load waste metrics: {e}")
    
    logger.info(f"\n💾 Saved Artifacts:")
    saved_files = [
        "demand_forecast_model.pkl", "demand_metrics.pkl", "demand_feature_cols.pkl",
        "sku_encoder.pkl", "feature_importance.csv",
        "waste_risk_model.pkl", "waste_metrics.pkl", "waste_feature_cols.pkl",
        "product_master.csv"
    ]
    
    for filename in saved_files:
        filepath = MODELS_DIR / filename
        if filepath.exists():
            logger.info(f"   ✅ {filename}")
    
    logger.info("\n" + "=" * 70)
    logger.info("✅ TRAINING COMPLETE!")
    logger.info(f"   Models saved to: {MODELS_DIR}")
    logger.info("=" * 70)
    
    logger.info("\n📋 Next Steps:")
    logger.info("   1. Review feature_importance.csv for detailed feature analysis")
    logger.info("   2. Start the ML API server: python main.py")
    logger.info("   3. The models will be loaded automatically")
    logger.info("   4. Access API docs at http://localhost:8000/docs")
    
    logger.info(f"\n🎉 Training completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("=" * 70)


if __name__ == "__main__":
    main()
