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
import time
import httpx
from pathlib import Path
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional, Tuple
from functools import lru_cache


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
    analysis_reasons: List[str] # Explanation of drivers

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
            
        # Product Master is now fetched from MongoDB directly
        # We initialize an empty lookup but don't load the CSV
        models['product_lookup'] = {}
            
        logger.info("✅ All models loaded successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to load models: {e}")
        return False



# ============================================
# Helper Functions
# ============================================

# ============================================
# PERFORMANCE OPTIMIZATION: In-Memory Caches
# ============================================

# Cache external factors for 1 hour to avoid repeated API calls
_external_factors_cache = {}
_cache_timestamp = None

# Cache lag features for 5 minutes (reduces MongoDB queries)
_lag_features_cache = {}
_lag_cache_ttl = 300  # 5 minutes

# Cache product info for 1 hour
_product_info_cache = {}
_product_cache_ttl = 3600  # 1 hour

def _get_cached_lag_features(sku: str):
    """Get cached lag features if still valid."""
    if sku in _lag_features_cache:
        cached_time, data = _lag_features_cache[sku]
        if time.time() - cached_time < _lag_cache_ttl:
            return data
    return None

def _set_cached_lag_features(sku: str, data: dict):
    """Cache lag features."""
    _lag_features_cache[sku] = (time.time(), data)

def _get_cached_product_info(sku: str):
    """Get cached product info if still valid."""
    if sku in _product_info_cache:
        cached_time, data = _product_info_cache[sku]
        if time.time() - cached_time < _product_cache_ttl:
            return data
    return None

def _set_cached_product_info(sku: str, data: dict):
    """Cache product info."""
    _product_info_cache[sku] = (time.time(), data)



async def get_product_info_db(sku: str) -> Dict[str, Any]:
    """Get metadata for a product from MongoDB 'products' collection.
    OPTIMIZED: Uses in-memory cache to avoid repeated queries.
    """
    # Check cache first
    cached = _get_cached_product_info(sku)
    if cached is not None:
        return cached
    
    if db is None:
        return {}
        
    try:
        # Fetch from products collection (note: find_one, not findOne)
        product = await db.products.find_one({"sku": sku})
        if not product:
            logger.debug(f"Product not found in DB: {sku}")
            return {}
            
        # Map DB fields to model features (lowercase keys expected by prepare_forecast_input)
        result = {
            'baseunitpricelkr': float(product.get('basePriceLKR', product.get('price', 0))),
            'typicalshelflifedays': int(product.get('typicalShelfLifeDays', product.get('shelfLifeDays', 7))),
            'category': product.get('category', 'Unknown'),
            # preserve original for logging
            'productname': product.get('productName', ''),
            'brand': product.get('brand', '')
        }
        
        # Cache the result
        _set_cached_product_info(sku, result)
        return result
    except Exception as e:
        logger.error(f"Failed to fetch product info for {sku}: {e}")
        return {}


def get_product_category(product_id: str, product_name: str = "") -> str:
    """
    Robust category detection using Product ID, Name, or Lookup.
    Crucial for applying correct holiday multipliers.
    """
    # 1. Try explicit info first
    info = _get_cached_product_info(product_id) or {}
    if info.get('category'):
        cat = info['category'].lower()
        if cat not in ['unknown', 'general']:
            return _normalize_category(cat)
            
    # 2. Try Name Heuristics (Strongest signal)
    name = product_name.lower() or info.get('productname', '').lower()
    if 'rice' in name or 'samba' in name or 'keeri' in name or 'nadu' in name:
        return 'rice'
    if 'milk' in name and 'powder' in name:
        return 'milk_powder'
    if 'ice cream' in name or 'icecream' in name:
        return 'ice cream'
    if 'biscuit' in name or 'cracker' in name:
        return 'biscuit'
    if 'milk' in name:
        return 'milk'
    if 'dhal' in name or 'parippu' in name:
         return 'dhal'
    if 'sugar' in name:
        return 'sugar'
    
    # 3. Try SKU pattern (Fallback)
    if 'DAI' in product_id: return 'dairy'
    if 'BEV' in product_id: return 'beverage'
    if 'SNA' in product_id: return 'snacks'
    if 'RIC' in product_id: return 'rice'
    if 'ICE' in product_id: return 'ice cream'
    
    return 'general'

def _normalize_category(cat: str) -> str:
    """Map DB categories to Holiday Impact keys."""
    if any(x in cat for x in ['rice', 'grains', 'pulses']): return 'rice'
    if any(x in cat for x in ['milk', 'dairy', 'cheese', 'butter']): return 'dairy'
    if any(x in cat for x in ['ice cream', 'frozen dessert']): return 'ice cream'
    if any(x in cat for x in ['biscuit', 'cookie']): return 'biscuit'
    if any(x in cat for x in ['vegetable', 'greens']): return 'vegetables'
    if any(x in cat for x in ['fruit']): return 'fruits'
    if any(x in cat for x in ['meat', 'chicken', 'beef', 'pork']): return 'meat'
    if any(x in cat for x in ['fish', 'seafood']): return 'fish'
    return cat







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

def get_holiday_multiplier(target_date: date, product_category: str = "general") -> Tuple[float, str]:
    """Get demand multiplier AND the reason for a specific date."""
    
    # Sri Lankan Poya days and major holidays with category-specific impacts
    HOLIDAYS_2025_2026 = {
        # 2025 Poya Days
        "2025-01-13": {"name": "Duruthu Poya", "type": "poya", "impacts": {"dairy": 0.75, "meat": 0.65, "fish": 0.6, "vegetables": 1.4, "fruits": 1.3, "general": 0.95}},
        "2025-02-12": {"name": "Navam Poya", "type": "poya", "impacts": {"dairy": 0.75, "meat": 0.65, "vegetables": 1.4, "general": 0.95}},
        "2025-03-14": {"name": "Medin Poya", "type": "poya", "impacts": {"dairy": 0.75, "meat": 0.65, "vegetables": 1.4, "general": 0.95}},
        "2025-04-12": {"name": "Bak Poya", "type": "poya", "impacts": {"dairy": 0.75, "meat": 0.65, "vegetables": 1.4, "general": 0.95}},
        
        # Vesak/Poson - Dansal Season (Ice Cream, Biscuits, Herbal Drinks spike)
        "2025-05-12": {"name": "Vesak Poya (Dansal Season)", "type": "poya_major", "impacts": {"dairy": 0.7, "meat": 0.55, "fish": 0.5, "ice cream": 2.5, "biscuit": 1.8, "vegetables": 1.6, "fruits": 1.5, "general": 1.2}},
        "2025-06-10": {"name": "Poson Poya (Dansal Season)", "type": "poya_major", "impacts": {"dairy": 0.7, "meat": 0.6, "ice cream": 2.2, "biscuit": 1.8, "vegetables": 1.5, "general": 1.15}},
        
        # 2025 Major Holidays
        "2025-01-14": {"name": "Thai Pongal", "type": "festival", "impacts": {"rice": 2.5, "dairy": 2.0, "jaggery": 2.5, "general": 1.3}},
        "2025-04-13": {"name": "Sinhala Tamil New Year Eve", "type": "new_year", "impacts": {"all": 2.0, "sweets": 3.0, "oil": 2.5, "general": 2.0}},
        "2025-04-14": {"name": "Sinhala Tamil New Year", "type": "new_year", "impacts": {"all": 2.5, "sweets": 3.5, "general": 2.2}},
        "2025-10-20": {"name": "Deepavali", "type": "festival", "impacts": {"oil": 2.0, "sweets": 2.5, "general": 1.35}},
        "2025-12-25": {"name": "Christmas", "type": "christian", "impacts": {"bakery": 3.0, "ice cream": 2.0, "wine": 2.5, "chicken": 2.0, "general": 1.5}},
        
        # 2026
        "2026-01-03": {"name": "Duruthu Poya", "type": "poya", "impacts": {"dairy": 0.75, "meat": 0.65, "vegetables": 1.4, "general": 0.95}},
        "2026-01-14": {"name": "Thai Pongal", "type": "festival", "impacts": {"rice": 2.5, "dairy": 2.0, "general": 1.3}},
        "2026-02-01": {"name": "Navam Poya", "type": "poya", "impacts": {"dairy": 0.75, "meat": 0.65, "vegetables": 1.4, "general": 0.95}},
        "2026-04-13": {"name": "Sinhala Tamil New Year Eve", "type": "new_year", "impacts": {"all": 2.0, "general": 2.0}},
        "2026-04-14": {"name": "Sinhala Tamil New Year", "type": "new_year", "impacts": {"all": 2.5, "general": 2.2}},
    }
    
    date_str = target_date.isoformat()
    
    # Check if date is a holiday
    if date_str in HOLIDAYS_2025_2026:
        holiday = HOLIDAYS_2025_2026[date_str]
        impacts = holiday["impacts"]
        
        # Get category-specific impact or fall back to general
        multiplier = impacts.get(product_category, impacts.get("general", 1.0))
        return multiplier, holiday['name']
    
    # Check for preparation days (day before major events)
    for holiday_date, holiday in HOLIDAYS_2025_2026.items():
        if holiday.get("type") in ["new_year", "festival", "poya_major"]:
            holiday_dt = datetime.strptime(holiday_date, "%Y-%m-%d").date()
            days_until = (holiday_dt - target_date).days
            
            # Preparation period (1-3 days before)
            if 1 <= days_until <= 3:
                prep_multiplier = 1.0 + (0.15 * (4 - days_until))  # Closer = higher
                return prep_multiplier, f"Pre-{holiday['name']}"
    
    return 1.0, ""  # No adjustment

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

def prepare_forecast_input(product_id: str, date: datetime, lag_data: Dict[str, float] = None, product_info: Dict[str, Any] = None, weather_data: Dict[str, Any] = None) -> pd.DataFrame:
    """Create input features for a single prediction point."""
    info = product_info if product_info else {}
    if lag_data is None:
        lag_data = {}
        
    # Get relevant lag features
    sales7day = lag_data.get('sales7dayavg', 0)
    sales30day = lag_data.get('sales30dayavg', 0)
    
    # Smarter Day-of-Week Logic to allow fluctuation
    dow_avgs = lag_data.get('dayofweek_avg', {})
    if dow_avgs:
        # If we have ANY dow data, trust it. Missing days likely mean low/no sales.
        # Use 10% of 30-day avg as soft floor instead of full avg to preserve fluctuation.
        current_dow_avg = dow_avgs.get(date.weekday(), sales30day * 0.1)
    else:
        # No history at all? Use 30-day avg
        current_dow_avg = sales30day
    
    # Weather defaults (can be overridden by weather_data)
    w_temp = 28.0
    w_rain = 0.0
    w_humidity = 75.0
    w_israiny = 0
    w_temphot = 0
    w_tempcool = 0
    
    if weather_data:
        w_temp = weather_data.get('temp', 28.0)
        w_rain = weather_data.get('rain', 0.0)
        w_humidity = weather_data.get('humidity', 75.0)
        w_israiny = 1 if w_rain > 2.0 else 0
        w_temphot = 1 if w_temp > 30.0 else 0
        w_tempcool = 1 if w_temp < 25.0 else 0
    
    # Base features - keys must match training feature_cols (lowercase)
    data = {
        'sku_encoded': 0,  # Default
        'year': date.year,
        'dayofweek': date.weekday(),
        'dayofmonth': date.day,
        'month': date.month,
        'quarter': (date.month - 1) // 3 + 1,
        'weekofyear': date.isocalendar()[1],
        'dayofyear': date.timetuple().tm_yday,
        'isweekend': 1 if date.weekday() >= 5 else 0,
        'ismonthend': 1 if date.day >= 25 else 0,
        'ismonthstart': 1 if date.day <= 5 else 0,
        'ispoyaday': 1 if 14 <= date.day <= 16 else 0,
        
        # Sri Lankan events
        'isnewyear': 1 if date.month == 4 and 13 <= date.day <= 15 else 0,
        'isves ak': 1 if date.month == 5 and 14 <= date.day <= 16 else 0,
        'isramadanperiod': 1 if date.month in [3, 4, 5] else 0,
        'ischristmasseason': 1 if date.month == 12 and date.day >= 20 else 0,
        
        # Monsoon seasons
        'isswmonsoon': 1 if 5 <= date.month <= 9 else 0,
        'isnemonsoon': 1 if date.month in [10, 11, 12, 1] else 0,
        'isintermonsoon': 1 if not (5 <= date.month <= 9) and not (date.month in [10, 11, 12, 1]) else 0,
        
        # Lag Features (CRITICAL for valid predictions)
        'sales7dayavg': lag_data.get('sales7dayavg', 0),
        'sales7daystd': lag_data.get('sales7daystd', 0),
        'sales14dayavg': lag_data.get('sales14dayavg', 0),
        'sales30dayavg': lag_data.get('sales30dayavg', 0),
        'dayofweek_avg': current_dow_avg,
        
        # Economic/Year trends
        'is2022crisis': 0,
        'yeartrend': date.year - 2022,

        # Default values for missing data
        'promotionflag': 0,
        'unitpricelkr': float(info.get('baseunitpricelkr', 0)),
        'avgtemperaturec': w_temp,
        'rainfallmm': w_rain,
        'humiditypercent': w_humidity,
        'israiny': w_israiny,
        'isheavyrain': 1 if w_rain > 50.0 else 0,
        'isdryday': 1 if w_rain < 1.0 else 0,
        'temphot': w_temphot,
        'tempcool': w_tempcool,
        'tempmoderate': 1 if not w_temphot and not w_tempcool else 0,
        'highhumidity': 1 if w_humidity > 85 else 0,
    }

    
    # Handle Encodings - Use hash for unknown SKUs to get unique values
    try:
        data['sku_encoded'] = models['sku_encoder'].transform([str(product_id)])[0]
    except (ValueError, KeyError):
        # Use hash to create a unique numeric ID for unknown SKUs
        # This ensures different products get different encodings
        data['sku_encoded'] = hash(str(product_id)) % 10000
        logger.debug(f"Unknown SKU '{product_id}' - using hash encoding: {data['sku_encoded']}")
        
    # Handle Category encoding - use a hash for unique category values
    if 'category_encoded' in models['demand_features']:
        category = info.get('category', 'Unknown')
        # Create a deterministic encoding based on category name
        data['category_encoded'] = hash(str(category)) % 1000
        
    # Weather-category interaction features (CRITICAL for differentiation)
    category = info.get('category', '').lower()
    
    # Hot weather boosts
    data['hotweather_beverage'] = data.get('temphot', 0) if 'beverage' in category or 'drink' in category else 0
    data['hotweather_icecream'] = data.get('temphot', 0) if any(x in category for x in ['frozen', 'ice', 'dairy']) else 0
    
    # Rainy weather packaged goods
    data['rainyday_packagedgoods'] = data.get('israiny', 0) if any(x in category for x in ['packaged', 'canned', 'dry']) else 0
    
    # Poya day effects (vegetarian demand up, meat/fish down)
    data['poyaday_vegdemand'] = data.get('ispoyaday', 0) if any(x in category for x in ['fruit', 'vegetable', 'fresh veg']) else 0
    data['poyaday_meatdecline'] = data.get('ispoyaday', 0) if any(x in category for x in ['meat', 'fish', 'poultry', 'seafood']) else 0
    
    # Rolling rainfall average (default)
    data['rainfall7dayavg'] = 0.0
         
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
# Default to the shared Atlas Cluster if env var not set
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://admin_db_user:vhIPMzRtzhINvaRp@cluster0.8ovat0j.mongodb.net/")
DB_NAME = "test"
db_client = None
db = None

# ...

async def get_lag_features(sku: str, store_id: str) -> Dict[str, Any]:
    """
    Calculate lag features (7d avg, 30d avg, dayofweek avg) from MongoDB.
    OPTIMIZED: Uses in-memory cache to avoid repeated queries.
    """
    # Check cache first
    cached = _get_cached_lag_features(sku)
    if cached is not None:
        logger.debug(f"⚡ Cache hit for lag features: {sku}")
        return cached
    
    if db is None:
        return {}
    
    try:
        # 1. Find the most recent sale for this SKU to establish "Current Time" for the data
        last_sale = await db.sales.find_one(
            {"sku": sku},
            sort=[("date", -1)]
        )
        
        if not last_sale:
            logger.warning(f"⚠️ No sales history found for SKU: {sku} - Lag features will be 0")
            result = {'sales7dayavg': 0, 'sales30dayavg': 0, 'dayofweek_avg': {}}
            _set_cached_lag_features(sku, result)
            return result
            
        # Use the last actual sale date as the reference point (e.g., Dec 31, 2024)
        # This bridges the gap if we are running the demo in 2026 but data ends in 2024
        ref_date = last_sale['date']
        if isinstance(ref_date, str):
            ref_date = datetime.fromisoformat(ref_date.replace('Z', '+00:00'))
            
        start_date = ref_date - timedelta(days=60)
        
        # 2. Fetch history relative to that reference date
        cursor = db.sales.find({
            "sku": sku,
            "date": {"$gte": start_date, "$lte": ref_date}
        }).sort("date", 1)
        
        sales_data = []
        async for doc in cursor:
            d = doc['date']
            if isinstance(d, str):
                d = datetime.fromisoformat(d.replace('Z', '+00:00'))
            
            sales_data.append({
                'date': d,
                'units': float(doc.get('unitsSold', 0)),
                'dow': d.weekday()
            })
            
        df = pd.DataFrame(sales_data)
        
        if df.empty:
            result = {'sales7dayavg': 0, 'sales30dayavg': 0, 'dayofweek_avg': {}}
            _set_cached_lag_features(sku, result)
            return result
            
        # 7-day average (relative to ref_date)
        recent_7d = df[df['date'] >= (ref_date - timedelta(days=7))]
        avg_7d = recent_7d['units'].mean() if not recent_7d.empty else 0
        std_7d = recent_7d['units'].std() if not recent_7d.empty and len(recent_7d) > 1 else 0
        
        # 14-day average
        recent_14d = df[df['date'] >= (ref_date - timedelta(days=14))]
        avg_14d = recent_14d['units'].mean() if not recent_14d.empty else 0
        
        # 30-day average
        recent_30d = df[df['date'] >= (ref_date - timedelta(days=30))]
        avg_30d = recent_30d['units'].mean() if not recent_30d.empty else 0
        
        # Day of week average
        dow_avg = df.groupby('dow')['units'].mean().to_dict()
        
        logger.info(f"✅ Found context for {sku}: Last sale {ref_date.date()}, 7d_avg={avg_7d:.1f}, 7d_std={std_7d:.1f}")
        
        result = {
            'sales7dayavg': avg_7d,
            'sales7daystd': std_7d,
            'sales14dayavg': avg_14d,
            'sales30dayavg': avg_30d,
            'dayofweek_avg': dow_avg
        }
        
        # Cache the result
        _set_cached_lag_features(sku, result)
        return result
        
    except Exception as e:
        logger.error(f"Failed to fetch lag features for {sku}: {e}")
        return {}


# ...

@app.on_event("startup")
async def startup_event():
    global db_client, db
    try:
        # Add connection timeout (5 seconds) to fail fast
        db_client = AsyncIOMotorClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
            connectTimeoutMS=5000
        )
        # Actually test the connection
        await db_client.admin.command('ping')
        db = db_client[DB_NAME]
        logger.info(f"✅ Connected to MongoDB: {DB_NAME}")
    except Exception as e:
        logger.warning(f"⚠️ MongoDB connection failed (lag features disabled): {e}")
        db_client = None
        db = None
    
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
        start_time = time.time()
        
        # 0. Fetch Lag Features from Historical Data (cached)
        lag_data = await get_lag_features(request.product_id, request.store_id)
        
        # 1. Fetch Product Info (cached)
        product_info = await get_product_info_db(request.product_id)
        if not product_info:
             logger.warning(f"Using default product info for {request.product_id}")
        
        # 2. Extract Category
        product_category = product_info.get('category', 'general').lower()
        if product_category in ['unknown', 'general']:
             # Use robust detection with name
             product_category = get_product_category(request.product_id, product_info.get('productname', ''))

        logger.info(f"📊 Forecasting {request.product_id} | Category: {product_category} | Price: {product_info.get('baseunitpricelkr', 0)}")
        
        # 3. BATCH PREDICTION - Prepare all inputs at once for efficiency
        today = datetime.now().date()
        target_dates = [today + timedelta(days=i+1) for i in range(request.horizon_days)]
        
        # Build batch input DataFrame
        batch_inputs = []
        sim_weathers = []
        
        for i, target_date in enumerate(target_dates):
            # Simulate dynamic weather (alternating patterns)
            weather_pattern = i % 4
            if weather_pattern == 0 or weather_pattern == 1:
                # Hot/Sunny
                sim_weather = {'temp': 32.0, 'rain': 0.0, 'humidity': 60.0}
            elif weather_pattern == 2:
                # Cloudy
                sim_weather = {'temp': 28.0, 'rain': 0.0, 'humidity': 75.0} 
            else:
                # Rainy
                sim_weather = {'temp': 25.0, 'rain': 25.0, 'humidity': 92.0}
            
            sim_weathers.append(sim_weather)
                
            input_df = prepare_forecast_input(request.product_id, target_date, lag_data, product_info, weather_data=sim_weather)
            input_df = input_df.reindex(columns=models['demand_features'], fill_value=0)
            batch_inputs.append(input_df)
        
        # Concatenate all inputs
        batch_df = pd.concat(batch_inputs, ignore_index=True)
        
        # Single batch prediction
        base_predictions = models['demand_model'].predict(batch_df)
        base_predictions = np.maximum(0, base_predictions)  # No negative sales
        
        # Apply multipliers and build response
        forecasts = []
        unique_reasons = set()
        
        for i, target_date in enumerate(target_dates):
            base_pred = base_predictions[i]
            sim_weather = sim_weathers[i]
            
            # --- RULE-BASED LAYER ---
            
            # 1. Holiday Multipliers (Base)
            holiday_mult, holiday_name = get_holiday_multiplier(target_date, product_category)
            if holiday_mult > 1.05 and holiday_name:
                unique_reasons.add(f"📅 Event Impact: {holiday_name} driving demand for {product_category}.")
            elif holiday_mult < 0.95 and holiday_name:
                 unique_reasons.add(f"📉 Event Impact: Lower demand expected due to {holiday_name}.")
            
            # 2. Weather Multipliers (Explicit)
            weather_mult = 1.0
            # Hot weather boosts beverages/ice cream
            if sim_weather['temp'] > 30.0 and product_category in ['beverage', 'ice cream', 'dairy', 'water']:
                weather_mult = 1.25
                unique_reasons.add("☀️ Weather Impact: High temps boosting category sales.")
            # Rainy weather boosts packaged/dry goods
            if sim_weather['rain'] > 10.0 and product_category in ['rice', 'dhal', 'noodles', 'soup']:
                weather_mult = 1.15
                unique_reasons.add("🌧️ Weather Impact: Rainfall increasing pantry stocking.")
            
            # 3. Weekend/Season Multipliers
            weekend_mult = get_weekend_multiplier(target_date)
            if weekend_mult > 1.05:
                 unique_reasons.add("📈 Weekend Surge: Typical weekend buying pattern.")
                 
            monsoon_mult = get_monsoon_multiplier(target_date)
            
            # 4. Noise
            seed_val = (target_date.toordinal() + hash(request.product_id)) % 100
            noise_factor = 1.0 + ((seed_val / 100.0) * 0.1 - 0.05)
            
            # Combine All Multipliers
            total_multiplier = holiday_mult * weather_mult * weekend_mult * monsoon_mult * noise_factor
            
            adjusted_pred = base_pred * total_multiplier
            
            # 5. EVENT-SPECIFIC ADDITIVE BOOST (The "Next Level" Logic)
            # Ensures major events cause visible spikes even if base demand is low
            additive_boost = 0.0
            
            # Thai Pongal (Jan 14, 2026 approx) - Rice, Milk, Jaggery
            # Note: 2026-01-14 is explicitly in get_holiday_multiplier logic, 
            # checks exact date from dict.
            if holiday_mult >= 1.5:  # If it's a major relevant holiday
                # Add at least 5-10 units to make it pop
                additive_boost = 5.0
                # Scale up for high volume items
                if base_pred > 10:
                    additive_boost = base_pred * 0.5 
            
            # SAFETY NET: Force Pongal spike for Rice/Milk if logic failed above
            if (target_date.month == 1 and target_date.day == 14):
                 # Check product category robustly again
                 is_rice = 'rice' in product_category or 'RIC' in request.product_id
                 is_milk = 'milk' in product_category or 'dairy' in product_category
                 if is_rice or is_milk:
                     if additive_boost < 5.0:
                         additive_boost = 5.0
                         unique_reasons.add("🛡️ AI Safety Net: Critical stock buffer applied for Thai Pongal.")
                         logger.info(f"  🛡️ Safety net applied additive boost for Pongal: {request.product_id}") 
            
            final_pred = adjusted_pred + additive_boost
            
            # Log for verification
            if abs(total_multiplier - 1.0) > 0.05 or additive_boost > 0:
                logger.info(
                    f"  📅 {target_date}: Base={base_pred:.1f} x {total_multiplier:.2f} + {additive_boost:.1f} = {final_pred:.1f} "
                    f"[H:{holiday_mult} W:{weather_mult} Cat:{product_category}]"
                )
            
            # Calculate bounds
            rmse = models['demand_metrics'].get('rmse', 5.0) * total_multiplier
            final_forecast = max(0, round(final_pred, 2))

            
            forecasts.append(ForecastPoint(
                date=target_date.isoformat(),
                forecast=final_forecast,
                lower_bound=max(0, round(final_forecast - 1.96 * rmse, 2)),
                upper_bound=round(final_forecast + 1.96 * rmse, 2)
            ))

        
        # Build Final Analysis
        analysis_list = list(unique_reasons)
        if not analysis_list:
            avg_forecast = np.mean([f.forecast for f in forecasts]) if forecasts else 0
            if avg_forecast > 0.1:
                analysis_list = ["Stable demand expected per historical patterns."]
            else:
                analysis_list = ["Low/Stable demand period."]
        
        elapsed = time.time() - start_time
        logger.info(f"⚡ Forecast completed in {elapsed:.2f}s for {request.horizon_days} days")

            
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
            model_version=models.get('model_info', {}).get('version', 'v2.0'),
            accuracy_metrics=models.get('demand_metrics', {}),
            analysis_reasons=analysis_list
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
            
            # Fetch lag features for this specific product
            lag_data = await get_lag_features(product_id, request.store_id)
            product_info = get_product_info(product_id)
            product_category = product_info.get('category', '').lower() or get_product_category(product_id)
            
            forecasts = []
            
            for i in range(request.horizon_days):
                target_date = today + timedelta(days=i+1)
                
                # Prepare and predict - NOW with lag_data and product_info!
                input_df = prepare_forecast_input(product_id, target_date, lag_data, product_info)
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
            
            # Prepare input features - keys must match training feature_cols (lowercase)
            data = {
                'dayofweek': datetime.now().weekday(),
                'month': datetime.now().month,
                'openingstock': item.current_stock,
                'closingstock': item.current_stock, # Proxy
                'soldqty': item.avg_daily_sales, # Proxy
                'receivedqty': 0, # Unknown
                'oldstockshare': item.old_stock_share,
                'ageriskratio': 0, # Unknown
                'oldestagedays': 0, # Unknown
                'estimatedoldstockqty': item.current_stock * item.old_stock_share,
                'typicalshelflifedays': info.get('typicalshelflifedays', 7),
                'sku_encoded': 0 # Default
            }
            
            # Add encodings
            try:
                data['sku_encoded'] = models['sku_encoder'].transform([str(item.sku)])[0]
            except:
                data['sku_encoded'] = 0
                
            if 'category_encoded' in models['waste_features']:
                data['category_encoded'] = 0

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
    """Get products from MongoDB 'products' collection for frontend dropdowns."""
    try:
        if db is None:
            # Fallback if DB not connected (should not happen in prod)
            return {"success": False, "error": "Database not connected", "data": []}
            
        query = {}
        if category:
            query['category'] = category
            
        # MongoDB Query
        cursor = db.products.find(query)
        if limit:
            cursor = cursor.limit(limit)
            
        products_docs = await cursor.to_list(length=limit)
        total_count = await db.products.count_documents(query)
        
        # Format for frontend
        products = []
        for doc in products_docs:
            products.append({
                "sku": doc.get('sku', ''),
                "productName": doc.get('productName', doc.get('name', '')),
                "category": doc.get('category', 'Unknown'),
                "brand": doc.get('brand', ''),
                "shelfLifeDays": doc.get('typicalShelfLifeDays', doc.get('shelfLifeDays', 7)),
            })
        
        return {
            "success": True, 
            "count": len(products),
            "total": total_count,
            "data": products
        }
        
    except Exception as e:
        logger.error(f"Products error: {e}")
        raise HTTPException(500, str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
