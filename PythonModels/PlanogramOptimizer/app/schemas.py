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

class OptimizationConfig(BaseModel):
    runType: str = "hybrid" # heuristic_only, metaheuristic_only, hybrid
    solver: Optional[str] = "python_v1"
    objectiveWeights: Dict[str, float] = {}
    hyperparams: Dict[str, Any] = {}

class OptimizeRequest(BaseModel):
    run_id: str
    config: OptimizationConfig
    products: List[Dict[str, Any]] # Allow dict to handle MongoDB _id flexibility or extra fields
    fixtures: List[Dict[str, Any]]
    levels: List[Dict[str, Any]]

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
    message: str
