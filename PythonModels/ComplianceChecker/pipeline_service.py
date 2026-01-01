from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import os
import joblib

# Import our custom modules
from compliance_engine import ComplianceEngine
from impact_estimator import ImpactEstimator

app = FastAPI(title="Planitt Compliance Intelligence Layer")

# --- Services ---
# Initialize strictly once
engine = ComplianceEngine()
try:
    estimator = ImpactEstimator()
    print("Impact Estimator loaded successfully.")
except Exception as e:
    print(f"Warning: Impact Estimator failed to load (Training might be incomplete): {e}")
    estimator = None

# --- Models ---
class PlanogramRequest(BaseModel):
    current_planogram: Dict[str, Any]
    optimized_planogram: Dict[str, Any]

class ComplianceResponse(BaseModel):
    score: float
    deviations: List[Dict[str, Any]]
    total_revenue_opportunity: float
    currency: str
    audit_metadata: Dict[str, Any]

# --- Endpoints ---

@app.get("/health")
def health_check():
    model_status = "loaded" if estimator and estimator.model else "not_loaded"
    return {"status": "ok", "service": "compliance-checker", "model_status": model_status}

@app.post("/analyze", response_model=ComplianceResponse)
def analyze_compliance(request: PlanogramRequest):
    """
    1. Detect Deviations (ComplianceEngine)
    2. Estimate Impact (ImpactEstimator)
    3. Return Structured Audit
    """
    try:
        # 1. Detect
        deviations = engine.compare_planograms(request.current_planogram, request.optimized_planogram)
        
        # 2. Impact
        total_opportunity = 0.0
        if estimator:
            deviations = estimator.predict_impact(deviations)
            for d in deviations:
                if 'impact_prediction' in d and 'revenue_opportunity' in d['impact_prediction']:
                    val = d['impact_prediction']['revenue_opportunity']
                    if isinstance(val, (int, float)):
                        total_opportunity += max(0, val)
        
        # 3. Score (Simple Heuristic for now)
        # 100 - (deductions per deviation)
        score = 100.0
        for d in deviations:
            if d['type'] == 'MISSING_ITEM': score -= 10
            elif d['type'] == 'MISPLACED_ITEM': score -= 5
            elif d['type'] == 'EXTRA_ITEM': score -= 2
            elif d['type'] == 'FACING_MISMATCH': score -= 1
        score = max(0.0, score)
        
        return {
            "score": score,
            "deviations": deviations,
            "total_revenue_opportunity": round(total_opportunity, 2),
            "currency": "LKR",
            "audit_metadata": {
                "engine_version": "1.0.0",
                "impact_model_version": "random_forest_v1"
            }
        }
    except Exception as e:
        import traceback
        trace = traceback.format_exc()
        print(trace)
        # Return 500 but with detail
        raise HTTPException(status_code=500, detail=f"Internal Error: {str(e)} | Trace: {trace}")

if __name__ == "__main__":
    # Dev server run
    uvicorn.run(app, host="0.0.0.0", port=8000)
