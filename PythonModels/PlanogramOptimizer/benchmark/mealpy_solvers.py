"""
MEALPY Multi-Solver Engine for Planogram Optimization.

Wraps 5 MEALPY algorithms (GA, PSO, GWO, WOA, DE) to provide
the same optimize() interface as the existing SA and TS solvers.

Each solver:
  - Accepts initial_placements, products, levels, config, constraint_checker
  - Returns (placements, score, convergence_history)
  - Uses the same evaluation budget (3000 function evaluations)

References:
  Holland (1975) - GA | Kennedy & Eberhart (1995) - PSO
  Mirjalili et al. (2014) - GWO | Mirjalili & Lewis (2016) - WOA
  Storn & Price (1997) - DE
"""
import logging
import time
import numpy as np

from mealpy import GA, PSO, GWO, WOA, DE

from benchmark.mealpy_adapter import PlanogramProblem

logger = logging.getLogger(__name__)


# Available MEALPY solvers with their default hyperparameters
MEALPY_SOLVERS = {
    'ga': {
        'name': 'Genetic Algorithm',
        'class': GA.BaseGA,
        'params': {'pc': 0.9, 'pm': 0.05, 'selection': 'tournament', 'k_way': 0.4,
                   'crossover': 'multi_points', 'mutation': 'swap'},
        'category': 'Evolutionary',
        'reference': 'Holland (1975)'
    },
    'pso': {
        'name': 'Particle Swarm Optimization',
        'class': PSO.OriginalPSO,
        'params': {'c1': 2.05, 'c2': 2.05, 'w': 0.4},
        'category': 'Swarm Intelligence',
        'reference': 'Kennedy & Eberhart (1995)'
    },
    'gwo': {
        'name': 'Grey Wolf Optimizer',
        'class': GWO.OriginalGWO,
        'params': {},
        'category': 'Swarm Intelligence',
        'reference': 'Mirjalili et al. (2014)'
    },
    'woa': {
        'name': 'Whale Optimization Algorithm',
        'class': WOA.OriginalWOA,
        'params': {},
        'category': 'Swarm Intelligence',
        'reference': 'Mirjalili & Lewis (2016)'
    },
    'de': {
        'name': 'Differential Evolution',
        'class': DE.OriginalDE,
        'params': {'wf': 0.7, 'cr': 0.9, 'strategy': 0},
        'category': 'Evolutionary',
        'reference': 'Storn & Price (1997)'
    }
}


class MealpySolverEngine:
    """
    Unified engine that runs any MEALPY algorithm on the planogram problem.
    Provides identical interface to SimulatedAnnealingOptimizer and TabuSearchOptimizer.
    """

    def __init__(self):
        pass

    def optimize(self, solver_key, initial_placements, products, levels, config,
                 constraint_checker=None, seed=None):
        """
        Run a MEALPY metaheuristic to optimize planogram placement.

        Args:
            solver_key: one of 'ga', 'pso', 'gwo', 'woa', 'de'
            initial_placements: flat placement list from heuristic
            products: list of ranked product dicts
            levels: list of level dicts
            config: optimization config dict
            constraint_checker: ConstraintChecker instance (optional)
            seed: random seed for reproducibility

        Returns:
            (placements, score, convergence_history)
        """
        if solver_key not in MEALPY_SOLVERS:
            raise ValueError(f"Unknown solver: {solver_key}. Available: {list(MEALPY_SOLVERS.keys())}")

        solver_info = MEALPY_SOLVERS[solver_key]

        # Set random seed for reproducibility
        if seed is not None:
            np.random.seed(seed)

        # Build the MEALPY Problem
        problem = PlanogramProblem(
            products=products,
            levels=levels,
            constraint_checker=constraint_checker
        )

        # Calculate epochs from evaluation budget
        hyperparams = config.get('hyperparams', {})
        total_evals = hyperparams.get('iterations', 3000)
        pop_size = hyperparams.get('pop_size', 50)
        epoch = max(total_evals // pop_size, 10)

        # Create optimizer instance
        solver_params = {**solver_info['params']}
        try:
            optimizer = solver_info['class'](epoch=epoch, pop_size=pop_size, **solver_params)
        except TypeError:
            # Some solvers may not accept all params
            optimizer = solver_info['class'](epoch=epoch, pop_size=pop_size)

        logger.info(f"Starting {solver_info['name']}: epoch={epoch}, pop_size={pop_size}, "
                    f"total_evals={epoch * pop_size}")

        start_time = time.time()

        # Solve
        g_best = optimizer.solve(problem, mode="single")

        elapsed = time.time() - start_time

        # Extract results
        best_solution = g_best.solution
        best_score = -g_best.target.fitness  # Negate back (we minimized -score)

        # Decode solution to placements
        placements = problem.decode_solution(best_solution)

        # Build convergence history from MEALPY's tracking
        convergence_history = []
        if hasattr(optimizer, 'history') and hasattr(optimizer.history, 'list_global_best'):
            for idx, agent in enumerate(optimizer.history.list_global_best):
                if idx % 5 == 0 or idx == len(optimizer.history.list_global_best) - 1:
                    convergence_history.append({
                        'iteration': idx * pop_size,  # Convert epochs to evaluations
                        'score': round(-agent.target.fitness, 2),
                        'current_score': round(-agent.target.fitness, 2)
                    })

        # If no history available, at least add start and end
        if not convergence_history:
            convergence_history = [
                {'iteration': 0, 'score': 0, 'current_score': 0},
                {'iteration': epoch * pop_size, 'score': round(best_score, 2),
                 'current_score': round(best_score, 2)}
            ]

        logger.info(f"{solver_info['name']} finished: Score={best_score:.2f}, "
                    f"Time={elapsed:.2f}s, Placements={len(placements)}")

        return placements, best_score, convergence_history, elapsed


def get_available_solvers():
    """Return dict of available MEALPY solver info for display/selection."""
    return {k: {'name': v['name'], 'category': v['category'], 'reference': v['reference']}
            for k, v in MEALPY_SOLVERS.items()}
