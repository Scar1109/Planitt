"""
Inventory Forecasting ML Service
=================================
FastAPI application serving trained SmartReplan+ models.
"""

import logging
import pickle
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Paths
BASE_DIR = Path(__file__).parent
MODELS_DIR = BASE_DIR / "models"

# Global model store
models = {}

# ============================================
# Pydantic Models
# ============================================

class ForecastRequest(BaseModel):
    product_id: str
    store_id: str
    horizon_days: int = Field(default=7, ge=1, le=90)
    include_weather: bool = True

class ForecastPoint(BaseModel):
    date: str
    forecast: float
    lower_bound: float
    upper_bound: float

class ForecastResponse(BaseModel):
    product_id: str
    store_id: str
    forecasts: List[ForecastPoint]
    model_version: str
    accuracy_metrics: Dict[str, Any]

class InventoryItem(BaseModel):
    sku: str
    store_id: str
    current_stock: int
    days_to_expiry: int
    avg_daily_sales: float = 10.0
    old_stock_share: float = 0.0

class WasteRiskRequest(BaseModel):
    inventory: List[InventoryItem]
    include_recommendations: bool = True

class WasteRiskItem(BaseModel):
    product_id: str
    store_id: str
    risk_score: float
    risk_level: str
    days_to_expiry: int
    current_stock: int
    forecasted_demand: float
    excess_quantity: int
    recommended_action: str
    action_details: Dict[str, Any]
    confidence: float

class WasteRiskResponse(BaseModel):
    predictions: List[WasteRiskItem]
    model_version: str
    total_at_risk_units: int

class HealthResponse(BaseModel):
    status: str
    version: str
    service: str
    models_loaded: bool

# ============================================
# FastAPI Application
# ============================================

app = FastAPI(
    title="SmartReplan+ ML Service",
    description="AI-driven demand forecasting and waste prevention API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Model Loading
# ============================================

def load_models():
    """Load trained models and artifacts into memory."""
    try:
        logger.info("Loading models...")
        
        # Load Demand Model
        with open(MODELS_DIR / "demand_forecast_model.pkl", 'rb') as f:
            models['demand_model'] = pickle.load(f)
            
        with open(MODELS_DIR / "sku_encoder.pkl", 'rb') as f:
            models['sku_encoder'] = pickle.load(f)
            
        with open(MODELS_DIR / "demand_feature_cols.pkl", 'rb') as f:
            models['demand_features'] = pickle.load(f)
            
        with open(MODELS_DIR / "demand_metrics.pkl", 'rb') as f:
            models['demand_metrics'] = pickle.load(f)
            
        # Load Waste Model
        with open(MODELS_DIR / "waste_risk_model.pkl", 'rb') as f:
            models['waste_model'] = pickle.load(f)
            
        with open(MODELS_DIR / "waste_feature_cols.pkl", 'rb') as f:
            models['waste_features'] = pickle.load(f)
            
        with open(MODELS_DIR / "waste_metrics.pkl", 'rb') as f:
            models['waste_metrics'] = pickle.load(f)
            
        # Load Product Master
        if (MODELS_DIR / "product_master.csv").exists():
            models['product_master'] = pd.read_csv(MODELS_DIR / "product_master.csv")
            # Create lookup dict for faster access
            models['product_lookup'] = models['product_master'].set_index('SKU').to_dict('index')
        else:
            models['product_master'] = pd.DataFrame()
            models['product_lookup'] = {}
            
        logger.info("✅ All models loaded successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to load models: {e}")
        return False

@app.on_event("startup")
async def startup_event():
    load_models()

# ============================================
# Helper Functions
# ============================================

def get_product_info(sku: str):
    """Get metadata for a product."""
    return models.get('product_lookup', {}).get(sku, {})

def prepare_forecast_input(product_id: str, date: datetime) -> pd.DataFrame:
    """Create input features for a single prediction point."""
    info = get_product_info(product_id)
    
    # Base features
    data = {
        'DayOfWeek': date.weekday(),
        'DayOfMonth': date.day,
        'Month': date.month,
        'WeekOfYear': date.isocalendar()[1],
        'IsWeekend': 1 if date.weekday() >= 5 else 0,
        'IsMonthEnd': 1 if date.day >= 25 else 0,
        'IsMonthStart': 1 if date.day <= 5 else 0,
        'IsPoyaDay': 1 if 14 <= date.day <= 16 else 0,
        # Default values for missing data
        'PromotionFlag': 0,
        'UnitPriceLKR': info.get('BaseUnitPriceLKR', 0),
        'AvgTemperatureC': 28.0,
        'RainfallMM': 0.0,
        'HumidityPercent': 75.0,
    }
    
    # Handle Encodings
    try:
        data['SKU_Encoded'] = models['sku_encoder'].transform([str(product_id)])[0]
    except:
        # Fallback for unknown SKU (use most common or 0)
        data['SKU_Encoded'] = 0
        
    # Use category encoded if available in model features, but we might miss the encoder
    # Simplified: Set Category_Encoded to 0 if we don't have the encoder loaded separately
    if 'Category_Encoded' in models['demand_features']:
         data['Category_Encoded'] = 0
         
    return pd.DataFrame([data])

# ============================================
# Endpoints
# ============================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    loaded = 'demand_model' in models
    return HealthResponse(
        status="healthy" if loaded else "degraded",
        version="2.0.0",
        service="smartreplan-ml",
        models_loaded=loaded
    )

from motor.motor_asyncio import AsyncIOMotorClient
import os

# ... (Previous imports remain, ensuring we don't duplicate)

# ...

# MongoDB Connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "test"
db_client = None
db = None

# ...

class HistoricalPoint(BaseModel):
    date: str
    actual_sales: int

class ForecastResponse(BaseModel):
    product_id: str
    store_id: str
    forecasts: List[ForecastPoint]
    history: List[HistoricalPoint] = []
    model_version: str
    accuracy_metrics: Dict[str, Any]

# ...

@app.on_event("startup")
async def startup_event():
    global db_client, db
    try:
        db_client = AsyncIOMotorClient(MONGO_URI)
        db = db_client[DB_NAME]
        logger.info(f"✅ Connected to MongoDB: {DB_NAME}")
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
    
    load_models()

@app.on_event("shutdown")
async def shutdown_event():
    if db_client:
        db_client.close()

# ...

@app.post("/api/v1/forecast", response_model=ForecastResponse)
async def generate_forecast(request: ForecastRequest):
    if 'demand_model' not in models:
        raise HTTPException(503, "Models not loaded")
        
    try:
        # 1. Generate Forecasts (Existing Logic)
        forecasts = []
        today = datetime.now().date()
        
        for i in range(request.horizon_days):
            target_date = today + timedelta(days=i+1)
            
            # Prepare input
            input_df = prepare_forecast_input(request.product_id, target_date)
            
            # Align columns
            input_df = input_df.reindex(columns=models['demand_features'], fill_value=0)
            
            # Predict
            pred = models['demand_model'].predict(input_df)[0]
            pred = max(0, pred) # No negative sales
            
            # Calculate bounds (simple heuristic based on RMSE)
            rmse = models['demand_metrics'].get('rmse', 5.0)
            
            forecasts.append(ForecastPoint(
                date=target_date.isoformat(),
                forecast=round(pred, 2),
                lower_bound=max(0, round(pred - 1.96 * rmse, 2)),
                upper_bound=round(pred + 1.96 * rmse, 2)
            ))
            
        # 2. Fetch Historical Sales from MongoDB
        history = []
        if db is not None:
            try:
                # Fetch last 30 days of sales
                start_date = datetime.combine(today - timedelta(days=30), datetime.min.time())
                
                cursor = db.sales.find({
                    "sku": request.product_id,
                    "date": {"$gte": start_date}
                }).sort("date", 1)
                
                async for doc in cursor:
                    history.append(HistoricalPoint(
                        date=doc['date'].date().isoformat() if isinstance(doc['date'], datetime) else str(doc['date'])[:10],
                        actual_sales=int(doc.get('unitsSold', 0))
                    ))
            except Exception as e:
                logger.error(f"Failed to fetch sales history: {e}")
                # Continue without history if DB fails
            
        return ForecastResponse(
            product_id=request.product_id,
            store_id=request.store_id,
            forecasts=forecasts,
            history=history,
            model_version="2.0.0",
            accuracy_metrics=models['demand_metrics']
        )
        
    except Exception as e:
        import traceback
        with open("error_log.txt", "w") as f:
            f.write(traceback.format_exc())
        logger.error(f"Forecast error: {e}")
        raise HTTPException(500, str(e))

@app.post("/api/v1/waste-risk", response_model=WasteRiskResponse)
async def predict_waste_risk(request: WasteRiskRequest):
    if 'waste_model' not in models:
        raise HTTPException(503, "Models not loaded")
        
    try:
        predictions = []
        total_risk = 0
        
        for item in request.inventory:
            info = get_product_info(item.sku)
            
            # Prepare input features
            data = {
                'DayOfWeek': datetime.now().weekday(),
                'Month': datetime.now().month,
                'OpeningStock': item.current_stock,
                'ClosingStock': item.current_stock, # Proxy
                'OldStockShare': item.old_stock_share,
                'ShelfLifeDays': info.get('TypicalShelfLifeDays', 7)
            }
            
            # Add encodings
            try:
                data['SKU_Encoded'] = models['sku_encoder'].transform([str(item.sku)])[0]
            except:
                data['SKU_Encoded'] = 0
            
            # Create DF and predict
            input_df = pd.DataFrame([data])
            input_df = input_df.reindex(columns=models['waste_features'], fill_value=0)
            
            # Predict prob of waste
            # RandomForest returns [prob_no_waste, prob_waste]
            probs = models['waste_model'].predict_proba(input_df)[0]
            risk_score = probs[1] # Probability of waste
            
            # Determine Risk Level
            if risk_score > 0.7:
                level, action = "critical", "emergency_markdown"
                details = {"discount": 50, "reason": "High waste probability"}
            elif risk_score > 0.4:
                level, action = "high", "markdown"
                details = {"discount": 25, "reason": "Moderate waste risk"}
            elif risk_score > 0.2:
                level, action = "medium", "monitor"
                details = {"discount": 0, "reason": "Watch closely"}
            else:
                level, action = "low", "no_action"
                details = {}

            # Calculate excess
            forecast_demand = item.avg_daily_sales * item.days_to_expiry
            excess = max(0, int(item.current_stock - forecast_demand))
            if level in ['critical', 'high']:
                total_risk += excess

            predictions.append(WasteRiskItem(
                product_id=item.sku,
                store_id=item.store_id,
                risk_score=round(float(risk_score), 4),
                risk_level=level,
                days_to_expiry=item.days_to_expiry,
                current_stock=item.current_stock,
                forecasted_demand=round(forecast_demand, 1),
                excess_quantity=excess,
                recommended_action=action,
                action_details=details,
                confidence=0.9
            ))

        return WasteRiskResponse(
            predictions=sorted(predictions, key=lambda x: -x.risk_score),
            model_version="2.0.0",
            total_at_risk_units=total_risk
        )

    except Exception as e:
        logger.error(f"Waste risk error: {e}")
        raise HTTPException(500, str(e))

@app.get("/api/v1/metrics")
async def get_metrics():
    return {
        "forecast_accuracy": models.get('demand_metrics', {}),
        "waste_detection": models.get('waste_metrics', {})
    }

@app.get("/api/v1/products")
async def get_products(limit: int = 3000, category: str = None):
    """Get products from product_master.csv for frontend dropdowns."""
    try:
        if 'product_master' not in models or models['product_master'].empty:
            return {"success": True, "count": 0, "total": 0, "data": []}
        
        df = models['product_master'].copy()
        total_products = len(df)  # Total count before any filtering
        
        # Filter by category if provided
        if category and 'Category' in df.columns:
            df = df[df['Category'] == category]
        
        # Limit results
        df = df.head(limit)
        
        # Format for frontend
        products = []
        for _, row in df.iterrows():
            products.append({
                "sku": row.get('SKU', ''),
                "productName": row.get('ProductName', ''),
                "category": row.get('Category', 'Unknown'),
                "brand": row.get('Brand', ''),
                "shelfLifeDays": row.get('TypicalShelfLifeDays', 7),
            })
        
        return {
            "success": True, 
            "count": len(products),  # Count of returned products
            "total": total_products,  # Total products in database
            "data": products
        }
        
    except Exception as e:
        logger.error(f"Products error: {e}")
        raise HTTPException(500, str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
