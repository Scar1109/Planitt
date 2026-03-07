from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict
from datetime import date
from enum import Enum

class PromotionType(str, Enum):
    DISCOUNT = "DISCOUNT"
    BUNDLE = "BUNDLE"
    BOGO = "BOGO"
    CLEARANCE = "CLEARANCE"

class ObjectiveType(str, Enum):
    MAX_PROFIT = "MAX_PROFIT"
    MAX_REVENUE = "MAX_REVENUE"
    MIN_WASTE = "MIN_WASTE"

class SKUInfo(BaseModel):
    sku_id: str
    category: str
    brand: str
    base_price: float
    cost_price: float
    stock_level: int
    days_to_expiry: Optional[int] = None
    waste_risk_score: float = 0.0
    is_perishable: bool = False

class SimulationRequest(BaseModel):
    sku: SKUInfo
    duration_days: int = 7
    test_discount: float

class ScenarioSimulationRequest(BaseModel):
    sku: SKUInfo
    duration_days: int = 14
    test_discount: float
    facings_change: int = 0
    location: str = "Western"

class ScenarioCompareRequest(BaseModel):
    sku: SKUInfo
    current_discount: float
    current_facings: int
    proposed_discount: float
    proposed_facings: int
    duration_days: int = 14
    location: str = "Western"

class ScenarioTrendRequest(BaseModel):
    sku: SKUInfo
    days: int = 30
    location: str = "Western"

class SalesHistory(BaseModel):
    date: date
    units_sold: float
    promo_flag: int
    price: float

class Constraint(BaseModel):
    max_slots: int = 10
    max_per_category: int = 2
    min_margin_pct: float = 0.10
    allow_stockout_risk: bool = False

class PromotionCandidate(BaseModel):
    sku_id: str
    promo_type: PromotionType
    discount_depth: float  # 0.10, 0.20
    start_date: date
    duration_days: int
    
    # AI Predictions
    baseline_forecast: float = 0.0
    uplift_forecast: float = 0.0
    revenue_lift: float = 0.0
    profit_lift: float = 0.0
    waste_saved: float = 0.0
    
    # Advanced Metadata
    risk_flags: List[str] = []

class PromotionPlan(BaseModel):
    plan_id: str
    created_at: date
    objective: ObjectiveType
    recommendations: List[PromotionCandidate]
    summary_stats: Dict[str, float]
