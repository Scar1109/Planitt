"""
FastAPI entry point for the Planogram Optimizer service.

Pipeline:
  1. Rank products by predicted demand + margin (ML-based)
  2. Generate initial feasible layout (constructive heuristic)
  3. Refine via metaheuristic (SA or Tabu Search)
  4. Return placements, scores, convergence history, and constraint violations
"""
from fastapi import FastAPI, HTTPException
from app.schemas import OptimizeRequest, OptimizeResponse
from app.model_based import ModelBasedRanker
from app.heuristics import HeuristicOptimizer
from app.optimizer import SimulatedAnnealingOptimizer
from app.tabu_search import TabuSearchOptimizer
import logging

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Planogram Optimizer",
    description="Hybrid optimization engine for shelf-space allocation",
    version="2.0.0"
)

# Initialize Components
ranker = ModelBasedRanker()
heuristic_solver = HeuristicOptimizer()
sa_solver = SimulatedAnnealingOptimizer()
ts_solver = TabuSearchOptimizer()

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "planogram-optimizer", "version": "2.0.0"}

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
    """
    Main optimization endpoint.

    Accepts products, fixtures, levels, constraints, and config.
    Returns optimized placements with scoring and convergence data.
    """
    logger.info(f"Received optimization request for Run ID: {request.run_id}")

    try:
        # --- Input Validation ---
        if not request.products:
            raise ValueError("No products provided for optimization.")
        if not request.levels:
            raise ValueError("No shelf levels provided for optimization.")

        # 1. Rank Products
        products = request.products
        ranked_products = ranker.get_ranked_products(products, request.config.dict())

        logger.info(f"Products ranked. Top: {ranked_products[0].get('sku') if ranked_products else 'None'}")

        # 2. Heuristic Construction (with constraints)
        constraints = request.constraints or []
        logger.info(f"Applying {len(constraints)} constraint rules")

        initial_placements, level_state, constraint_checker = heuristic_solver.generate_layout(
            ranked_products,
            request.fixtures,
            request.levels,
            constraints=constraints
        )
        logger.info(f"Heuristic Layout Generated. Placements: {len(initial_placements)}")

        # Compute heuristic baseline score
        heuristic_score = sa_solver._score_state(
            _placements_to_state(initial_placements, ranked_products, request.levels),
            {p['sku']: p for p in ranked_products},
            constraint_checker
        )
        logger.info(f"Heuristic Baseline Score: {heuristic_score:.2f}")

        final_placements = initial_placements
        final_score = heuristic_score
        convergence_history = []

        # 3. Metaheuristic Refinement (if requested)
        run_type = request.config.runType
        solver_choice = request.config.solver or "sa"

        if run_type in ["hybrid", "metaheuristic_only"]:
            config_dict = request.config.dict()

            if solver_choice == "tabu_search":
                logger.info("Using Tabu Search solver")
                optimized_placements, score, convergence = ts_solver.optimize(
                    initial_placements,
                    ranked_products,
                    request.levels,
                    config_dict,
                    constraint_checker=constraint_checker
                )
            else:
                logger.info("Using Simulated Annealing solver")
                optimized_placements, score, convergence = sa_solver.optimize(
                    initial_placements,
                    ranked_products,
                    request.levels,
                    config_dict,
                    constraint_checker=constraint_checker
                )

            final_placements = optimized_placements
            final_score = score
            convergence_history = convergence
            logger.info(f"Metaheuristic finished. Score: {final_score:.2f}")

        # 4. Compute final constraint violations
        constraint_violations = []
        if constraint_checker:
            final_state_dict = {}
            for lid_state in _placements_to_state(final_placements, ranked_products, request.levels).items():
                lid, s = lid_state
                final_state_dict[lid] = {
                    'obj': s['obj'],
                    'remaining_width': s['remaining_width'],
                    'items': {item['sku']: item for item in s['items']}
                }
            _, constraint_violations = constraint_checker.compute_penalty(final_state_dict)

        return {
            "run_id": request.run_id,
            "status": "success",
            "placements": final_placements,
            "score": final_score,
            "heuristic_score": heuristic_score,
            "message": "Optimization completed successfully",
            "convergence_history": convergence_history,
            "constraint_violations": constraint_violations
        }

    except Exception as e:
        logger.error(f"Optimization failed: {e}", exc_info=True)
        return {
            "run_id": request.run_id,
            "status": "failed",
            "placements": [],
            "score": 0,
            "heuristic_score": 0,
            "message": str(e),
            "convergence_history": [],
            "constraint_violations": []
        }


def _placements_to_state(placements, products, levels):
    """Helper: convert flat placements back to state dict for scoring."""
    products_map = {p['sku']: p for p in products}
    state = {}

    for l in levels:
        state[l['_id']] = {
            'obj': l,
            'remaining_width': l['usableWidthCm'],
            'items': []
        }

    for p in placements:
        lid = p['level_id']
        sku = p['sku']
        prod = products_map.get(sku)
        if not prod or lid not in state:
            continue

        state[lid]['items'].append({
            'sku': sku,
            'facings': p['facings'],
            'width_one': prod['widthCm'],
            'total_width': p['width_used'],
            'min_facings': prod.get('minFacings', 1),
            'max_facings': prod.get('maxFacings', 10),
            'height': prod['heightCm'],
            'depth': prod['depthCm']
        })
        state[lid]['remaining_width'] -= p['width_used']

    return state


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
