"""
SmartReplan+ Model Training Script
===================================
Trains AI models for demand forecasting and waste risk prediction.

Your CSV Structure:
- Sales_{year}.csv: Date, SKU, UnitsSold, UnitPriceLKR, PromotionFlag, PromotionType, StockoutFlag
- Inventory_Snapshot_{year}.csv: Date, SKU, OpeningStock, ReceivedQty, SoldQty, DiscardedQty, ClosingStock, 
                                  OrderPlacedQty, SupplierLeadTimeDays, OldestReceiptDate, NewestReceiptDate,
                                  EstimatedOldStockQty, OldestAgeDays, OldStockShare, AgeRiskRatio
- Product_Master_{year}.csv: SKU, Barcode, ProductName, Category, Brand, UnitMeasure, ShelfLifeDays, 
                              Supplier, CaseSize, MaxShelfCapacityUnits
- Weather_Ambalangoda_{year}.csv: Date, AvgTemperatureC, RainfallMM, Condition, HumidityPercent

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
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier
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
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"

# Create models directory
MODELS_DIR.mkdir(exist_ok=True)


def load_all_data():
    """
    Load and combine all CSV data from 2022, 2023, 2024 folders.
    """
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
            df['Year'] = int(year)
            all_sales.append(df)
            logger.info(f"   ✅ Sales_{year}.csv: {len(df):,} rows")
        
        # Inventory data
        inv_file = year_path / f"Inventory_Snapshot_{year}.csv"
        if inv_file.exists():
            df = pd.read_csv(inv_file)
            df['Year'] = int(year)
            all_inventory.append(df)
            logger.info(f"   ✅ Inventory_Snapshot_{year}.csv: {len(df):,} rows")
        
        # Product master
        prod_file = year_path / f"Product_Master_{year}.csv"
        if prod_file.exists():
            df = pd.read_csv(prod_file)
            all_products.append(df)
            logger.info(f"   ✅ Product_Master_{year}.csv: {len(df):,} rows")
        
        # Weather data
        weather_file = year_path / f"Weather_Ambalangoda_{year}.csv"
        if weather_file.exists():
            df = pd.read_csv(weather_file)
            all_weather.append(df)
            logger.info(f"   ✅ Weather_Ambalangoda_{year}.csv: {len(df):,} rows")
    
    # Combine all data
    sales_df = pd.concat(all_sales, ignore_index=True) if all_sales else pd.DataFrame()
    inventory_df = pd.concat(all_inventory, ignore_index=True) if all_inventory else pd.DataFrame()
    products_df = pd.concat(all_products, ignore_index=True).drop_duplicates(subset=['SKU']) if all_products else pd.DataFrame()
    weather_df = pd.concat(all_weather, ignore_index=True).drop_duplicates(subset=['Date']) if all_weather else pd.DataFrame()
    
    logger.info(f"\n📊 Data Summary:")
    logger.info(f"   - Total Sales records: {len(sales_df):,}")
    logger.info(f"   - Total Inventory records: {len(inventory_df):,}")
    logger.info(f"   - Unique Products: {len(products_df):,}")
    logger.info(f"   - Weather records: {len(weather_df):,}")
    
    return sales_df, inventory_df, products_df, weather_df


def prepare_demand_features(sales_df, weather_df, products_df):
    """
    Prepare features for demand forecasting using your actual columns.
    """
    logger.info("\n🔧 Preparing Demand Forecasting Features...")
    
    if sales_df.empty:
        logger.error("❌ No sales data available!")
        return None, None, None, None
    
    # Parse dates
    sales_df['Date'] = pd.to_datetime(sales_df['Date'], errors='coerce')
    sales_df = sales_df.dropna(subset=['Date'])
    
    # Merge with weather data
    if not weather_df.empty:
        weather_df['Date'] = pd.to_datetime(weather_df['Date'], errors='coerce')
        sales_df = sales_df.merge(weather_df, on='Date', how='left')
        logger.info("   ✅ Merged weather data")
    
    # Merge with product data for category info
    if not products_df.empty:
        sales_df = sales_df.merge(products_df[['SKU', 'Category', 'TypicalShelfLifeDays']], on='SKU', how='left')
        logger.info("   ✅ Merged product data")
    
    # Time-based features
    sales_df['DayOfWeek'] = sales_df['Date'].dt.dayofweek
    sales_df['DayOfMonth'] = sales_df['Date'].dt.day
    sales_df['Month'] = sales_df['Date'].dt.month
    sales_df['WeekOfYear'] = sales_df['Date'].dt.isocalendar().week.astype(int)
    sales_df['IsWeekend'] = (sales_df['DayOfWeek'] >= 5).astype(int)
    sales_df['IsMonthEnd'] = (sales_df['DayOfMonth'] >= 25).astype(int)
    sales_df['IsMonthStart'] = (sales_df['DayOfMonth'] <= 5).astype(int)
    
    # Sri Lankan calendar effects (Poya days are roughly monthly)
    sales_df['IsPoyaDay'] = ((sales_df['DayOfMonth'] >= 14) & (sales_df['DayOfMonth'] <= 16)).astype(int)
    
    # Encode SKU
    le_sku = LabelEncoder()
    sales_df['SKU_Encoded'] = le_sku.fit_transform(sales_df['SKU'].astype(str))
    
    # Encode Category if available
    le_category = LabelEncoder()
    if 'Category' in sales_df.columns:
        sales_df['Category'] = sales_df['Category'].fillna('Unknown')
        sales_df['Category_Encoded'] = le_category.fit_transform(sales_df['Category'])
    
    # Feature columns
    feature_cols = [
        'SKU_Encoded', 'DayOfWeek', 'DayOfMonth', 'Month', 'WeekOfYear',
        'IsWeekend', 'IsMonthEnd', 'IsMonthStart', 'IsPoyaDay'
    ]
    
    # Add promotion features
    if 'PromotionFlag' in sales_df.columns:
        sales_df['PromotionFlag'] = pd.to_numeric(sales_df['PromotionFlag'], errors='coerce').fillna(0)
        feature_cols.append('PromotionFlag')
    
    # Add price feature
    if 'UnitPriceLKR' in sales_df.columns:
        sales_df['UnitPriceLKR'] = pd.to_numeric(sales_df['UnitPriceLKR'], errors='coerce').fillna(0)
        feature_cols.append('UnitPriceLKR')
    
    # Add weather features
    if 'AvgTemperatureC' in sales_df.columns:
        sales_df['AvgTemperatureC'] = pd.to_numeric(sales_df['AvgTemperatureC'], errors='coerce').fillna(28)
        feature_cols.append('AvgTemperatureC')
    
    if 'RainfallMM' in sales_df.columns:
        sales_df['RainfallMM'] = pd.to_numeric(sales_df['RainfallMM'], errors='coerce').fillna(0)
        feature_cols.append('RainfallMM')
    
    if 'HumidityPercent' in sales_df.columns:
        sales_df['HumidityPercent'] = pd.to_numeric(sales_df['HumidityPercent'], errors='coerce').fillna(75)
        feature_cols.append('HumidityPercent')
    
    # Add category feature
    if 'Category_Encoded' in sales_df.columns:
        feature_cols.append('Category_Encoded')
    
    # Target variable
    sales_df['UnitsSold'] = pd.to_numeric(sales_df['UnitsSold'], errors='coerce').fillna(0)
    
    X = sales_df[feature_cols].values
    y = sales_df['UnitsSold'].values
    
    logger.info(f"   ✅ Features: {len(feature_cols)}")
    logger.info(f"   ✅ Samples: {len(X):,}")
    logger.info(f"   ✅ Feature list: {feature_cols}")
    
    # Save SKU encoder for inference
    with open(MODELS_DIR / "sku_encoder.pkl", 'wb') as f:
        pickle.dump(le_sku, f)
    
    # Save feature columns for inference
    with open(MODELS_DIR / "demand_feature_cols.pkl", 'wb') as f:
        pickle.dump(feature_cols, f)
    
    return X, y, feature_cols, le_sku


def train_demand_model(X, y, feature_cols):
    """
    Train demand forecasting model using Gradient Boosting.
    """
    logger.info("\n" + "=" * 70)
    logger.info("🚀 TRAINING DEMAND FORECASTING MODEL")
    logger.info("=" * 70)
    
    if X is None or y is None:
        logger.error("❌ No data to train!")
        return None
    
    # Split data (keeping temporal order approximation)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    logger.info(f"   Training samples: {len(X_train):,}")
    logger.info(f"   Test samples: {len(X_test):,}")
    
    # Train model
    model = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=8,
        learning_rate=0.1,
        min_samples_split=20,
        min_samples_leaf=10,
        subsample=0.8,
        random_state=42,
        verbose=1
    )
    
    logger.info("\n   Training in progress (this may take a few minutes)...")
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    
    # Use Symmetric MAPE (sMAPE) which is more robust for values near zero
    # sMAPE = 200 * |y_true - y_pred| / (|y_true| + |y_pred|)
    # Range is 0-200, we normalize to 0-100
    numerator = np.abs(y_test - y_pred)
    denominator = np.abs(y_test) + np.abs(y_pred) + 1e-8  # Avoid division by zero
    smape = 100 * np.mean(2 * numerator / denominator)
    
    # Also calculate traditional MAPE for reference, but capped
    mask = y_test > 1  # Only consider meaningful values
    if mask.sum() > 0:
        mape = min(100, np.mean(np.abs((y_test[mask] - y_pred[mask]) / y_test[mask])) * 100)
    else:
        mape = smape  # Fall back to sMAPE
    
    logger.info(f"\n📈 Model Performance:")
    logger.info(f"   - MAE: {mae:.2f} units")
    logger.info(f"   - RMSE: {rmse:.2f} units")
    logger.info(f"   - MAPE: {mape:.2f}%")
    logger.info(f"   - sMAPE: {smape:.2f}%")
    
    # Feature importance
    logger.info(f"\n🔍 Top 10 Feature Importance:")
    importance = sorted(zip(feature_cols, model.feature_importances_), key=lambda x: -x[1])
    for feat, imp in importance[:10]:
        logger.info(f"   - {feat}: {imp:.4f}")
    
    # Save model
    model_path = MODELS_DIR / "demand_forecast_model.pkl"
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    logger.info(f"\n💾 Model saved to: {model_path}")
    
    # Save metrics - use capped MAPE for display
    metrics = {
        'mae': float(mae),
        'rmse': float(rmse),
        'mape': float(mape),  # Capped to max 100
        'smape': float(smape),
        'training_samples': len(X_train),
        'test_samples': len(X_test),
        'total_samples': len(X_train) + len(X_test),
        'trained_at': datetime.now().isoformat()
    }
    with open(MODELS_DIR / "demand_metrics.pkl", 'wb') as f:
        pickle.dump(metrics, f)
    
    return model


def prepare_waste_features(inventory_df, products_df):
    """
    Prepare features for waste risk prediction using your actual columns.
    """
    logger.info("\n🔧 Preparing Waste Risk Features...")
    
    if inventory_df.empty:
        logger.warning("⚠️ No inventory data available!")
        return None, None, None
    
    # Parse dates
    inventory_df['Date'] = pd.to_datetime(inventory_df['Date'], errors='coerce')
    inventory_df = inventory_df.dropna(subset=['Date'])
    
    # Merge with product data for shelf life
    if not products_df.empty:
        inventory_df = inventory_df.merge(products_df[['SKU', 'Category', 'TypicalShelfLifeDays']], on='SKU', how='left')
    
    # Create target variable: Has waste (DiscardedQty > 0)
    inventory_df['DiscardedQty'] = pd.to_numeric(inventory_df['DiscardedQty'], errors='coerce').fillna(0)
    inventory_df['HasWaste'] = (inventory_df['DiscardedQty'] > 0).astype(int)
    
    logger.info(f"   Waste rate in data: {inventory_df['HasWaste'].mean()*100:.2f}%")
    
    # Encode SKU
    le_sku = LabelEncoder()
    inventory_df['SKU_Encoded'] = le_sku.fit_transform(inventory_df['SKU'].astype(str))
    
    # Encode Category
    le_category = LabelEncoder()
    if 'Category' in inventory_df.columns:
        inventory_df['Category'] = inventory_df['Category'].fillna('Unknown')
        inventory_df['Category_Encoded'] = le_category.fit_transform(inventory_df['Category'])
    
    # Time features
    inventory_df['DayOfWeek'] = inventory_df['Date'].dt.dayofweek
    inventory_df['Month'] = inventory_df['Date'].dt.month
    
    # Numeric features from your columns
    numeric_cols = [
        'OpeningStock', 'ClosingStock', 'SoldQty', 'ReceivedQty',
        'OldStockShare', 'AgeRiskRatio', 'OldestAgeDays', 'EstimatedOldStockQty'
    ]
    
    for col in numeric_cols:
        if col in inventory_df.columns:
            inventory_df[col] = pd.to_numeric(inventory_df[col], errors='coerce').fillna(0)
    
    # Build feature list
    feature_cols = ['SKU_Encoded', 'DayOfWeek', 'Month']
    
    for col in numeric_cols:
        if col in inventory_df.columns:
            feature_cols.append(col)
    
    if 'Category_Encoded' in inventory_df.columns:
        feature_cols.append('Category_Encoded')
    
    if 'TypicalShelfLifeDays' in inventory_df.columns:
        inventory_df['TypicalShelfLifeDays'] = pd.to_numeric(inventory_df['TypicalShelfLifeDays'], errors='coerce').fillna(7)
        feature_cols.append('TypicalShelfLifeDays')
    
    X = inventory_df[feature_cols].values
    y = inventory_df['HasWaste'].values
    
    logger.info(f"   ✅ Features: {len(feature_cols)}")
    logger.info(f"   ✅ Samples: {len(X):,}")
    logger.info(f"   ✅ Feature list: {feature_cols}")
    
    # Save feature columns
    with open(MODELS_DIR / "waste_feature_cols.pkl", 'wb') as f:
        pickle.dump(feature_cols, f)
    
    return X, y, feature_cols


def train_waste_model(X, y, feature_cols):
    """
    Train waste risk classification model.
    """
    logger.info("\n" + "=" * 70)
    logger.info("🚀 TRAINING WASTE RISK MODEL")
    logger.info("=" * 70)
    
    if X is None or y is None:
        logger.warning("⚠️ No data for waste model - skipping")
        return None
    
    # Handle class imbalance
    waste_rate = y.mean()
    if waste_rate < 0.01:
        logger.warning(f"⚠️ Very low waste rate ({waste_rate*100:.2f}%) - model may be unreliable")
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    logger.info(f"   Training samples: {len(X_train):,}")
    logger.info(f"   Test samples: {len(X_test):,}")
    logger.info(f"   Waste rate (train): {y_train.mean()*100:.2f}%")
    
    # Train model with class weighting
    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=12,
        min_samples_split=10,
        min_samples_leaf=5,
        class_weight='balanced',  # Handle imbalanced classes
        random_state=42,
        n_jobs=-1,
        verbose=1
    )
    
    logger.info("\n   Training in progress...")
    model.fit(X_train, y_train)
    
    # Evaluate
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
    
    # Feature importance
    logger.info(f"\n🔍 Top 10 Feature Importance:")
    importance = sorted(zip(feature_cols, model.feature_importances_), key=lambda x: -x[1])
    for feat, imp in importance[:10]:
        logger.info(f"   - {feat}: {imp:.4f}")
    
    # Save model
    model_path = MODELS_DIR / "waste_risk_model.pkl"
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    logger.info(f"\n💾 Model saved to: {model_path}")
    
    # Save metrics
    metrics = {
        'accuracy': float(accuracy),
        'precision': float(precision),
        'recall': float(recall),
        'f1': float(f1),
        'training_samples': len(X_train),
        'test_samples': len(X_test),
        'trained_at': datetime.now().timestamp()  # Unix timestamp (float)
    }
    with open(MODELS_DIR / "waste_metrics.pkl", 'wb') as f:
        pickle.dump(metrics, f)
    
    return model


def main():
    """Main training pipeline for SmartReplan+"""
    logger.info("=" * 70)
    logger.info("🎯 SMARTREPLAN+ MODEL TRAINING PIPELINE")
    logger.info(f"   Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("=" * 70)
    
    # Check data directory
    if not DATA_DIR.exists():
        logger.error(f"❌ Data directory not found: {DATA_DIR}")
        return
    
    # Load all data
    sales_df, inventory_df, products_df, weather_df = load_all_data()
    
    if sales_df.empty and inventory_df.empty:
        logger.error("\n❌ No data found! Check your CSV files.")
        return
    
    # =====================================================
    # TRAIN DEMAND FORECASTING MODEL
    # =====================================================
    if not sales_df.empty:
        X, y, feature_cols, le_sku = prepare_demand_features(sales_df, weather_df, products_df)
        if X is not None:
            train_demand_model(X, y, feature_cols)
    else:
        logger.warning("⚠️ Skipping demand model - no sales data")
    
    # =====================================================
    # TRAIN WASTE RISK MODEL
    # =====================================================
    if not inventory_df.empty:
        X, y, feature_cols = prepare_waste_features(inventory_df, products_df)
        if X is not None:
            train_waste_model(X, y, feature_cols)
    else:
        logger.warning("⚠️ Skipping waste model - no inventory data")
    
    # =====================================================
    # SAVE PRODUCT MASTER FOR API USE
    # =====================================================
    if not products_df.empty:
        products_df.to_csv(MODELS_DIR / "product_master.csv", index=False)
        logger.info(f"\n💾 Product master saved to models/product_master.csv")
    
    logger.info("\n" + "=" * 70)
    logger.info("✅ TRAINING COMPLETE!")
    logger.info(f"   Models saved to: {MODELS_DIR}")
    logger.info("=" * 70)
    logger.info("\n📋 Next Steps:")
    logger.info("   1. Start the ML API server: python main.py")
    logger.info("   2. The models will be loaded automatically")
    logger.info("   3. Access API docs at http://localhost:8000/docs")


if __name__ == "__main__":
    main()
