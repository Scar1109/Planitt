import pandas as pd
import numpy as np
import os
import logging
import joblib
from datetime import datetime
try:
    from app.train_model import DemandModelTrainer
except ImportError:
    # If running script directly (not module), try relative import
    from train_model import DemandModelTrainer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelBasedRanker:
    def __init__(self):
        # Determine paths relative to this file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.models_dir = os.path.join(self.base_dir, "..", "models")
        
        self.model = None
        self.encoder = None
        self._load_model()

    def _load_model(self):
        try:
            model_path = os.path.join(self.models_dir, "demand_model.joblib")
            encoder_path = os.path.join(self.models_dir, "sku_encoder.joblib")
            
            # Check if exists, else Train
            if not os.path.exists(model_path) or not os.path.exists(encoder_path):
                logger.info("Model not found. Initiating initial training with available data...")
                try:
                    trainer = DemandModelTrainer()
                    trainer.train()
                    logger.info("Initial training complete.")
                except Exception as train_err:
                    logger.error(f"Auto-training failed: {train_err}")

            # Reload
            if os.path.exists(model_path) and os.path.exists(encoder_path):
                self.model = joblib.load(model_path)
                self.encoder = joblib.load(encoder_path)
                logger.info("Loaded Trained Demand Model and Encoder.")
            else:
                logger.warning(f"Model not found at {model_path}. Using fallback heuristics.")
                
        except Exception as e:
            logger.error(f"Error loading model: {e}")

    def calculate_metrics_and_predict(self, products, config):
        """
        Calculate metrics and Predict Demand for the given products.
        """
        metrics = {}
        
        # Current Context (Mocked current date for "Next Week" prediction)
        # Ideally we get this from request or system time
        current_week = datetime.now().isocalendar().week
        
        # Pre-process Data needed for features 
        # (Avg Daily Sales, Seasonality, Stock signals)
        # In a real inference setup, we'd fetch Real-Time values from DB or Feature Store.
        # Here, we calculate them from the *Products* payload if available, or default.
        # IMPORTANT: The Model expects specific features:
        # ['sku_encoded', 'week', 'avg_daily_sales', 'seasonality_index', 'low_stock_ratio', 'total_discard', 'turnover_days']
        
        for product in products:
            sku = product.get('sku')
            
            # Default Feature Values (Fallback) or use provided overrides
            avg_daily_sales = product.get('avg_daily_sales', 5.0) 
            seasonality_index = product.get('seasonality_index', 1.0)
            low_stock_ratio = product.get('low_stock_ratio', 0.0)
            total_discard = product.get('total_discard', 0.0)
            turnover_days = product.get('turnover_days', 30.0)
            
            # If product has historical stats injected (e.g. from Backend Agent), use them.
            # Assuming product might come with 'stats' or we assume defaults for new items.
            
            # 1. Encode SKU
            sku_encoded = -1
            if self.encoder:
                try:
                    sku_encoded = self.encoder.transform([sku])[0]
                except ValueError:
                    sku_encoded = -1 # Unseen Label
            
            # 2. Predict Demand
            predicted_demand = 0
            if self.model and sku_encoded != -1:
                features = pd.DataFrame([{
                    'sku_encoded': sku_encoded,
                    'week': current_week,
                    'avg_daily_sales': avg_daily_sales,
                    'seasonality_index': seasonality_index,
                    'low_stock_ratio': low_stock_ratio,
                    'total_discard': total_discard,
                    'turnover_days': turnover_days
                }])
                try:
                    predicted_demand = self.model.predict(features)[0]
                except Exception as e:
                    logger.warning(f"Prediction failed for {sku}: {e}")
            
            metrics[sku] = {
                'predicted_demand': round(predicted_demand, 2),
                'avg_daily_sales': avg_daily_sales,
                'seasonality_index': seasonality_index
            }
            
        return metrics

    def get_ranked_products(self, products, config):
        """
        Rank products based on Model Predictions and configuration weights.
        """
        metrics = self.calculate_metrics_and_predict(products, config)
        weights = config.get('objectiveWeights', {})
        
        w_sales = weights.get('sales', 0.5)
        w_margin = weights.get('margin', 0.3)
        
        ranked_products = []
        for p in products:
            sku = p.get('sku')
            m = metrics.get(sku, {})
            
            # Use Predicted Demand if available, else fallback
            demand_score = m.get('predicted_demand', 0)
            
            # Normalize Demand Score (heuristic normalization)
            # Assume max expected demand ~100 units/week?
            normalized_demand = min(demand_score / 50.0, 1.0)
            
            # Margin Score
            cost = p.get('unitCostLKR', 0)
            price = p.get('baseUnitPriceLKR', 0)
            margin = (price - cost) / price if price > 0 else 0
            
            # Composite Score
            raw_score = (normalized_demand * w_sales) + (margin * w_margin)
            
            p['priority_score'] = raw_score
            p['metrics'] = m
            ranked_products.append(p)
            
        # Sort descending by score
        ranked_products.sort(key=lambda x: x['priority_score'], reverse=True)
        return ranked_products
