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
            # Create lookup dict for faster access (column names are lowercase)
            models['product_lookup'] = models['product_master'].set_index('sku').to_dict('index')
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

# ============================================
# External Factors Integration
# ============================================

import httpx
from functools import lru_cache
from datetime import date

# Cache external factors for 1 hour to avoid repeated API calls
_external_factors_cache = {}
_cache_timestamp = None

async def get_external_factors():
    """Fetch external factors from Node.js backend."""
    global _external_factors_cache, _cache_timestamp
    
    # Check cache (valid for 1 hour)
    now = datetime.now()
    if _cache_timestamp and (now - _cache_timestamp).seconds < 3600 and _external_factors_cache:
        return _external_factors_cache
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://localhost:3000/api/external-factors?days=30")
            if response.status_code == 200:
                _external_factors_cache = response.json()
                _cache_timestamp = now
                logger.info("✅ Fetched external factors from Node.js backend")
                return _external_factors_cache
    except Exception as e:
        logger.warning(f"Could not fetch external factors: {e}")
    
    return None

def get_holiday_multiplier(target_date: date, product_category: str = "general") -> float:
    """Get demand multiplier for a specific date based on holidays/events."""
    
    # Sri Lankan Poya days and major holidays with category-specific impacts
    HOLIDAYS_2025_2026 = {
        # 2025 Poya Days
        "2025-01-13": {"name": "Duruthu Poya", "type": "poya", "impacts": {"dairy": 0.75, "meat": 0.65, "fish": 0.6, "vegetables": 1.4, "fruits": 1.3, "general": 0.95}},
        "2025-02-12": {"name": "Navam Poya", "type": "poya", "impacts": {"dairy": 0.75, "meat": 0.65, "vegetables": 1.4, "general": 0.95}},
        "2025-03-14": {"name": "Medin Poya", "type": "poya", "impacts": {"dairy": 0.75, "meat": 0.65, "vegetables": 1.4, "general": 0.95}},
        "2025-04-12": {"name": "Bak Poya", "type": "poya", "impacts": {"dairy": 0.75, "meat": 0.65, "vegetables": 1.4, "general": 0.95}},
        "2025-05-12": {"name": "Vesak Poya", "type": "poya_major", "impacts": {"dairy": 0.7, "meat": 0.55, "fish": 0.5, "vegetables": 1.6, "fruits": 1.5, "general": 1.2}},
        "2025-06-10": {"name": "Poson Poya", "type": "poya_major", "impacts": {"dairy": 0.7, "meat": 0.6, "vegetables": 1.5, "general": 1.15}},
        # 2025 Major Holidays
        "2025-01-14": {"name": "Thai Pongal", "type": "festival", "impacts": {"rice": 2.0, "milk": 1.8, "jaggery": 2.5, "general": 1.3}},
        "2025-04-13": {"name": "Sinhala Tamil New Year Eve", "type": "new_year", "impacts": {"all": 1.8, "sweets": 2.5, "oil": 2.0, "general": 1.8}},
        "2025-04-14": {"name": "Sinhala Tamil New Year", "type": "new_year", "impacts": {"all": 2.0, "sweets": 3.0, "general": 2.0}},
        "2025-10-20": {"name": "Deepavali", "type": "festival", "impacts": {"oil": 2.0, "sweets": 2.5, "general": 1.35}},
        "2025-12-25": {"name": "Christmas", "type": "christian", "impacts": {"bakery": 2.5, "wine": 2.0, "chicken": 1.8, "general": 1.4}},
        # 2026
        "2026-01-03": {"name": "Duruthu Poya", "type": "poya", "impacts": {"dairy": 0.75, "meat": 0.65, "vegetables": 1.4, "general": 0.95}},
        "2026-01-14": {"name": "Thai Pongal", "type": "festival", "impacts": {"rice": 2.0, "milk": 1.8, "general": 1.3}},
        "2026-02-01": {"name": "Navam Poya", "type": "poya", "impacts": {"dairy": 0.75, "meat": 0.65, "vegetables": 1.4, "general": 0.95}},
        "2026-04-13": {"name": "Sinhala Tamil New Year Eve", "type": "new_year", "impacts": {"all": 1.8, "general": 1.8}},
        "2026-04-14": {"name": "Sinhala Tamil New Year", "type": "new_year", "impacts": {"all": 2.0, "general": 2.0}},
    }
    
    date_str = target_date.isoformat()
    
    # Check if date is a holiday
    if date_str in HOLIDAYS_2025_2026:
        holiday = HOLIDAYS_2025_2026[date_str]
        impacts = holiday["impacts"]
        
        # Get category-specific impact or fall back to general
        multiplier = impacts.get(product_category, impacts.get("general", 1.0))
        return multiplier
    
    # Check for preparation days (day before major events)
    for holiday_date, holiday in HOLIDAYS_2025_2026.items():
        if holiday.get("type") in ["new_year", "festival", "poya_major"]:
            holiday_dt = datetime.strptime(holiday_date, "%Y-%m-%d").date()
            days_until = (holiday_dt - target_date).days
            
            # Preparation period (1-3 days before)
            if 1 <= days_until <= 3:
                prep_multiplier = 1.0 + (0.15 * (4 - days_until))  # Closer = higher
                return prep_multiplier
    
    return 1.0  # No adjustment

def get_monsoon_multiplier(target_date: date) -> float:
    """Get demand multiplier based on monsoon season."""
    month = target_date.month
    
    # Southwest Monsoon (May-Sep) - Rainy in Western/Southern
    if 5 <= month <= 9:
        return 0.92  # Slight decrease due to rain
    
    # Northeast Monsoon (Oct-Jan) - Rainy in North/East
    if month >= 10 or month <= 1:
        return 0.95
    
    # Inter-monsoon (Feb-Apr) - Hot and dry
    return 1.05  # Hot weather boost

def get_weekend_multiplier(target_date: date) -> float:
    """Get multiplier for weekend days."""
    if target_date.weekday() >= 5:  # Saturday or Sunday
        return 1.15  # 15% increase on weekends
    return 1.0

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
        'UnitPriceLKR': info.get('baseunitpricelkr', 0),
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

def get_product_category(product_id: str) -> str:
    """Extract category from product ID or lookup."""
    info = get_product_info(product_id)
    if info.get('category'):
        return info['category'].lower()
    
    # Infer from product ID patterns
    pid_upper = product_id.upper()
    if 'MILK' in pid_upper or 'YOGURT' in pid_upper or 'DAI' in pid_upper:
        return 'dairy'
    if 'MEAT' in pid_upper or 'CHICKEN' in pid_upper or 'BEEF' in pid_upper:
        return 'meat'
    if 'FISH' in pid_upper:
        return 'fish'
    if 'VEG' in pid_upper:
        return 'vegetables'
    if 'FRUIT' in pid_upper or 'FRU' in pid_upper:
        return 'fruits'
    if 'RICE' in pid_upper:
        return 'rice'
    if 'OIL' in pid_upper:
        return 'oil'
    if 'BREAD' in pid_upper or 'BAK' in pid_upper:
        return 'bakery'
    if 'BEV' in pid_upper or 'DRINK' in pid_upper or 'COLA' in pid_upper:
        return 'beverages'
    
    return 'general'


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
        # 1. Generate Forecasts with External Factor Adjustments
        forecasts = []
        today = datetime.now().date()
        
        # Get product category for category-specific adjustments
        product_category = get_product_category(request.product_id)
        logger.info(f"📊 Forecasting {request.product_id} (category: {product_category})")
        
        for i in range(request.horizon_days):
            target_date = today + timedelta(days=i+1)
            
            # Prepare input
            input_df = prepare_forecast_input(request.product_id, target_date)
            
            # Align columns
            input_df = input_df.reindex(columns=models['demand_features'], fill_value=0)
            
            # Predict base demand
            base_pred = models['demand_model'].predict(input_df)[0]
            base_pred = max(0, base_pred)  # No negative sales
            
            # ============================================
            # Apply External Factor Multipliers
            # ============================================
            
            # 1. Holiday/Event multiplier (Poya days, festivals, etc.)
            holiday_mult = get_holiday_multiplier(target_date, product_category)
            
            # 2. Monsoon/Weather season multiplier
            monsoon_mult = get_monsoon_multiplier(target_date)
            
            # 3. Weekend multiplier
            weekend_mult = get_weekend_multiplier(target_date)
            
            # Combine multipliers (compound effect)
            total_multiplier = holiday_mult * monsoon_mult * weekend_mult
            
            # Apply multiplier to base prediction
            adjusted_pred = base_pred * total_multiplier
            
            # Log significant adjustments
            if abs(total_multiplier - 1.0) > 0.05:
                logger.info(f"  📅 {target_date}: {base_pred:.1f} × {total_multiplier:.2f} = {adjusted_pred:.1f} (H:{holiday_mult:.2f}, M:{monsoon_mult:.2f}, W:{weekend_mult:.2f})")
            
            # Calculate bounds (adjusted for multiplier)
            rmse = models['demand_metrics'].get('rmse', 5.0) * total_multiplier
            
            forecasts.append(ForecastPoint(
                date=target_date.isoformat(),
                forecast=round(adjusted_pred, 2),
                lower_bound=max(0, round(adjusted_pred - 1.96 * rmse, 2)),
                upper_bound=round(adjusted_pred + 1.96 * rmse, 2)
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

# ============================================
# Batch Forecast Endpoint
# ============================================

class BatchForecastRequest(BaseModel):
    store_id: str
    product_ids: List[str]
    horizon_days: int = Field(default=14, ge=1, le=90)

class BatchForecastResult(BaseModel):
    product_id: str
    forecasts: List[ForecastPoint]
    error: Optional[str] = None

class BatchForecastResponse(BaseModel):
    store_id: str
    results: List[BatchForecastResult]
    model_version: str
    total_products: int
    successful: int

@app.post("/api/v1/batch-forecast", response_model=BatchForecastResponse)
async def generate_batch_forecast(request: BatchForecastRequest):
    """Generate forecasts for multiple products in a single request."""
    if 'demand_model' not in models:
        raise HTTPException(503, "Models not loaded")
    
    results = []
    successful = 0
    
    for product_id in request.product_ids:
        try:
            today = datetime.now().date()
            product_category = get_product_category(product_id)
            forecasts = []
            
            for i in range(request.horizon_days):
                target_date = today + timedelta(days=i+1)
                
                # Prepare and predict
                input_df = prepare_forecast_input(product_id, target_date)
                input_df = input_df.reindex(columns=models['demand_features'], fill_value=0)
                
                base_pred = models['demand_model'].predict(input_df)[0]
                base_pred = max(0, base_pred)
                
                # Apply external factor multipliers
                holiday_mult = get_holiday_multiplier(target_date, product_category)
                monsoon_mult = get_monsoon_multiplier(target_date)
                weekend_mult = get_weekend_multiplier(target_date)
                total_multiplier = holiday_mult * monsoon_mult * weekend_mult
                
                adjusted_pred = base_pred * total_multiplier
                rmse = models['demand_metrics'].get('rmse', 5.0) * total_multiplier
                
                forecasts.append(ForecastPoint(
                    date=target_date.isoformat(),
                    forecast=round(adjusted_pred, 2),
                    lower_bound=max(0, round(adjusted_pred - 1.96 * rmse, 2)),
                    upper_bound=round(adjusted_pred + 1.96 * rmse, 2)
                ))
            
            results.append(BatchForecastResult(
                product_id=product_id,
                forecasts=forecasts,
                error=None
            ))
            successful += 1
            
        except Exception as e:
            logger.error(f"Batch forecast error for {product_id}: {e}")
            results.append(BatchForecastResult(
                product_id=product_id,
                forecasts=[],
                error=str(e)
            ))
    
    return BatchForecastResponse(
        store_id=request.store_id,
        results=results,
        model_version="2.0.0",
        total_products=len(request.product_ids),
        successful=successful
    )


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
                'ShelfLifeDays': info.get('typicalshelflifedays', 7)
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
        if category and 'category' in df.columns:
            df = df[df['category'] == category]
        
        # Limit results
        df = df.head(limit)
        
               # Format for frontend
        products = []
        for _, row in df.iterrows():
            products.append({
                "sku": row.get('sku', ''),
                "productName": row.get('productname', ''),
                "category": row.get('category', 'Unknown'),
                "brand": row.get('brand', ''),
                "shelfLifeDays": row.get('typicalshelflifedays', 7),
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
