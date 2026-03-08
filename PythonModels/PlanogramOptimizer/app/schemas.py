"""
Pydantic schemas for the Planogram Optimizer API.

These define the request/response contracts for the FastAPI endpoints.
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class Product(BaseModel):
    _id: Optional[str] = None
    sku: str
    productName: Optional[str] = None
    widthCm: float
    heightCm: float
    depthCm: float
    minFacings: int = 1
    maxFacings: int = 10
    unitCostLKR: Optional[float] = 0
    baseUnitPriceLKR: Optional[float] = 0
    brand: Optional[str] = None
    category: Optional[str] = None

class ShelfLevel(BaseModel):
    _id: Optional[str] = None
    fixtureId: str
    levelIndex: int
    heightFromFloorCm: float
    usableWidthCm: float
    usableHeightCm: float
    usableDepthCm: float

class ShelfFixture(BaseModel):
    _id: Optional[str] = None
    aisleBaySide: Optional[str] = ""
    totalWidthCm: float
    totalHeightCm: float
    totalDepthCm: float

class ConstraintRule(BaseModel):
    """
    Represents a user-defined business constraint for the optimizer.
    
    Hard constraints MUST be satisfied (feasibility check).
    Soft constraints incur a penalty term in the objective function.
    
    Supported ruleTypes:
      - adjacency_required:       Two SKUs must be placed on the same shelf
      - adjacency_forbidden:      Two SKUs must NOT be on the same shelf
      - min_facings_override:     Override the minimum facings for a target
      - max_facings_override:     Override the maximum facings for a target
      - category_shelf_affinity:  A category should prefer specific shelves
      - brand_block:              Products of same brand must be contiguous
      - max_shelf_share:          A category cannot exceed X% of a shelf's width
    """
    _id: Optional[str] = None
    name: str = ""
    isActive: bool = True
    ruleType: str
    scope: str  # sku, brand, category, fixture, level, global
    targetSku: Optional[str] = None
    targetBrand: Optional[str] = None
    targetCategory: Optional[str] = None
    targetFixtureId: Optional[str] = None
    targetLevelId: Optional[str] = None
    hardConstraint: bool = True
    penaltyWeight: Optional[float] = 100.0
    params: Dict[str, Any] = {}

class OptimizationConfig(BaseModel):
    runType: str = "hybrid"  # heuristic_only, metaheuristic_only, hybrid
    solver: Optional[str] = "python_v1"
    objectiveWeights: Dict[str, float] = {}
    hyperparams: Dict[str, Any] = {}

class OptimizeRequest(BaseModel):
    run_id: str
    config: OptimizationConfig
    products: List[Dict[str, Any]]
    fixtures: List[Dict[str, Any]]
    levels: List[Dict[str, Any]]
    constraints: List[Dict[str, Any]] = []  # ConstraintRule dicts from backend

class Placement(BaseModel):
    sku: str
    level_id: str
    facings: int
    x_position: float
    y_position: float
    width_used: float

class OptimizeResponse(BaseModel):
    run_id: str
    status: str
    placements: List[Dict[str, Any]]
    score: float
    heuristic_score: float = 0
    message: str
    convergence_history: List[Dict[str, Any]] = []
    constraint_violations: List[Dict[str, Any]] = []
