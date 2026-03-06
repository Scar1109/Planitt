import sys
import os
import pandas as pd
import numpy as np
import traceback
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

sys.path.append('.')

try:
    from src.adapters.data_loader import DataLoader
    from src.agents.workers.guardian import DataGuardian
    from src.engine.pipelines import FeaturePipeline
    from src.engine.forecasting.hybrid_model import HybridForecaster
    from src.engine.uplift.t_learner import TLearnerUplift

    print('--- Academic Evaluation of Promotion Models ---')
    loader = DataLoader('../../Dataset')
    guardian = DataGuardian()

    raw_df = loader.build_golden_table([2023, 2024])
    df = guardian.clean_and_impute(raw_df)

    pipeline = FeaturePipeline()
    featured_df = pipeline.transform(df, is_training=True)

    # 1. Evaluate Hybrid Forecaster
    print('\n[1] Evaluating Hybrid Forecaster (RandomForest)')
    train_df, test_df = train_test_split(featured_df, test_size=0.2, random_state=42, shuffle=False)
    print(f'Train Samples: {len(train_df)}, Test Samples: {len(test_df)}')

    model = HybridForecaster()
    model.fit(train_df, target_col='TrueDemand')

    # Test
    features = model.features
    test_clean = test_df.dropna(subset=features + ['TrueDemand'])
    X_test = test_clean[features].fillna(0)
    y_test = test_clean['TrueDemand']

    # Predict
    pred_log = model.model.predict(X_test)
    y_pred = np.expm1(pred_log)

    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    print(f'-> MAE: {mae:.2f} units')
    print(f'-> RMSE: {rmse:.2f} units')
    print(f'-> R-Squared: {r2:.4f}')

    # 2. Evaluate T-Learner (Causal)
    print('\n[2] Evaluating T-Learner Uplift Models (XGBoost)')
    t_learner = TLearnerUplift()
    
    # We must ensure categoricals have the exact same categories!
    train_df['Category'] = train_df['Category'].astype('category')
    train_df['Brand'] = train_df['Brand'].astype('category')
    test_df['Category'] = pd.Categorical(test_df['Category'], categories=train_df['Category'].cat.categories)
    test_df['Brand'] = pd.Categorical(test_df['Brand'], categories=train_df['Brand'].cat.categories)

    t_learner.fit(train_df, target='TrueDemand', treatment_col='is_promo')

    # Evaluate M1 (Treatment / Promo)
    treat_test = test_df[test_df['is_promo'] == 1].dropna(subset=['TrueDemand']).copy()
    if not treat_test.empty:
        t_features = [
            'AvgPrice', 'BaseUnitPriceLKR', 'price_index', 'is_promo', 'discount_depth', 'lag_1', 'lag_3', 'lag_7', 'lag_14', 'lag_21',
            'rolling_mean_7', 'rolling_mean_14', 'rolling_mean_30', 
            'rolling_std_7', 'rolling_std_30',
            'month_sin', 'dow_sin', 'is_weekend', 'is_rainy', 'event_impact',
            'Category', 'Brand'
        ]
        
        y_true_treat = treat_test['TrueDemand']
        y_pred_treat = t_learner.m1.predict(treat_test[t_features])
        
        t_rmse = np.sqrt(mean_squared_error(y_true_treat, y_pred_treat))
        t_r2 = r2_score(y_true_treat, y_pred_treat)
        print(f'-> Treatment Model RMSE: {t_rmse:.2f} units')
        print(f'-> Treatment Model R-Squared: {t_r2:.4f}')
    else:
        print('-> No promo days in test set to evaluate M1.')

    print('\nEvaluation Complete.')

except Exception as e:
    print(f"FAILED: {e}")
    traceback.print_exc()
