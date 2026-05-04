"""
Demand-model benchmarking and selection pipeline for InventoryForecasting.

This script compares multiple missing-value strategies and forecasting models
using time-based validation, then saves the best demand model under the same
artifact filenames used by the ML API.

Usage:
    python benchmark_models.py
    python benchmark_models.py --folds 3 --max-samples 20000
"""

import argparse
import json
import logging
import os
import pickle
import time
from datetime import datetime
from pathlib import Path

os.environ.setdefault("LOKY_MAX_CPU_COUNT", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, RegressorMixin, clone
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, StandardScaler

try:
    from xgboost import XGBRegressor
except Exception:
    XGBRegressor = None

try:
    from lightgbm import LGBMRegressor
except Exception:
    LGBMRegressor = None

from train_models import (
    MODELS_DIR,
    COMPARISON_DIR,
    load_all_data,
    prepare_waste_features,
    train_waste_model,
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RollingAverageBaselineRegressor(BaseEstimator, RegressorMixin):
    """Simple baseline that predicts from a rolling-average feature."""

    def __init__(self, source_column='sales7dayavg'):
        self.source_column = source_column
        self.fallback_value_ = 0.0

    def fit(self, X, y):
        self.fallback_value_ = float(np.nanmean(y)) if len(y) else 0.0
        return self

    def predict(self, X):
        if hasattr(X, 'columns') and self.source_column in X.columns:
            values = pd.to_numeric(X[self.source_column], errors='coerce').fillna(self.fallback_value_)
            return np.clip(values.to_numpy(dtype=float), 0, None)
        return np.full(shape=len(X), fill_value=self.fallback_value_, dtype=float)


def calculate_regression_metrics(y_true, y_pred):
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)

    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))

    numerator = np.abs(y_true - y_pred)
    denominator = np.abs(y_true) + np.abs(y_pred) + 1e-8
    smape = 100 * np.mean(2 * numerator / denominator)

    mask = y_true > 1
    if mask.sum() > 0:
        mape = min(100, np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)
    else:
        mape = smape

    return {
        'mae': float(mae),
        'rmse': float(rmse),
        'mape': float(mape),
        'smape': float(smape),
    }


def get_default_fill_values(feature_cols):
    defaults = {
        'promotionflag': 0.0,
        'unitpricelkr': 0.0,
        'avgtemperaturec': 28.0,
        'rainfallmm': 0.0,
        'humiditypercent': 75.0,
        'israiny': 0.0,
        'isheavyrain': 0.0,
        'isdryday': 1.0,
        'temphot': 0.0,
        'tempcool': 0.0,
        'tempmoderate': 1.0,
        'highhumidity': 0.0,
        'rainfall7dayavg': 0.0,
        'sales7dayavg': 0.0,
        'sales14dayavg': 0.0,
        'sales30dayavg': 0.0,
        'sales7daystd': 0.0,
        'dayofweek_avg': 0.0,
        'category_encoded': 0.0,
        'sku_encoded': 0.0,
    }
    return {col: defaults.get(col, 0.0) for col in feature_cols}


def build_time_series_folds(demand_df, n_splits=3):
    unique_dates = np.array(sorted(demand_df['date'].dropna().unique()))
    if len(unique_dates) < n_splits + 1:
        raise ValueError(
            f"Not enough unique dates ({len(unique_dates)}) for {n_splits} time-series splits."
        )

    folds = []
    splitter = TimeSeriesSplit(n_splits=n_splits)
    for fold_number, (train_date_idx, valid_date_idx) in enumerate(splitter.split(unique_dates), start=1):
        train_dates = set(unique_dates[train_date_idx])
        valid_dates = set(unique_dates[valid_date_idx])
        train_indices = demand_df.index[demand_df['date'].isin(train_dates)].to_numpy()
        valid_indices = demand_df.index[demand_df['date'].isin(valid_dates)].to_numpy()
        if len(train_indices) and len(valid_indices):
            folds.append((fold_number, train_indices, valid_indices))

    if not folds:
        raise ValueError("Unable to build non-empty time-series folds.")
    return folds


def forward_fill_with_context(train_df, valid_df, columns):
    train_features = train_df[columns].copy()
    valid_features = valid_df[columns].copy()

    if not columns:
        return train_features, valid_features

    train_context = train_df[['sku', 'date'] + columns].copy()
    train_context['__segment'] = 'train'
    valid_context = valid_df[['sku', 'date'] + columns].copy()
    valid_context['__segment'] = 'valid'

    combined = pd.concat([train_context, valid_context], ignore_index=False)
    combined = combined.sort_values(['sku', 'date'])
    combined[columns] = combined.groupby('sku')[columns].ffill()
    combined = combined.sort_index()

    train_filled = combined.loc[combined['__segment'] == 'train', columns]
    valid_filled = combined.loc[combined['__segment'] == 'valid', columns]

    train_features.loc[train_filled.index, columns] = train_filled
    valid_features.loc[valid_filled.index, columns] = valid_filled

    return train_features, valid_features


def apply_missing_value_strategy(train_df, valid_df, feature_cols, strategy_name):
    train_features = train_df[feature_cols].copy()
    valid_features = valid_df[feature_cols].copy()

    if strategy_name == 'constant_defaults':
        fill_values = get_default_fill_values(feature_cols)
        return train_features.fillna(fill_values), valid_features.fillna(fill_values)

    if strategy_name == 'median':
        imputer = SimpleImputer(strategy='median')
        train_imputed = pd.DataFrame(
            imputer.fit_transform(train_features),
            columns=feature_cols,
            index=train_features.index,
        )
        valid_imputed = pd.DataFrame(
            imputer.transform(valid_features),
            columns=feature_cols,
            index=valid_features.index,
        )
        return train_imputed, valid_imputed

    if strategy_name == 'forward_fill_median':
        columns_to_ffill = [
            col for col in [
                'unitpricelkr', 'avgtemperaturec', 'rainfallmm', 'humiditypercent',
                'rainfall7dayavg', 'sales7dayavg', 'sales14dayavg',
                'sales30dayavg', 'sales7daystd', 'dayofweek_avg'
            ]
            if col in feature_cols
        ]
        train_ffill_subset, valid_ffill_subset = forward_fill_with_context(train_df, valid_df, columns_to_ffill)
        train_ffill = train_features.copy()
        valid_ffill = valid_features.copy()
        train_ffill.loc[train_ffill_subset.index, columns_to_ffill] = train_ffill_subset
        valid_ffill.loc[valid_ffill_subset.index, columns_to_ffill] = valid_ffill_subset
        imputer = SimpleImputer(strategy='median')
        train_imputed = pd.DataFrame(
            imputer.fit_transform(train_ffill),
            columns=feature_cols,
            index=train_ffill.index,
        )
        valid_imputed = pd.DataFrame(
            imputer.transform(valid_ffill),
            columns=feature_cols,
            index=valid_ffill.index,
        )
        return train_imputed, valid_imputed

    raise ValueError(f"Unsupported missing value strategy: {strategy_name}")


def transform_full_feature_set(demand_df, feature_cols, strategy_name):
    features = demand_df[feature_cols].copy()

    if strategy_name == 'constant_defaults':
        return features.fillna(get_default_fill_values(feature_cols))

    if strategy_name == 'median':
        imputer = SimpleImputer(strategy='median')
        return pd.DataFrame(
            imputer.fit_transform(features),
            columns=feature_cols,
            index=features.index,
        )

    if strategy_name == 'forward_fill_median':
        columns_to_ffill = [
            col for col in [
                'unitpricelkr', 'avgtemperaturec', 'rainfallmm', 'humiditypercent',
                'rainfall7dayavg', 'sales7dayavg', 'sales14dayavg',
                'sales30dayavg', 'sales7daystd', 'dayofweek_avg'
            ]
            if col in feature_cols
        ]
        full_context = demand_df[['sku', 'date'] + columns_to_ffill].copy()
        full_context = full_context.sort_values(['sku', 'date'])
        full_context[columns_to_ffill] = full_context.groupby('sku')[columns_to_ffill].ffill()
        full_context = full_context.sort_index()
        features.loc[full_context.index, columns_to_ffill] = full_context[columns_to_ffill]
        imputer = SimpleImputer(strategy='median')
        return pd.DataFrame(
            imputer.fit_transform(features),
            columns=feature_cols,
            index=features.index,
        )

    raise ValueError(f"Unsupported missing value strategy: {strategy_name}")


def get_candidate_models():
    models = {
        'seasonal_naive': RollingAverageBaselineRegressor(source_column='sales7dayavg'),
        'ridge_regression': Pipeline([
            ('scaler', StandardScaler()),
            ('ridge', Ridge(alpha=1.0)),
        ]),
        'random_forest': RandomForestRegressor(
            n_estimators=180,
            max_depth=14,
            min_samples_split=8,
            min_samples_leaf=3,
            random_state=42,
            n_jobs=1,
        ),
        'hist_gradient_boosting': HistGradientBoostingRegressor(
            max_iter=350,
            learning_rate=0.05,
            max_depth=7,
            max_leaf_nodes=31,
            early_stopping=True,
            validation_fraction=0.1,
            n_iter_no_change=20,
            random_state=42,
        ),
    }

    if XGBRegressor is not None:
        models['xgboost'] = XGBRegressor(
            objective='reg:squarederror',
            n_estimators=250,
            learning_rate=0.05,
            max_depth=7,
            subsample=0.85,
            colsample_bytree=0.85,
            reg_lambda=1.0,
            random_state=42,
            n_jobs=1,
        )

    if LGBMRegressor is not None:
        models['lightgbm'] = LGBMRegressor(
            objective='regression',
            n_estimators=250,
            learning_rate=0.05,
            max_depth=7,
            num_leaves=31,
            subsample=0.85,
            colsample_bytree=0.85,
            random_state=42,
            n_jobs=1,
            verbose=-1,
        )

    return models


def extract_feature_importance(model, feature_cols):
    fitted_model = model.steps[-1][1] if isinstance(model, Pipeline) else model

    importance_pairs = []
    if hasattr(fitted_model, 'feature_importances_'):
        importance_pairs = list(zip(feature_cols, fitted_model.feature_importances_))
    elif hasattr(fitted_model, 'coef_'):
        importance_pairs = list(zip(feature_cols, np.abs(np.ravel(fitted_model.coef_))))

    return sorted(importance_pairs, key=lambda item: item[1], reverse=True)


def summarize_feature_groups(importance_pairs):
    weather_features = {
        'avgtemperaturec', 'temphot', 'tempcool', 'tempmoderate',
        'rainfallmm', 'israiny', 'isheavyrain', 'isdryday',
        'rainfall7dayavg', 'humiditypercent', 'highhumidity'
    }
    cultural_features = {'ispoyaday', 'isnewyear', 'isves ak', 'isramadanperiod', 'ischristmasseason'}
    monsoon_features = {'isswmonsoon', 'isnemonsoon', 'isintermonsoon'}
    interaction_features = {
        'hotweather_beverage', 'hotweather_icecream',
        'rainyday_packagedgoods', 'poyaday_vegdemand', 'poyaday_meatdecline'
    }
    year_features = {'year', 'yeartrend', 'is2022crisis'}
    lag_features = {'sales7dayavg', 'sales14dayavg', 'sales30dayavg', 'sales7daystd', 'dayofweek_avg'}

    def category_total(feature_group):
        return float(sum(score for name, score in importance_pairs if name in feature_group))

    return {
        'weather_importance': category_total(weather_features),
        'cultural_importance': category_total(cultural_features),
        'monsoon_importance': category_total(monsoon_features),
        'interaction_importance': category_total(interaction_features),
        'year_importance': category_total(year_features),
        'lag_importance': category_total(lag_features),
    }


def prepare_demand_features(sales_df, weather_df, products_df):
    """Prepare leakage-safe features while preserving missing values for benchmarking."""
    if sales_df.empty:
        return None, None, None, None

    demand_df = sales_df.copy()
    demand_df['date'] = pd.to_datetime(demand_df['date'], errors='coerce')
    demand_df = demand_df.dropna(subset=['date'])

    if not weather_df.empty:
        weather_df = weather_df.copy()
        weather_df['date'] = pd.to_datetime(weather_df['date'], errors='coerce')
        demand_df = demand_df.merge(weather_df, on='date', how='left')

    if not products_df.empty:
        demand_df = demand_df.merge(
            products_df[['sku', 'category', 'typicalshelflifedays']],
            on='sku',
            how='left',
        )

    demand_df['unitssold'] = pd.to_numeric(demand_df['unitssold'], errors='coerce').fillna(0)
    demand_df = demand_df.sort_values(['sku', 'date']).reset_index(drop=True)

    demand_df['year'] = demand_df['date'].dt.year
    demand_df['dayofweek'] = demand_df['date'].dt.dayofweek
    demand_df['dayofmonth'] = demand_df['date'].dt.day
    demand_df['month'] = demand_df['date'].dt.month
    demand_df['quarter'] = demand_df['date'].dt.quarter
    demand_df['weekofyear'] = demand_df['date'].dt.isocalendar().week.astype(int)
    demand_df['dayofyear'] = demand_df['date'].dt.dayofyear
    demand_df['isweekend'] = (demand_df['dayofweek'] >= 5).astype(int)
    demand_df['ismonthend'] = (demand_df['dayofmonth'] >= 25).astype(int)
    demand_df['ismonthstart'] = (demand_df['dayofmonth'] <= 5).astype(int)

    demand_df['ispoyaday'] = ((demand_df['dayofmonth'] >= 14) & (demand_df['dayofmonth'] <= 16)).astype(int)
    demand_df['isnewyear'] = ((demand_df['month'] == 4) & (demand_df['dayofmonth'].between(13, 15))).astype(int)
    demand_df['isves ak'] = ((demand_df['month'] == 5) & (demand_df['dayofmonth'].between(14, 16))).astype(int)
    demand_df['isramadanperiod'] = (demand_df['month'].isin([3, 4, 5])).astype(int)
    demand_df['ischristmasseason'] = ((demand_df['month'] == 12) & (demand_df['dayofmonth'] >= 20)).astype(int)

    demand_df['isswmonsoon'] = (demand_df['month'].between(5, 9)).astype(int)
    demand_df['isnemonsoon'] = (demand_df['month'].isin([10, 11, 12, 1])).astype(int)
    demand_df['isintermonsoon'] = ((demand_df['isswmonsoon'] == 0) & (demand_df['isnemonsoon'] == 0)).astype(int)

    if 'avgtemperaturec' in demand_df.columns:
        demand_df['avgtemperaturec'] = pd.to_numeric(demand_df['avgtemperaturec'], errors='coerce')
        demand_df['temphot'] = (demand_df['avgtemperaturec'] > 30).astype(float)
        demand_df['tempcool'] = (demand_df['avgtemperaturec'] < 25).astype(float)
        demand_df['tempmoderate'] = (
            (demand_df['avgtemperaturec'] >= 25) & (demand_df['avgtemperaturec'] <= 30)
        ).astype(float)

    if 'rainfallmm' in demand_df.columns:
        demand_df['rainfallmm'] = pd.to_numeric(demand_df['rainfallmm'], errors='coerce')
        demand_df['israiny'] = (demand_df['rainfallmm'] > 2.5).astype(float)
        demand_df['isheavyrain'] = (demand_df['rainfallmm'] > 10).astype(float)
        demand_df['isdryday'] = (demand_df['rainfallmm'] == 0).astype(float)
        demand_df['rainfall7dayavg'] = demand_df.groupby('sku')['rainfallmm'].transform(
            lambda values: values.shift(1).rolling(window=7, min_periods=1).mean()
        )

    if 'humiditypercent' in demand_df.columns:
        demand_df['humiditypercent'] = pd.to_numeric(demand_df['humiditypercent'], errors='coerce')
        demand_df['highhumidity'] = (demand_df['humiditypercent'] > 80).astype(float)

    if 'category' not in demand_df.columns:
        demand_df['category'] = 'Unknown'
    demand_df['category'] = demand_df['category'].fillna('Unknown')

    demand_df['hotweather_beverage'] = 0.0
    demand_df['hotweather_icecream'] = 0.0
    demand_df['rainyday_packagedgoods'] = 0.0
    demand_df['poyaday_vegdemand'] = 0.0
    demand_df['poyaday_meatdecline'] = 0.0

    if 'temphot' in demand_df.columns:
        beverage_mask = demand_df['category'].str.contains('Beverage|Drink', case=False, na=False)
        frozen_mask = demand_df['category'].str.contains('Frozen|Ice|Dairy', case=False, na=False)
        demand_df.loc[beverage_mask, 'hotweather_beverage'] = demand_df.loc[beverage_mask, 'temphot']
        demand_df.loc[frozen_mask, 'hotweather_icecream'] = demand_df.loc[frozen_mask, 'temphot']

    if 'israiny' in demand_df.columns:
        packaged_mask = demand_df['category'].str.contains('Packaged|Canned|Dry', case=False, na=False)
        demand_df.loc[packaged_mask, 'rainyday_packagedgoods'] = demand_df.loc[packaged_mask, 'israiny']

    veg_mask = demand_df['category'].str.contains('Fruit|Vegetable|Fresh', case=False, na=False)
    meat_mask = demand_df['category'].str.contains('Meat|Fish|Poultry|Seafood', case=False, na=False)
    demand_df.loc[veg_mask, 'poyaday_vegdemand'] = demand_df.loc[veg_mask, 'ispoyaday']
    demand_df.loc[meat_mask, 'poyaday_meatdecline'] = demand_df.loc[meat_mask, 'ispoyaday']

    demand_df['is2022crisis'] = (demand_df['year'] == 2022).astype(int)
    demand_df['yeartrend'] = demand_df['year'] - 2022

    demand_df['lag_unitssold'] = demand_df.groupby('sku')['unitssold'].shift(1)
    demand_df['sales7dayavg'] = demand_df.groupby('sku')['lag_unitssold'].transform(
        lambda values: values.rolling(window=7, min_periods=1).mean()
    )
    demand_df['sales14dayavg'] = demand_df.groupby('sku')['lag_unitssold'].transform(
        lambda values: values.rolling(window=14, min_periods=1).mean()
    )
    demand_df['sales30dayavg'] = demand_df.groupby('sku')['lag_unitssold'].transform(
        lambda values: values.rolling(window=30, min_periods=1).mean()
    )
    demand_df['sales7daystd'] = demand_df.groupby('sku')['lag_unitssold'].transform(
        lambda values: values.rolling(window=7, min_periods=1).std()
    )
    demand_df['dayofweek_avg'] = demand_df.groupby(['sku', 'dayofweek'])['unitssold'].transform(
        lambda values: values.shift(1).expanding().mean()
    )
    demand_df = demand_df.drop(columns=['lag_unitssold'])

    le_sku = LabelEncoder()
    demand_df['sku_encoded'] = le_sku.fit_transform(demand_df['sku'].astype(str))

    le_category = LabelEncoder()
    demand_df['category_encoded'] = le_category.fit_transform(demand_df['category'].astype(str))

    if 'promotionflag' in demand_df.columns:
        demand_df['promotionflag'] = demand_df['promotionflag'].map(
            {'true': 1, 'false': 0, True: 1, False: 0}
        )
        demand_df['promotionflag'] = pd.to_numeric(demand_df['promotionflag'], errors='coerce')

    if 'unitpricelkr' in demand_df.columns:
        demand_df['unitpricelkr'] = pd.to_numeric(demand_df['unitpricelkr'], errors='coerce')

    feature_cols = [
        'sku_encoded', 'year', 'dayofweek', 'dayofmonth', 'month', 'quarter', 'weekofyear', 'dayofyear',
        'isweekend', 'ismonthend', 'ismonthstart',
        'ispoyaday', 'isnewyear', 'isves ak', 'isramadanperiod', 'ischristmasseason',
        'isswmonsoon', 'isnemonsoon', 'isintermonsoon',
        'is2022crisis', 'yeartrend',
    ]

    if 'promotionflag' in demand_df.columns:
        feature_cols.append('promotionflag')
    if 'unitpricelkr' in demand_df.columns:
        feature_cols.append('unitpricelkr')
    if 'avgtemperaturec' in demand_df.columns:
        feature_cols.extend(['avgtemperaturec', 'temphot', 'tempcool', 'tempmoderate'])
    if 'rainfallmm' in demand_df.columns:
        feature_cols.extend(['rainfallmm', 'israiny', 'isheavyrain', 'isdryday', 'rainfall7dayavg'])
    if 'humiditypercent' in demand_df.columns:
        feature_cols.extend(['humiditypercent', 'highhumidity'])

    feature_cols.extend([
        'hotweather_beverage', 'hotweather_icecream',
        'rainyday_packagedgoods', 'poyaday_vegdemand', 'poyaday_meatdecline',
        'sales7dayavg', 'sales14dayavg', 'sales30dayavg', 'sales7daystd', 'dayofweek_avg',
        'category_encoded'
    ])

    with open(MODELS_DIR / "sku_encoder.pkl", 'wb') as f:
        pickle.dump(le_sku, f)

    with open(MODELS_DIR / "demand_feature_cols.pkl", 'wb') as f:
        pickle.dump(feature_cols, f)

    return demand_df, demand_df['unitssold'].to_numpy(dtype=float), feature_cols, le_sku


def benchmark_and_select_demand_model(demand_df, feature_cols, n_splits=3):
    folds = build_time_series_folds(demand_df, n_splits=n_splits)
    strategies = ['constant_defaults', 'median', 'forward_fill_median']
    candidate_models = get_candidate_models()
    benchmark_rows = []

    logger.info(f"Comparing {len(strategies)} missing-value strategies")
    logger.info(f"Comparing {len(candidate_models)} forecasting models")

    for strategy_name in strategies:
        logger.info(f"Missing-value strategy: {strategy_name}")
        for model_name, model in candidate_models.items():
            logger.info(f"  Evaluating {model_name}")
            fold_scores = []
            fold_times = []

            for fold_number, train_idx, valid_idx in folds:
                train_df = demand_df.loc[train_idx]
                valid_df = demand_df.loc[valid_idx]

                X_train, X_valid = apply_missing_value_strategy(train_df, valid_df, feature_cols, strategy_name)
                y_train = train_df['unitssold'].to_numpy(dtype=float)
                y_valid = valid_df['unitssold'].to_numpy(dtype=float)

                estimator = clone(model)
                started_at = time.perf_counter()
                estimator.fit(X_train, y_train)
                fit_time = time.perf_counter() - started_at

                predictions = np.clip(estimator.predict(X_valid), 0, None)
                metrics = calculate_regression_metrics(y_valid, predictions)

                fold_scores.append(metrics)
                fold_times.append(fit_time)
                benchmark_rows.append({
                    'level': 'fold',
                    'fold': fold_number,
                    'imputation_strategy': strategy_name,
                    'model_name': model_name,
                    'mae': metrics['mae'],
                    'rmse': metrics['rmse'],
                    'mape': metrics['mape'],
                    'smape': metrics['smape'],
                    'fit_time_seconds': fit_time,
                    'train_samples': int(len(train_df)),
                    'validation_samples': int(len(valid_df)),
                    'train_start': str(train_df['date'].min().date()),
                    'train_end': str(train_df['date'].max().date()),
                    'validation_start': str(valid_df['date'].min().date()),
                    'validation_end': str(valid_df['date'].max().date()),
                })

            benchmark_rows.append({
                'level': 'summary',
                'fold': 'avg',
                'imputation_strategy': strategy_name,
                'model_name': model_name,
                'mae': float(np.mean([score['mae'] for score in fold_scores])),
                'rmse': float(np.mean([score['rmse'] for score in fold_scores])),
                'mape': float(np.mean([score['mape'] for score in fold_scores])),
                'smape': float(np.mean([score['smape'] for score in fold_scores])),
                'fit_time_seconds': float(np.mean(fold_times)),
                'train_samples': int(np.mean([len(demand_df.loc[idx]) for _, idx, _ in folds])),
                'validation_samples': int(np.mean([len(demand_df.loc[idx]) for _, _, idx in folds])),
                'train_start': '',
                'train_end': '',
                'validation_start': '',
                'validation_end': '',
            })

    benchmark_df = pd.DataFrame(benchmark_rows)
    summary_df = benchmark_df[benchmark_df['level'] == 'summary'].copy()
    summary_df = summary_df.sort_values(
        by=['smape', 'rmse', 'mae', 'fit_time_seconds'],
        ascending=[True, True, True, True],
    ).reset_index(drop=True)
    summary_df['rank'] = np.arange(1, len(summary_df) + 1)
    best_row = summary_df.iloc[0].to_dict()
    return benchmark_df, summary_df, best_row


def write_comparison_outputs(benchmark_df, summary_df, best_row, feature_cols, n_splits):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    benchmark_csv = COMPARISON_DIR / "demand_model_benchmark_results.csv"
    summary_csv = COMPARISON_DIR / "demand_model_benchmark_summary.csv"
    summary_json = COMPARISON_DIR / "best_demand_model_summary.json"
    report_md = COMPARISON_DIR / "MODEL_COMPARISON_REPORT.md"

    benchmark_df.to_csv(benchmark_csv, index=False)
    summary_df.to_csv(summary_csv, index=False)

    serializable_best = {
        key: (float(value) if isinstance(value, (np.floating, np.integer)) else value)
        for key, value in best_row.items()
    }
    serializable_best['generated_at'] = timestamp
    serializable_best['validation_method'] = f"Expanding-window TimeSeriesSplit ({n_splits} folds)"
    serializable_best['feature_count'] = len(feature_cols)

    with open(summary_json, 'w', encoding='utf-8') as f:
        json.dump(serializable_best, f, indent=2)

    top_rows = summary_df.head(8)
    markdown_lines = [
        "# Demand Model Comparison Report",
        "",
        f"Generated at: {timestamp}",
        "",
        "## Methodology",
        "",
        "- Same engineered feature set used for every experiment.",
        "- Missing values compared with `constant_defaults`, `median`, and `forward_fill_median`.",
        f"- Validation used expanding-window time series splits with {n_splits} folds.",
        "- Final selection prioritized lowest sMAPE, then RMSE, then MAE.",
        "",
        "## Top Ranked Configurations",
        "",
        "| Rank | Imputation | Model | MAE | RMSE | MAPE | sMAPE | Avg Fit Time (s) |",
        "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ]

    for _, row in top_rows.iterrows():
        markdown_lines.append(
            f"| {int(row['rank'])} | {row['imputation_strategy']} | {row['model_name']} | "
            f"{row['mae']:.3f} | {row['rmse']:.3f} | {row['mape']:.3f} | {row['smape']:.3f} | "
            f"{row['fit_time_seconds']:.3f} |"
        )

    markdown_lines.extend([
        "",
        "## Selected Production Approach",
        "",
        f"- Imputation strategy: `{best_row['imputation_strategy']}`",
        f"- Forecasting model: `{best_row['model_name']}`",
        f"- Average MAE: `{best_row['mae']:.3f}`",
        f"- Average RMSE: `{best_row['rmse']:.3f}`",
        f"- Average MAPE: `{best_row['mape']:.3f}`",
        f"- Average sMAPE: `{best_row['smape']:.3f}`",
        "",
        "## Conclusion",
        "",
        (
            f"The selected approach was `{best_row['imputation_strategy']}` with `{best_row['model_name']}` "
            "because it delivered the best time-based validation accuracy among all tested combinations."
        ),
        (
            "This gives evidence for model selection instead of relying on a single algorithm or a single "
            "missing-value assumption."
        ),
        "",
    ])
    report_md.write_text("\n".join(markdown_lines), encoding='utf-8')


def train_and_save_best_model(demand_df, feature_cols, best_row, n_splits):
    strategy_name = best_row['imputation_strategy']
    model_name = best_row['model_name']
    model_registry = get_candidate_models()
    selected_model = clone(model_registry[model_name])

    X_full = transform_full_feature_set(demand_df, feature_cols, strategy_name)
    y_full = demand_df['unitssold'].to_numpy(dtype=float)

    selected_model.fit(X_full, y_full)
    train_predictions = np.clip(selected_model.predict(X_full), 0, None)
    train_metrics = calculate_regression_metrics(y_full, train_predictions)

    with open(MODELS_DIR / "demand_forecast_model.pkl", 'wb') as f:
        pickle.dump(selected_model, f)

    importance_pairs = extract_feature_importance(selected_model, feature_cols)
    grouped_importance = summarize_feature_groups(importance_pairs)
    pd.DataFrame(importance_pairs, columns=['Feature', 'Importance']).to_csv(
        MODELS_DIR / "feature_importance.csv",
        index=False,
    )

    metrics = {
        'mae': float(best_row['mae']),
        'rmse': float(best_row['rmse']),
        'mape': float(best_row['mape']),
        'smape': float(best_row['smape']),
        'mae_train': float(train_metrics['mae']),
        'rmse_train': float(train_metrics['rmse']),
        'training_samples': int(len(demand_df)),
        'test_samples': int(best_row['validation_samples']),
        'total_samples': int(len(demand_df)),
        'total_features': len(feature_cols),
        'selected_model_name': model_name,
        'selected_imputation_strategy': strategy_name,
        'validation_method': f'Expanding-window TimeSeriesSplit ({n_splits} folds)',
        'comparison_results_file': 'demand_model_benchmark_summary.csv',
        'top_features': [name for name, _ in importance_pairs[:10]],
        'trained_at': datetime.now().isoformat(),
        **grouped_importance,
    }
    with open(MODELS_DIR / "demand_metrics.pkl", 'wb') as f:
        pickle.dump(metrics, f)


def persist_product_master(products_df):
    if not products_df.empty:
        products_df.to_csv(MODELS_DIR / "product_master.csv", index=False)


def parse_args():
    parser = argparse.ArgumentParser(description="Benchmark and select the best demand forecasting model.")
    parser.add_argument('--folds', type=int, default=3, help='Number of time-series validation folds.')
    parser.add_argument(
        '--max-samples',
        type=int,
        default=0,
        help='Optional cap on demand rows for quicker smoke tests. Uses the most recent rows after sorting.',
    )
    return parser.parse_args()


def main():
    args = parse_args()

    logger.info("=" * 70)
    logger.info("INVENTORY FORECASTING MODEL BENCHMARK PIPELINE")
    logger.info(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("=" * 70)

    sales_df, inventory_df, products_df, weather_df = load_all_data()
    if sales_df.empty and inventory_df.empty:
        raise RuntimeError("No data found. Check the dataset folders.")

    demand_model_trained = False
    waste_model_trained = False

    if not sales_df.empty:
        demand_df, _, feature_cols, _ = prepare_demand_features(sales_df, weather_df, products_df)
        if demand_df is not None:
            if args.max_samples and len(demand_df) > args.max_samples:
                demand_df = demand_df.sort_values(['date', 'sku']).tail(args.max_samples).reset_index(drop=True)
                logger.info(f"Using capped demand sample size for this run: {len(demand_df):,}")

            benchmark_df, summary_df, best_row = benchmark_and_select_demand_model(
                demand_df,
                feature_cols,
                n_splits=args.folds,
            )
            write_comparison_outputs(benchmark_df, summary_df, best_row, feature_cols, args.folds)
            train_and_save_best_model(demand_df, feature_cols, best_row, args.folds)
            demand_model_trained = True

            logger.info("Selected production demand model:")
            logger.info(f"  Imputation strategy: {best_row['imputation_strategy']}")
            logger.info(f"  Forecasting model: {best_row['model_name']}")
            logger.info(f"  MAE: {best_row['mae']:.3f}")
            logger.info(f"  RMSE: {best_row['rmse']:.3f}")
            logger.info(f"  MAPE: {best_row['mape']:.3f}%")
            logger.info(f"  sMAPE: {best_row['smape']:.3f}%")
    else:
        logger.warning("Skipping demand-model benchmark because no sales data was found.")

    if not inventory_df.empty:
        X_waste, y_waste, waste_feature_cols = prepare_waste_features(inventory_df, products_df)
        if X_waste is not None:
            train_waste_model(X_waste, y_waste, waste_feature_cols)
            waste_model_trained = True

    persist_product_master(products_df)

    logger.info("=" * 70)
    logger.info("BENCHMARK PIPELINE COMPLETE")
    logger.info(f"Demand model trained: {demand_model_trained}")
    logger.info(f"Waste model trained: {waste_model_trained}")
    logger.info(f"Artifacts saved to: {MODELS_DIR}")
    logger.info(f"Comparison outputs saved to: {COMPARISON_DIR}")
    logger.info("=" * 70)


if __name__ == '__main__':
    main()
