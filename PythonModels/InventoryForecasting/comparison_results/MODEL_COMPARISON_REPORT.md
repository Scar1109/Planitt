# Demand Model Comparison Report

Generated at: 2026-04-21 11:47:02

## Methodology

- Same engineered feature set used for every experiment.
- Missing values compared with `constant_defaults`, `median`, and `forward_fill_median`.
- Validation used expanding-window time series splits with 2 folds.
- Final selection prioritized lowest sMAPE, then RMSE, then MAE.

## Top Ranked Configurations

| Rank | Imputation | Model | MAE | RMSE | MAPE | sMAPE | Avg Fit Time (s) |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | forward_fill_median | random_forest | 5.076 | 7.724 | 29.666 | 27.369 | 0.811 |
| 2 | constant_defaults | random_forest | 5.076 | 7.724 | 29.666 | 27.369 | 0.941 |
| 3 | median | random_forest | 5.076 | 7.724 | 29.666 | 27.369 | 0.951 |
| 4 | median | hist_gradient_boosting | 5.278 | 8.058 | 30.587 | 27.980 | 0.172 |
| 5 | forward_fill_median | hist_gradient_boosting | 5.278 | 8.058 | 30.587 | 27.980 | 0.173 |
| 6 | constant_defaults | hist_gradient_boosting | 5.278 | 8.058 | 30.587 | 27.980 | 0.210 |
| 7 | forward_fill_median | xgboost | 5.244 | 7.971 | 30.167 | 28.378 | 0.530 |
| 8 | median | xgboost | 5.244 | 7.971 | 30.167 | 28.378 | 0.561 |

## Selected Production Approach

- Imputation strategy: `forward_fill_median`
- Forecasting model: `random_forest`
- Average MAE: `5.076`
- Average RMSE: `7.724`
- Average MAPE: `29.666`
- Average sMAPE: `27.369`

## Conclusion

The selected approach was `forward_fill_median` with `random_forest` because it delivered the best time-based validation accuracy among all tested combinations.
This gives evidence for model selection instead of relying on a single algorithm or a single missing-value assumption.
