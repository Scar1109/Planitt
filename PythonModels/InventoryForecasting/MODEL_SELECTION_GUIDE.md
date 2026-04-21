# Inventory Forecasting Model Selection Guide

## Purpose

This module now supports comparative model selection for demand forecasting instead of relying on a single forecasting algorithm and a single missing-value assumption.

The objective is to produce evidence for:

- how missing values are handled
- which forecasting algorithm performs best
- why the selected production model is justified

## What Is Compared

The benchmarking pipeline compares:

- Missing-value strategies:
  - `constant_defaults`
  - `median`
  - `forward_fill_median`
- Forecasting models:
  - `seasonal_naive`
  - `ridge_regression`
  - `random_forest`
  - `hist_gradient_boosting`
  - `xgboost` if installed
  - `lightgbm` if installed

## Validation Approach

The comparison uses expanding-window time-series validation.

This is important because random train/test splitting is not appropriate for forecasting tasks. Time-based validation ensures the model is always validated on future periods, which is closer to real-world forecasting usage.

## Leakage Fix

The new benchmark pipeline builds lag features using shifted sales history. This prevents current-day sales from leaking into the predictors.

## Selection Rule

The winning configuration is selected using:

1. lowest `sMAPE`
2. lowest `RMSE`
3. lowest `MAE`
4. lower fit time as a final tie-breaker

## Output Files

Running the benchmark creates:

- `models/demand_forecast_model.pkl`
- `models/demand_metrics.pkl`
- `models/demand_feature_cols.pkl`
- `models/feature_importance.csv`
- `comparison_results/demand_model_benchmark_results.csv`
- `comparison_results/demand_model_benchmark_summary.csv`
- `comparison_results/best_demand_model_summary.json`
- `comparison_results/MODEL_COMPARISON_REPORT.md`

## How To Run

```bash
python PythonModels/InventoryForecasting/benchmark_models.py
```

Optional quick smoke test:

```bash
python PythonModels/InventoryForecasting/benchmark_models.py --folds 3 --max-samples 20000
```

## How To Write The Report Conclusion

Use the generated summary table and state:

- the compared missing-value strategies
- the compared forecasting models
- the validation method
- the best-performing configuration
- the metrics that justified the final choice

Example conclusion template:

> A comparative evaluation was conducted using multiple imputation strategies and forecasting algorithms under time-based validation. The selected model achieved the best overall forecasting accuracy based on sMAPE, RMSE, and MAE, and was therefore chosen as the production forecasting approach.
