"""
Benchmark Runner — Phase 1: Metaheuristic Comparison.

Runs 7 optimization solvers (SA, TS, GA, PSO, GWO, WOA, DE) across
3 scenarios (Small, Medium, Large) with N independent runs each.

Outputs:
  results/benchmark_raw_results.csv    — Every run's metrics (630 rows for 30 runs)
  results/benchmark_summary.csv        — Mean ± Std per solver per scenario
  results/benchmark_ranking.csv        — Friedman rank + Wilcoxon p-values
  results/best_solver_report.txt       — Which solver won

Usage:
  python -m benchmark.benchmark_runner --runs 30 --output ./results
  python -m benchmark.benchmark_runner --runs 5 --scenarios small  # Quick smoke test
"""
import os
import sys
import json
import time
import copy
import argparse
import logging
import numpy as np
import pandas as pd
from datetime import datetime

# Add parent to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.model_based import ModelBasedRanker
from app.heuristics import HeuristicOptimizer, ConstraintChecker
from app.optimizer import SimulatedAnnealingOptimizer
from app.tabu_search import TabuSearchOptimizer
from benchmark.mealpy_solvers import MealpySolverEngine

logging.basicConfig(level=logging.WARNING, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Suppress MEALPY verbose output
logging.getLogger('mealpy').setLevel(logging.WARNING)


def load_scenario(scenario_path):
    """Load a benchmark scenario from JSON."""
    with open(scenario_path, 'r') as f:
        return json.load(f)


def run_heuristic_phase(products, fixtures, levels, constraints, config):
    """
    Run ML ranking + Heuristic construction (identical for all solvers).
    Returns: (ranked_products, initial_placements, heuristic_score, constraint_checker)
    """
    ranker = ModelBasedRanker()
    ranked_products = ranker.get_ranked_products(products, config)

    heuristic_solver = HeuristicOptimizer()
    initial_placements, level_state, constraint_checker = heuristic_solver.generate_layout(
        ranked_products, fixtures, levels, constraints=constraints
    )

    # Compute heuristic baseline score using SA's scoring
    sa_solver = SimulatedAnnealingOptimizer()
    heuristic_score = sa_solver._score_state(
        _placements_to_state(initial_placements, ranked_products, levels),
        {p['sku']: p for p in ranked_products},
        constraint_checker
    )

    return ranked_products, initial_placements, heuristic_score, constraint_checker


def run_single_experiment(solver_key, initial_placements, ranked_products, levels, config,
                          constraint_checker, seed):
    """
    Run one metaheuristic optimization and return metrics dict.
    """
    start_time = time.time()

    if solver_key == 'sa':
        sa = SimulatedAnnealingOptimizer()
        np.random.seed(seed)
        import random as rng
        rng.seed(seed)
        placements, score, convergence = sa.optimize(
            initial_placements, ranked_products, levels, config,
            constraint_checker=constraint_checker
        )
        elapsed = time.time() - start_time
    elif solver_key == 'tabu_search':
        ts = TabuSearchOptimizer()
        np.random.seed(seed)
        import random as rng
        rng.seed(seed)
        placements, score, convergence = ts.optimize(
            initial_placements, ranked_products, levels, config,
            constraint_checker=constraint_checker
        )
        elapsed = time.time() - start_time
    else:
        # MEALPY solver
        engine = MealpySolverEngine()
        placements, score, convergence, elapsed = engine.optimize(
            solver_key, initial_placements, ranked_products, levels, config,
            constraint_checker=constraint_checker, seed=seed
        )

    # Compute additional metrics
    products_map = {p['sku']: p for p in ranked_products}
    total_width = sum(l['usableWidthCm'] for l in levels)
    used_width = sum(p['width_used'] for p in placements)
    space_util = (used_width / total_width * 100) if total_width > 0 else 0
    products_placed = len(set(p['sku'] for p in placements))
    total_products = len(ranked_products)
    coverage = (products_placed / total_products * 100) if total_products > 0 else 0

    # Constraint violations
    n_violations = 0
    if constraint_checker:
        state_dict = {}
        state = _placements_to_state(placements, ranked_products, levels)
        for lid, s in state.items():
            state_dict[lid] = {
                'obj': s['obj'],
                'remaining_width': s['remaining_width'],
                'items': {item['sku']: item for item in s['items']}
            }
        _, violations = constraint_checker.compute_penalty(state_dict)
        n_violations = len(violations)

    # Convergence speed (iteration to reach 95% of final score)
    convergence_iter = 0
    if convergence and score > 0:
        target_95 = score * 0.95
        for point in convergence:
            s = point.get('score', 0)
            if s >= target_95:
                convergence_iter = point.get('iteration', 0)
                break

    return {
        'best_score': round(score, 4),
        'wall_clock_sec': round(elapsed, 4),
        'convergence_iter': convergence_iter,
        'constraint_violations': n_violations,
        'space_utilization_pct': round(space_util, 2),
        'products_placed': products_placed,
        'product_coverage_pct': round(coverage, 2),
        'n_placements': len(placements),
        'convergence_history': convergence
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


def main():
    parser = argparse.ArgumentParser(description='Planogram Optimizer Benchmark Runner')
    parser.add_argument('--runs', type=int, default=30, help='Number of independent runs per solver per scenario')
    parser.add_argument('--output', type=str, default='./results', help='Output directory for results')
    parser.add_argument('--scenarios', type=str, default='all',
                        help='Scenarios to run: all, small, medium, large (comma-separated)')
    parser.add_argument('--solvers', type=str, default='all',
                        help='Solvers to run: all or comma-separated list (sa,tabu_search,ga,pso,gwo,woa,de)')
    args = parser.parse_args()

    # Setup output directory
    os.makedirs(args.output, exist_ok=True)

    # Determine scenarios
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
    scenario_files = {
        'small': os.path.join(data_dir, 'small_scenario.json'),
        'medium': os.path.join(data_dir, 'medium_scenario.json'),
        'large': os.path.join(data_dir, 'large_scenario.json'),
    }

    # Generate large scenario if missing
    if not os.path.exists(scenario_files['large']):
        logger.info("Generating large scenario...")
        from benchmark.generate_large_scenario import scenario as large_data
        with open(scenario_files['large'], 'w') as f:
            json.dump(large_data, f, indent=2)

    if args.scenarios == 'all':
        scenarios_to_run = list(scenario_files.keys())
    else:
        scenarios_to_run = [s.strip() for s in args.scenarios.split(',')]

    # Determine solvers
    all_solvers = ['sa', 'tabu_search', 'ga', 'pso', 'gwo', 'woa', 'de']
    if args.solvers == 'all':
        solvers_to_run = all_solvers
    else:
        solvers_to_run = [s.strip() for s in args.solvers.split(',')]

    solver_display_names = {
        'sa': 'SA (Custom)', 'tabu_search': 'TS (Custom)',
        'ga': 'GA (MEALPY)', 'pso': 'PSO (MEALPY)', 'gwo': 'GWO (MEALPY)',
        'woa': 'WOA (MEALPY)', 'de': 'DE (MEALPY)'
    }

    n_runs = args.runs
    total_experiments = len(scenarios_to_run) * len(solvers_to_run) * n_runs

    logger.info("=" * 70)
    logger.info("PLANOGRAM OPTIMIZER BENCHMARK")
    logger.info(f"Scenarios: {scenarios_to_run}")
    logger.info(f"Solvers:   {solvers_to_run}")
    logger.info(f"Runs:      {n_runs}")
    logger.info(f"Total experiments: {total_experiments}")
    logger.info("=" * 70)

    all_results = []
    convergence_data = {}  # For plotting

    config = {
        'runType': 'hybrid',
        'objectiveWeights': {'sales': 0.5, 'margin': 0.3},
        'hyperparams': {'iterations': 3000, 'coolingRate': 0.995, 'pop_size': 50}
    }

    experiment_counter = 0

    for scenario_key in scenarios_to_run:
        scenario_path = scenario_files.get(scenario_key)
        if not scenario_path or not os.path.exists(scenario_path):
            logger.warning(f"Scenario file not found: {scenario_path}, skipping.")
            continue

        logger.info(f"\n{'=' * 50}")
        logger.info(f"SCENARIO: {scenario_key.upper()}")
        logger.info(f"{'=' * 50}")

        scenario = load_scenario(scenario_path)
        products = scenario['products']
        fixtures = scenario['fixtures']
        levels = scenario['levels']
        constraints = scenario.get('constraints', [])

        logger.info(f"Products: {len(products)}, Levels: {len(levels)}, Constraints: {len(constraints)}")

        # Run heuristic phase once (shared by all solvers)
        logger.info("Running ML ranking + Heuristic construction...")
        ranked_products, initial_placements, heuristic_score, constraint_checker = \
            run_heuristic_phase(products, fixtures, levels, constraints, config)
        logger.info(f"Heuristic baseline score: {heuristic_score:.2f}")

        convergence_data[scenario_key] = {}

        for solver_key in solvers_to_run:
            solver_name = solver_display_names.get(solver_key, solver_key)
            logger.info(f"\n  Solver: {solver_name}")
            convergence_data[scenario_key][solver_key] = []

            for run_idx in range(n_runs):
                experiment_counter += 1
                seed = 42 + run_idx  # Deterministic seeds

                try:
                    metrics = run_single_experiment(
                        solver_key, initial_placements, ranked_products, levels, config,
                        constraint_checker, seed
                    )

                    improvement = ((metrics['best_score'] - heuristic_score) / abs(heuristic_score) * 100) \
                        if heuristic_score != 0 else 0

                    row = {
                        'scenario': scenario_key,
                        'solver': solver_name,
                        'solver_key': solver_key,
                        'run': run_idx + 1,
                        'heuristic_score': round(heuristic_score, 4),
                        'best_score': metrics['best_score'],
                        'improvement_pct': round(improvement, 4),
                        'convergence_iter': metrics['convergence_iter'],
                        'wall_clock_sec': metrics['wall_clock_sec'],
                        'constraint_violations': metrics['constraint_violations'],
                        'space_utilization_pct': metrics['space_utilization_pct'],
                        'products_placed': metrics['products_placed'],
                        'product_coverage_pct': metrics['product_coverage_pct'],
                    }
                    all_results.append(row)
                    convergence_data[scenario_key][solver_key].append(metrics.get('convergence_history', []))

                    if (run_idx + 1) % 10 == 0 or run_idx == 0:
                        logger.info(f"    Run {run_idx + 1}/{n_runs}: Score={metrics['best_score']:.2f}, "
                                    f"Time={metrics['wall_clock_sec']:.2f}s "
                                    f"[{experiment_counter}/{total_experiments}]")

                except Exception as e:
                    logger.error(f"    Run {run_idx + 1} FAILED: {e}")
                    all_results.append({
                        'scenario': scenario_key, 'solver': solver_name,
                        'solver_key': solver_key, 'run': run_idx + 1,
                        'heuristic_score': round(heuristic_score, 4),
                        'best_score': 0, 'improvement_pct': 0,
                        'convergence_iter': 0, 'wall_clock_sec': 0,
                        'constraint_violations': -1, 'space_utilization_pct': 0,
                        'products_placed': 0, 'product_coverage_pct': 0,
                    })

    # Save raw results
    df_raw = pd.DataFrame(all_results)
    raw_path = os.path.join(args.output, 'benchmark_raw_results.csv')
    df_raw.to_csv(raw_path, index=False)
    logger.info(f"\nRaw results saved: {raw_path} ({len(df_raw)} rows)")

    # Generate summary and analysis
    if len(df_raw) > 0:
        from benchmark.analysis import generate_full_analysis
        generate_full_analysis(df_raw, convergence_data, args.output)

    logger.info(f"\nBenchmark complete! All outputs saved to: {args.output}/")


if __name__ == '__main__':
    main()
