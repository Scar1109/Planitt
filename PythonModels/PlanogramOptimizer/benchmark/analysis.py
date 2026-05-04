"""
Statistical Analysis & Visualization for Benchmark Results.

Generates:
  - benchmark_summary.csv        — Mean ± Std per solver per scenario
  - benchmark_ranking.csv        — Friedman rank + Wilcoxon p-values
  - best_solver_report.txt       — Declares winner with evidence
  - convergence_curves.png       — Convergence comparison
  - boxplots.png                 — Score distribution comparison
  - radar_chart.png              — Multi-criteria radar
  - heatmap.png                  — Solver × Scenario performance

References:
  Derrac et al. (2011). Non-parametric statistical tests for metaheuristic comparison.
"""
import os
import numpy as np
import pandas as pd
import logging
from itertools import combinations

logger = logging.getLogger(__name__)

# Try importing visualization libs (optional for headless servers)
try:
    import matplotlib
    matplotlib.use('Agg')  # Non-interactive backend
    import matplotlib.pyplot as plt
    import seaborn as sns
    HAS_PLOTTING = True
except ImportError:
    HAS_PLOTTING = False
    logger.warning("matplotlib/seaborn not installed — plots will be skipped")

try:
    from scipy import stats
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False
    logger.warning("scipy not installed — statistical tests will be skipped")


def generate_full_analysis(df_raw, convergence_data, output_dir):
    """
    Generate complete analysis from benchmark raw results.

    Args:
        df_raw: DataFrame with columns [scenario, solver, run, best_score, ...]
        convergence_data: dict of scenario -> solver -> list of convergence histories
        output_dir: directory to save outputs
    """
    os.makedirs(output_dir, exist_ok=True)

    logger.info("\n" + "=" * 50)
    logger.info("GENERATING ANALYSIS")
    logger.info("=" * 50)

    # 1. Summary Statistics
    summary = generate_summary(df_raw, output_dir)

    # 2. Statistical Tests
    rankings = None
    if HAS_SCIPY:
        rankings = generate_statistical_tests(df_raw, output_dir)

    # 3. Best Solver Report
    generate_best_solver_report(df_raw, summary, rankings, output_dir)

    # 4. Plots
    if HAS_PLOTTING:
        generate_boxplots(df_raw, output_dir)
        generate_heatmap(df_raw, output_dir)
        generate_convergence_plots(convergence_data, output_dir)
        generate_radar_chart(df_raw, output_dir)
    else:
        logger.info("Skipping plots (matplotlib not available)")

    logger.info("Analysis complete!")


def generate_summary(df_raw, output_dir):
    """Generate benchmark_summary.csv with descriptive statistics."""
    metrics = ['best_score', 'improvement_pct', 'wall_clock_sec', 'convergence_iter',
               'constraint_violations', 'space_utilization_pct', 'product_coverage_pct']

    summary_rows = []
    for (scenario, solver), group in df_raw.groupby(['scenario', 'solver']):
        row = {'scenario': scenario, 'solver': solver, 'n_runs': len(group)}
        for m in metrics:
            if m in group.columns:
                vals = group[m].dropna()
                row[f'{m}_mean'] = round(vals.mean(), 4)
                row[f'{m}_std'] = round(vals.std(), 4)
                row[f'{m}_min'] = round(vals.min(), 4)
                row[f'{m}_max'] = round(vals.max(), 4)
                row[f'{m}_median'] = round(vals.median(), 4)
        summary_rows.append(row)

    df_summary = pd.DataFrame(summary_rows)
    path = os.path.join(output_dir, 'benchmark_summary.csv')
    df_summary.to_csv(path, index=False)
    logger.info(f"Summary saved: {path}")

    # Print to console
    print("\n" + "=" * 80)
    print("BENCHMARK SUMMARY")
    print("=" * 80)
    for scenario in df_raw['scenario'].unique():
        print(f"\n--- {scenario.upper()} ---")
        mask = df_summary['scenario'] == scenario
        cols = ['solver', 'best_score_mean', 'best_score_std', 'improvement_pct_mean',
                'wall_clock_sec_mean', 'constraint_violations_mean', 'space_utilization_pct_mean']
        available_cols = [c for c in cols if c in df_summary.columns]
        print(df_summary[mask][available_cols].to_string(index=False))

    return df_summary


def generate_statistical_tests(df_raw, output_dir):
    """Generate benchmark_ranking.csv with Wilcoxon + Friedman tests."""
    results = []
    scenarios = df_raw['scenario'].unique()
    solver_keys = df_raw['solver_key'].unique()
    solver_names = df_raw['solver'].unique()

    for scenario in scenarios:
        sc_data = df_raw[df_raw['scenario'] == scenario]
        solver_scores = {}
        for solver in solver_keys:
            scores = sc_data[sc_data['solver_key'] == solver]['best_score'].values
            if len(scores) > 0:
                solver_scores[solver] = scores

        # Pairwise Wilcoxon
        pairs = list(combinations(solver_scores.keys(), 2))
        for s1, s2 in pairs:
            if len(solver_scores[s1]) < 5 or len(solver_scores[s2]) < 5:
                continue
            min_len = min(len(solver_scores[s1]), len(solver_scores[s2]))
            try:
                stat, p_val = stats.wilcoxon(
                    solver_scores[s1][:min_len],
                    solver_scores[s2][:min_len],
                    alternative='two-sided'
                )
                results.append({
                    'scenario': scenario, 'test': 'Wilcoxon',
                    'solver_1': s1, 'solver_2': s2,
                    'statistic': round(stat, 4), 'p_value': round(p_val, 6),
                    'significant_005': p_val < 0.05,
                    'significant_001': p_val < 0.01
                })
            except Exception as e:
                logger.warning(f"Wilcoxon failed for {s1} vs {s2}: {e}")

        # Friedman test (all solvers at once)
        if len(solver_scores) >= 3:
            aligned = []
            min_n = min(len(v) for v in solver_scores.values())
            for solver in sorted(solver_scores.keys()):
                aligned.append(solver_scores[solver][:min_n])
            try:
                stat, p_val = stats.friedmanchisquare(*aligned)
                results.append({
                    'scenario': scenario, 'test': 'Friedman',
                    'solver_1': 'ALL', 'solver_2': 'ALL',
                    'statistic': round(stat, 4), 'p_value': round(p_val, 6),
                    'significant_005': p_val < 0.05,
                    'significant_001': p_val < 0.01
                })
            except Exception as e:
                logger.warning(f"Friedman failed: {e}")

    df_tests = pd.DataFrame(results)
    path = os.path.join(output_dir, 'benchmark_ranking.csv')
    df_tests.to_csv(path, index=False)
    logger.info(f"Statistical tests saved: {path}")

    # Print significant results
    if len(df_tests) > 0:
        print("\n" + "=" * 80)
        print("STATISTICAL SIGNIFICANCE (p < 0.05)")
        print("=" * 80)
        sig = df_tests[df_tests['significant_005'] == True]
        if len(sig) > 0:
            print(sig[['scenario', 'test', 'solver_1', 'solver_2', 'p_value']].to_string(index=False))
        else:
            print("No statistically significant differences found.")

    return df_tests


def generate_best_solver_report(df_raw, df_summary, df_tests, output_dir):
    """Generate best_solver_report.txt."""
    lines = []
    lines.append("=" * 70)
    lines.append("BEST SOLVER REPORT")
    lines.append(f"Generated: {pd.Timestamp.now().isoformat()}")
    lines.append("=" * 70)

    # Overall best: highest mean score across all scenarios
    overall_ranking = df_summary.groupby('solver')['best_score_mean'].mean().sort_values(ascending=False)

    lines.append("\nOVERALL RANKING (Mean Score across all scenarios):")
    lines.append("-" * 50)
    for rank, (solver, score) in enumerate(overall_ranking.items(), 1):
        marker = " * BEST" if rank == 1 else ""
        lines.append(f"  {rank}. {solver}: {score:.4f}{marker}")

    best_solver = overall_ranking.index[0]
    best_solver_key = df_raw[df_raw['solver'] == best_solver]['solver_key'].iloc[0] \
        if len(df_raw[df_raw['solver'] == best_solver]) > 0 else 'unknown'

    lines.append(f"\n{'=' * 70}")
    lines.append(f"RECOMMENDED SOLVER: {best_solver} (key: {best_solver_key})")
    lines.append(f"{'=' * 70}")

    # Per-scenario winners
    lines.append("\nPER-SCENARIO WINNERS:")
    lines.append("-" * 50)
    for scenario in df_raw['scenario'].unique():
        sc_mask = df_summary['scenario'] == scenario
        sc_data = df_summary[sc_mask].sort_values('best_score_mean', ascending=False)
        if len(sc_data) > 0:
            winner = sc_data.iloc[0]
            lines.append(f"  {scenario}: {winner['solver']} "
                          f"(Mean={winner['best_score_mean']:.4f} +/- {winner['best_score_std']:.4f})")

    # Write
    report = "\n".join(lines)
    path = os.path.join(output_dir, 'best_solver_report.txt')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(report)
    logger.info(f"Best solver report saved: {path}")
    print(f"\n{report}")

    # Also save best solver key for Phase 2
    key_path = os.path.join(output_dir, 'best_solver_key.txt')
    with open(key_path, 'w') as f:
        f.write(best_solver_key)


def generate_boxplots(df_raw, output_dir):
    """Generate boxplots.png — score distributions per solver."""
    scenarios = df_raw['scenario'].unique()
    n_sc = len(scenarios)

    fig, axes = plt.subplots(1, n_sc, figsize=(7 * n_sc, 6), squeeze=False)
    fig.suptitle('Objective Score Distribution by Solver', fontsize=16, fontweight='bold')

    for idx, scenario in enumerate(scenarios):
        ax = axes[0][idx]
        sc_data = df_raw[df_raw['scenario'] == scenario]
        sns.boxplot(data=sc_data, x='solver', y='best_score', ax=ax, palette='viridis')
        ax.set_title(f'{scenario.capitalize()} Scenario', fontsize=13)
        ax.set_xlabel('Solver', fontsize=11)
        ax.set_ylabel('Best Score', fontsize=11)
        ax.tick_params(axis='x', rotation=45)

    plt.tight_layout()
    path = os.path.join(output_dir, 'boxplots.png')
    plt.savefig(path, dpi=300, bbox_inches='tight')
    plt.close()
    logger.info(f"Boxplots saved: {path}")


def generate_heatmap(df_raw, output_dir):
    """Generate heatmap.png — Solver × Scenario performance matrix."""
    pivot = df_raw.groupby(['scenario', 'solver'])['best_score'].mean().unstack(fill_value=0)

    fig, ax = plt.subplots(figsize=(12, 5))
    sns.heatmap(pivot, annot=True, fmt='.2f', cmap='YlOrRd', ax=ax, linewidths=0.5)
    ax.set_title('Mean Best Score: Solver × Scenario', fontsize=14, fontweight='bold')
    ax.set_xlabel('Solver', fontsize=12)
    ax.set_ylabel('Scenario', fontsize=12)

    plt.tight_layout()
    path = os.path.join(output_dir, 'heatmap.png')
    plt.savefig(path, dpi=300, bbox_inches='tight')
    plt.close()
    logger.info(f"Heatmap saved: {path}")


def generate_convergence_plots(convergence_data, output_dir):
    """Generate convergence_curves.png — all solvers overlaid per scenario."""
    scenarios = list(convergence_data.keys())
    if not scenarios:
        return

    n_sc = len(scenarios)
    fig, axes = plt.subplots(1, n_sc, figsize=(7 * n_sc, 5), squeeze=False)
    fig.suptitle('Convergence Curves by Solver', fontsize=16, fontweight='bold')

    solver_colors = {
        'sa': '#e74c3c', 'tabu_search': '#e67e22', 'ga': '#2ecc71',
        'pso': '#3498db', 'gwo': '#9b59b6', 'woa': '#1abc9c', 'de': '#f39c12'
    }

    for idx, scenario in enumerate(scenarios):
        ax = axes[0][idx]
        for solver_key, runs_convergence in convergence_data[scenario].items():
            if not runs_convergence:
                continue
            # Average convergence across runs
            all_iters = set()
            for run_conv in runs_convergence:
                for point in run_conv:
                    all_iters.add(point.get('iteration', 0))
            all_iters = sorted(all_iters)

            if not all_iters:
                continue

            avg_scores = []
            for it in all_iters:
                scores_at_it = []
                for run_conv in runs_convergence:
                    # Find closest point
                    closest = None
                    for point in run_conv:
                        if point.get('iteration', 0) <= it:
                            closest = point
                    if closest:
                        scores_at_it.append(closest.get('score', 0))
                if scores_at_it:
                    avg_scores.append(np.mean(scores_at_it))
                else:
                    avg_scores.append(0)

            color = solver_colors.get(solver_key, '#333333')
            ax.plot(all_iters[:len(avg_scores)], avg_scores, label=solver_key.upper(),
                    color=color, linewidth=1.5)

        ax.set_title(f'{scenario.capitalize()} Scenario', fontsize=13)
        ax.set_xlabel('Evaluations', fontsize=11)
        ax.set_ylabel('Best Score', fontsize=11)
        ax.legend(fontsize=8)
        ax.grid(True, alpha=0.3)

    plt.tight_layout()
    path = os.path.join(output_dir, 'convergence_curves.png')
    plt.savefig(path, dpi=300, bbox_inches='tight')
    plt.close()
    logger.info(f"Convergence curves saved: {path}")


def generate_radar_chart(df_raw, output_dir):
    """Generate radar_chart.png — multi-criteria comparison."""
    # Aggregate metrics per solver (across all scenarios)
    metrics_to_plot = ['best_score', 'improvement_pct', 'space_utilization_pct',
                       'product_coverage_pct']
    # Invert these (lower is better)
    invert_metrics = ['wall_clock_sec', 'constraint_violations']

    agg = df_raw.groupby('solver_key').agg({
        'best_score': 'mean',
        'improvement_pct': 'mean',
        'wall_clock_sec': 'mean',
        'constraint_violations': 'mean',
        'space_utilization_pct': 'mean',
        'product_coverage_pct': 'mean',
    })

    if len(agg) < 2:
        return

    # Normalize all to 0-1 range
    norm = agg.copy()
    for col in norm.columns:
        cmin, cmax = norm[col].min(), norm[col].max()
        if cmax > cmin:
            if col in invert_metrics:
                norm[col] = 1 - (norm[col] - cmin) / (cmax - cmin)
            else:
                norm[col] = (norm[col] - cmin) / (cmax - cmin)
        else:
            norm[col] = 1.0

    categories = list(norm.columns)
    n_cats = len(categories)
    angles = [n / float(n_cats) * 2 * np.pi for n in range(n_cats)]
    angles += angles[:1]

    fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))

    solver_colors = {
        'sa': '#e74c3c', 'tabu_search': '#e67e22', 'ga': '#2ecc71',
        'pso': '#3498db', 'gwo': '#9b59b6', 'woa': '#1abc9c', 'de': '#f39c12'
    }

    for solver_key in norm.index:
        values = norm.loc[solver_key].values.flatten().tolist()
        values += values[:1]
        color = solver_colors.get(solver_key, '#333333')
        ax.plot(angles, values, linewidth=2, linestyle='solid', label=solver_key.upper(), color=color)
        ax.fill(angles, values, alpha=0.1, color=color)

    ax.set_xticks(angles[:-1])
    ax.set_xticklabels([c.replace('_', '\n') for c in categories], fontsize=9)
    ax.set_title('Multi-Criteria Solver Comparison', fontsize=14, fontweight='bold', pad=20)
    ax.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1), fontsize=9)

    plt.tight_layout()
    path = os.path.join(output_dir, 'radar_chart.png')
    plt.savefig(path, dpi=300, bbox_inches='tight')
    plt.close()
    logger.info(f"Radar chart saved: {path}")
