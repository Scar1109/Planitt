import os
import uvicorn
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import List, Optional

# Additional logic for our specific theories
import math

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Wastage Prevention AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://admin_db_user:vhIPMzRtzhINvaRp@cluster0.8ovat0j.mongodb.net/")
DB_NAME = "test" # Use the same db the other models use for reference 

# Setup MongoDB client
client = None
db = None

@app.on_event("startup")
async def startup_db_client():
    global client, db
    try:
        client = AsyncIOMotorClient(MONGO_URI)
        db = client[DB_NAME]
        logger.info("Connected to MongoDB via Motor.")
    except Exception as e:
        logger.error(f"MongoDB connection error: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()

# DTOs
class SpoilageRiskResult(BaseModel):
    sku: str
    product_name: str
    category: str
    original_expiry_days: int
    biological_age_days: float
    effective_remaining_days: float
    q10_penalty_days: float
    sai_score: int # Spoilage Alert Index (1-10)
    fifo_violation_risk: bool
    reasoning: str

# ---------------------------------------------------------
# CORE LOGIC 1: Environmental Q10 Decay Model (Thermodynamics)
# ---------------------------------------------------------
# Q10 Temperature Coefficient states the rate of spoilage multiplies 
# by Q10 (typically ~2 to 2.5 for food) for every 10 degree C rise.
# R2 / R1 = Q10 ^ ((T2 - T1) / 10)
def calculate_q10_decay(base_shelf_life_days: int, ideal_temp_c: float, actual_avg_temp_c: float, q10_factor: float = 2.0) -> float:
    # If the actual temperature is above ideal, spoilage rate increases.
    temp_diff = actual_avg_temp_c - ideal_temp_c
    if temp_diff <= 0:
        return float(base_shelf_life_days) # Colder is fine (assuming no chill injury for simplicity)
    
    # Calculate how much faster the item is spoiling
    rate_multiplier = math.pow(q10_factor, temp_diff / 10.0)
    
    # Effective shelf life is the base shelf life divided by the faster spoilage rate
    effective_shelf_life = base_shelf_life_days / rate_multiplier
    return round(effective_shelf_life, 2)


# ---------------------------------------------------------
# CORE LOGIC 2: FIFO Violation Risk (Behavioral Modeling)
# ---------------------------------------------------------
# If expected daily sales velocity is 10 units/day, but we only sold 2 units
# of a specific batch while total category sales remained high, humans are 
# likely ignoring this batch (it's hidden at the back).
def check_fifo_violation(expected_velocity: float, actual_velocity: float) -> bool:
    if expected_velocity <= 0: return False
    # If actual sales are less than 30% of what's expected for this specific item batch 
    # it's highly anomalous and suggests physical inaccessibility.
    if (actual_velocity / expected_velocity) < 0.30: 
        return True
    return False

# ---------------------------------------------------------
# ROUTES
# ---------------------------------------------------------

@app.get("/")
async def root():
    return {"message": "Wastage Prevention AI API (Q10 & FIFO Models) is running"}

@app.get("/api/wastage/index-scores", response_model=List[SpoilageRiskResult])
async def get_spoildage_index_scores():
    """
    Simulates fetching real-time active inventory batches, 
    applying Q10 Environmental Modeling & FIFO Anomaly Detection.
    Returns the Spoilage Alert Index (SAI) for the Dashboard.
    """
    
    # In a full production loop, this data is pulled dynamically from the DB 
    # based on current inventory batches and recent weather logs.
    # For this research implementation, we process a realistic, dynamic set of examples 
    # showcasing the math taking effect.
    
    inventory_batches = [
        {
            "sku": "MILK-001", "product_name": "Highland Fresh Milk 1L", "category": "Dairy",
            "base_shelf_life": 5, "ideal_temp": 4.0, "actual_temp": 12.5, # Major Cooler issue
            "expected_daily_sales": 20, "actual_daily_sales": 2 # Critical FIFO Warning
        },
        {
            "sku": "MEAT-045", "product_name": "Fresh Chicken Breast 500g", "category": "Meat - Poultry",
            "base_shelf_life": 4, "ideal_temp": 2.0, "actual_temp": 2.8, # Normal
            "expected_daily_sales": 15, "actual_daily_sales": 14
        },
        {
            "sku": "VEG-102", "product_name": "Organic Tomatoes 1kg", "category": "Produce",
            "base_shelf_life": 10, "ideal_temp": 12.0, "actual_temp": 22.0, # Ambient display issue
            "expected_daily_sales": 30, "actual_daily_sales": 28
        },
        {
             "sku": "YOG-220", "product_name": "Bairaha Set Yoghurt", "category": "Dairy",
            "base_shelf_life": 14, "ideal_temp": 4.0, "actual_temp": 10.0, 
            "expected_daily_sales": 50, "actual_daily_sales": 12 # FIFO Warning + Temp penalty
        },
        {
             "sku": "CHZ-808", "product_name": "Anchor Cheddar Cheese 250g", "category": "Dairy",
            "base_shelf_life": 30, "ideal_temp": 4.0, "actual_temp": 4.5, # Perfect temp
            "expected_daily_sales": 10, "actual_daily_sales": 11 # Perfect FIFO
        },
        {
             "sku": "FRT-551", "product_name": "Cavendish Bananas 1kg", "category": "Produce",
            "base_shelf_life": 7, "ideal_temp": 14.0, "actual_temp": 28.0, # Left out in heat
            "expected_daily_sales": 40, "actual_daily_sales": 35 
        }
    ]
    
    results = []
    
    for batch in inventory_batches:
        # 1. Apply Q10 Thermodynamic Rule
        effective_life = calculate_q10_decay(
            base_shelf_life_days=batch["base_shelf_life"],
            ideal_temp_c=batch["ideal_temp"],
            actual_avg_temp_c=batch["actual_temp"],
            q10_factor=2.0 # Standard generalized coefficient for food microbes
        )
        penalty = round(batch["base_shelf_life"] - effective_life, 2)
        
        # 2. Apply FIFO Anomaly Detectin
        fifo_risk = check_fifo_violation(batch["expected_daily_sales"], batch["actual_daily_sales"])
        
        # 3. Calculate Spoilage Alert Index (SAI: 1 to 10)
        # Higher score = more critical.
        # Start at 2. Add points for thermodynamic decay severity and FIFO risk.
        base_sai = 2
        
        # Penalty impact (% of original shelf life lost)
        lost_percentage = penalty / batch["base_shelf_life"]
        sai_temp_add = int(lost_percentage * 10) # e.g. lost 50% = +5 points
        
        sai_fifo_add = 4 if fifo_risk else 0
        
        final_sai = min(10, base_sai + sai_temp_add + sai_fifo_add)
        
        reasoning = []
        if sai_temp_add >= 2:
            reasoning.append(f"Q10 Thermal Penalty: Lost {penalty} days due to +{round(batch['actual_temp'] - batch['ideal_temp'], 1)}°C variance.")
        if fifo_risk:
            reasoning.append(f"FIFO Violation: Moving {round(100 - (batch['actual_daily_sales']/batch['expected_daily_sales']*100))}% slower than expected historical velocity.")
            
        if not reasoning:
            reasoning.append("Normal decay trajectory. Low biological risk. Stock moving as expected.")
            
        res = SpoilageRiskResult(
            sku=batch["sku"],
            product_name=batch["product_name"],
            category=batch["category"],
            original_expiry_days=batch["base_shelf_life"],
            biological_age_days=penalty, # Age accelerated by X days
            effective_remaining_days=effective_life,
            q10_penalty_days=penalty,
            sai_score=final_sai,
            fifo_violation_risk=fifo_risk,
            reasoning=" | ".join(reasoning)
        )
        results.append(res)
        
    # Sort descending by SAI Score so most critical is first
    results.sort(key=lambda x: x.sai_score, reverse=True)
    return results

if __name__ == "__main__":
    logger.info("Starting WastagePrevention AI microservice on port 8006...")
    uvicorn.run("main:app", host="0.0.0.0", port=8006, reload=True)
