"""
Surrogate Benchmark — Phase 2: Compare SAEO (Method C) vs pure metaheuristics.

Reads the best solver from Phase 1 results, runs SAEO with that solver,
and compares against all pure methods.

Outputs:
  results/surrogate_comparison.csv — Method C vs all pure methods
  results/surrogate_convergence.png — Evaluation-efficiency comparison

Usage:
  python -m benchmark.surrogate_benchmark --runs 30 --output ./results
"""
import os
import sys
import json
import time
import logging
import argparse
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.model_based import ModelBasedRanker
from app.heuristics import HeuristicOptimizer
from app.optimizer import SimulatedAnnealingOptimizer
from benchmark.surrogate_optimizer import SurrogateOptimizer

logging.basicConfig(level=logging.WARNING, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
logging.getLogger('mealpy').setLevel(logging.WARNING)


def main():
    parser = argparse.ArgumentParser(description='Phase 2: Surrogate-Assisted Benchmark')
    parser.add_argument('--runs', type=int, default=30, help='Number of runs')
    parser.add_argument('--output', type=str, default='./results', help='Output dir (should match Phase 1)')
    parser.add_argument('--scenarios', type=str, default='all', help='small,medium,large or all')
    parser.add_argument('--best-solver', type=str, default=None,
                        help='Override best solver key (default: read from Phase 1)')
    parser.add_argument('--n-initial', type=int, default=50, help='Initial LHS samples')
    parser.add_argument('--max-evals', type=int, default=200, help='Max real evaluations for SAEO')
    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)

    # Determine best solver from Phase 1
    best_solver_key = args.best_solver
    if not best_solver_key:
        key_path = os.path.join(args.output, 'best_solver_key.txt')
        if os.path.exists(key_path):
            with open(key_path, 'r') as f:
                best_solver_key = f.read().strip()
            logger.info(f"Best solver from Phase 1: {best_solver_key}")
        else:
            best_solver_key = 'de'
            logger.warning(f"No Phase 1 results found, defaulting to: {best_solver_key}")

    # Load scenarios
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
    scenario_files = {
        'small': os.path.join(data_dir, 'small_scenario.json'),
        'medium': os.path.join(data_dir, 'medium_scenario.json'),
        'large': os.path.join(data_dir, 'large_scenario.json'),
    }

    if args.scenarios == 'all':
        scenarios_to_run = [k for k, v in scenario_files.items() if os.path.exists(v)]
    else:
        scenarios_to_run = [s.strip() for s in args.scenarios.split(',')]

    # Load Phase 1 raw results for comparison
    phase1_path = os.path.join(args.output, 'benchmark_raw_results.csv')
    df_phase1 = None
    if os.path.exists(phase1_path):
        df_phase1 = pd.read_csv(phase1_path)
        logger.info(f"Loaded Phase 1 results: {len(df_phase1)} rows")

    config = {
        'runType': 'hybrid',
        'objectiveWeights': {'sales': 0.5, 'margin': 0.3},
        'hyperparams': {'iterations': 3000, 'coolingRate': 0.995, 'pop_size': 50}
    }

    all_results = []

    for scenario_key in scenarios_to_run:
        scenario_path = scenario_files.get(scenario_key)
        if not scenario_path or not os.path.exists(scenario_path):
            continue

        logger.info(f"\n{'=' * 50}")
        logger.info(f"SAEO BENCHMARK: {scenario_key.upper()}")
        logger.info(f"{'=' * 50}")

        with open(scenario_path) as f:
            scenario = json.load(f)

        products = scenario['products']
        fixtures = scenario['fixtures']
        levels = scenario['levels']
        constraints = scenario.get('constraints', [])

        # Heuristic phase
        ranker = ModelBasedRanker()
        ranked_products = ranker.get_ranked_products(products, config)
        heuristic = HeuristicOptimizer()
        initial_placements, _, constraint_checker = heuristic.generate_layout(
            ranked_products, fixtures, levels, constraints=constraints
        )

        # Get heuristic baseline
        sa = SimulatedAnnealingOptimizer()
        from benchmark.benchmark_runner import _placements_to_state
        heuristic_score = sa._score_state(
            _placements_to_state(initial_placements, ranked_products, levels),
            {p['sku']: p for p in ranked_products},
            constraint_checker
        )

        logger.info(f"Heuristic baseline: {heuristic_score:.2f}")

        for run_idx in range(args.runs):
            seed = 42 + run_idx

            try:
                saeo = SurrogateOptimizer(
                    surrogate_type='gp',
                    best_solver_key=best_solver_key
                )

                placements, score, convergence, elapsed, stats = saeo.optimize(
                    initial_placements, ranked_products, levels, config,
                    constraint_checker=constraint_checker,
                    seed=seed,
                    n_initial=args.n_initial,
                    max_real_evals=args.max_evals
                )

                improvement = ((score - heuristic_score) / abs(heuristic_score) * 100) \
                    if heuristic_score != 0 else 0

                row = {
                    'scenario': scenario_key,
                    'method': f'SAEO-{best_solver_key.upper()}',
                    'method_type': 'Surrogate-Assisted',
                    'run': run_idx + 1,
                    'heuristic_score': round(heuristic_score, 4),
                    'best_score': round(score, 4),
                    'improvement_pct': round(improvement, 4),
                    'wall_clock_sec': round(elapsed, 4),
                    'real_evaluations': stats['real_evaluations'],
                    'surrogate_r2_cv': stats['surrogate_r2_cv'],
                    'infill_cycles': stats['infill_cycles'],
                    'products_placed': len(set(p['sku'] for p in placements)),
                }
                all_results.append(row)

                if (run_idx + 1) % 10 == 0 or run_idx == 0:
                    logger.info(f"  Run {run_idx + 1}/{args.runs}: "
                                f"Score={score:.2f}, Evals={stats['real_evaluations']}, "
                                f"R²={stats['surrogate_r2_cv']:.3f}")

            except Exception as e:
                logger.error(f"  Run {run_idx + 1} FAILED: {e}")
                all_results.append({
                    'scenario': scenario_key,
                    'method': f'SAEO-{best_solver_key.upper()}',
                    'method_type': 'Surrogate-Assisted',
                    'run': run_idx + 1,
                    'heuristic_score': round(heuristic_score, 4),
                    'best_score': 0, 'improvement_pct': 0,
                    'wall_clock_sec': 0, 'real_evaluations': 0,
                    'surrogate_r2_cv': 0, 'infill_cycles': 0,
                    'products_placed': 0,
                })

    # Save SAEO results
    df_saeo = pd.DataFrame(all_results)
    saeo_path = os.path.join(args.output, 'surrogate_results.csv')
    df_saeo.to_csv(saeo_path, index=False)
    logger.info(f"\nSAEO results saved: {saeo_path}")

    # Build comparison table (SAEO vs all pure methods from Phase 1)
    if df_phase1 is not None:
        comparison_rows = []

        for scenario_key in scenarios_to_run:
            # Phase 1 results per solver
            p1_sc = df_phase1[df_phase1['scenario'] == scenario_key]
            for solver_key in p1_sc['solver_key'].unique():
                solver_data = p1_sc[p1_sc['solver_key'] == solver_key]
                solver_name = solver_data['solver'].iloc[0]
                comparison_rows.append({
                    'scenario': scenario_key,
                    'method': solver_name,
                    'method_type': 'Pure Metaheuristic',
                    'mean_score': round(solver_data['best_score'].mean(), 4),
                    'std_score': round(solver_data['best_score'].std(), 4),
                    'mean_improvement_pct': round(solver_data['improvement_pct'].mean(), 4),
                    'mean_time_sec': round(solver_data['wall_clock_sec'].mean(), 4),
                    'real_evaluations': 3000,
                    'n_runs': len(solver_data),
                })

            # SAEO results
            saeo_sc = df_saeo[df_saeo['scenario'] == scenario_key]
            if len(saeo_sc) > 0:
                comparison_rows.append({
                    'scenario': scenario_key,
                    'method': f'SAEO-{best_solver_key.upper()}',
                    'method_type': 'Surrogate-Assisted',
                    'mean_score': round(saeo_sc['best_score'].mean(), 4),
                    'std_score': round(saeo_sc['best_score'].std(), 4),
                    'mean_improvement_pct': round(saeo_sc['improvement_pct'].mean(), 4),
                    'mean_time_sec': round(saeo_sc['wall_clock_sec'].mean(), 4),
                    'real_evaluations': int(saeo_sc['real_evaluations'].mean()),
                    'n_runs': len(saeo_sc),
                })

        df_comparison = pd.DataFrame(comparison_rows)
        comp_path = os.path.join(args.output, 'surrogate_comparison.csv')
        df_comparison.to_csv(comp_path, index=False)
        logger.info(f"Comparison table saved: {comp_path}")

        # Print comparison
        print("\n" + "=" * 90)
        print("SURROGATE vs PURE METAHEURISTIC COMPARISON")
        print("=" * 90)
        for scenario in df_comparison['scenario'].unique():
            print(f"\n--- {scenario.upper()} ---")
            sc = df_comparison[df_comparison['scenario'] == scenario]
            print(sc[['method', 'method_type', 'mean_score', 'std_score',
                       'real_evaluations', 'mean_time_sec']].to_string(index=False))

        # Key finding
        print("\n" + "=" * 90)
        print("KEY FINDING:")
        pure_best = df_comparison[df_comparison['method_type'] == 'Pure Metaheuristic']['mean_score'].max()
        saeo_best = df_comparison[df_comparison['method_type'] == 'Surrogate-Assisted']['mean_score'].max()
        saeo_evals = df_comparison[df_comparison['method_type'] == 'Surrogate-Assisted']['real_evaluations'].iloc[0] \
            if len(df_comparison[df_comparison['method_type'] == 'Surrogate-Assisted']) > 0 else 0
        print(f"  Pure Metaheuristic best mean score: {pure_best:.4f} (3000 evals)")
        print(f"  SAEO best mean score:               {saeo_best:.4f} ({saeo_evals} evals)")
        eval_ratio = 3000 / saeo_evals if saeo_evals > 0 else 0
        print(f"  Evaluation efficiency:              {eval_ratio:.1f}x fewer real evaluations")
        print("=" * 90)

    else:
        logger.warning("No Phase 1 results found. Run benchmark_runner.py first.")

    logger.info("Phase 2 complete!")


if __name__ == '__main__':
    main()
