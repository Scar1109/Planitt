from fastapi import FastAPI, HTTPException
from app.schemas import OptimizeRequest, OptimizeResponse
from app.model_based import ModelBasedRanker
from app.heuristics import HeuristicOptimizer
from app.optimizer import SimulatedAnnealingOptimizer
import logging

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Initialize Components
ranker = ModelBasedRanker()
heuristic_solver = HeuristicOptimizer()
sa_solver = SimulatedAnnealingOptimizer()

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "planogram-optimizer"}

@app.get("/model/metadata")
def get_model_metadata():
    try:
        import os, json
        metadata_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "model_metadata.json")
        if os.path.exists(metadata_path):
            with open(metadata_path, "r") as f:
                return json.load(f)
        return {"error": "Metadata not found"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/optimize", response_model=OptimizeResponse)
def run_optimization(request: OptimizeRequest):
    logger.info(f"Received optimization request for Run ID: {request.run_id}")
    
    try:
        # 1. Rank Products
        # Convert Pydantic/Dict objects to list of dicts consistent for internal logic
        products = request.products
        ranked_products = ranker.get_ranked_products(products, request.config.dict())
        
        logger.info(f"Products ranked. Top 1: {ranked_products[0].get('sku') if ranked_products else 'None'}")
        
        # 2. Heuristic Construction
        initial_placements, level_state = heuristic_solver.generate_layout(
            ranked_products, 
            request.fixtures, 
            request.levels
        )
        logger.info(f"Heuristic Layout Generated. Placements: {len(initial_placements)}")
        
        final_placements = initial_placements
        final_score = 0
        
        # 3. Metaheuristic Refinement (if requested)
        run_type = request.config.runType
        if run_type in ["hybrid", "metaheuristic_only"]:
            # If metaheuristic_only, we might start from random, but usually hybrid is best
            # Here we assume hybrid (start from heuristic)
            optimized_placements, score = sa_solver.optimize(
                initial_placements, 
                ranked_products, 
                request.levels, 
                request.config.dict()
            )
            final_placements = optimized_placements
            final_score = score
            logger.info(f"Metaheuristic finished. Score: {final_score}")
        
        return {
            "run_id": request.run_id,
            "status": "success",
            "placements": final_placements,
            "score": final_score,
            "message": "Optimization completed successfully"
        }

    except Exception as e:
        logger.error(f"Optimization failed: {e}")
        return {
            "run_id": request.run_id,
            "status": "failed",
            "placements": [],
            "score": 0,
            "message": str(e)
        }
