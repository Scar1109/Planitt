# Inventory Forecasting ML Service

## Overview

This service provides demand forecasting and waste risk prediction for inventory management using machine learning models.

## Features

- **7-Day Demand Forecasting** - Ensemble ML predictions (XGBoost + LightGBM + Prophet)
- **Waste Risk Detection** - Identify at-risk inventory with action recommendations
- **JIT Replenishment** - Optimal reorder points and quantities
- **Holiday Impact Analysis** - Adjusts forecasts based on upcoming holidays

## Tech Stack

- **FastAPI** - Modern Python web framework
- **Scikit-learn** - ML model training
- **Pandas** - Data processing
- **NumPy** - Numerical computations

## API Endpoints

### Health Check
```http
GET /health
```

### Demand Forecast
```http
POST /api/v1/forecast
Content-Type: application/json

{
  "product_id": "P001",
  "store_id": "S001",
  "horizon_days": 7,
  "include_weather": true
}
```

### Waste Risk Prediction
```http
POST /api/v1/waste-risk
Content-Type: application/json

{
  "inventory": [
    {
      "sku": "P001",
      "store_id": "S001",
      "current_stock": 25,
      "days_to_expiry": 3,
      "avg_daily_sales": 15.0
    }
  ]
}
```

### System Metrics
```http
GET /api/v1/metrics
```

## Setup

1. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the server**
   ```bash
   python main.py
   ```
   
   Or with uvicorn:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

3. **Access API documentation**
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## Environment Variables

Create a `.env` file:
```env
OPENWEATHER_API_KEY=your_api_key_here
```

## Integration

This service is called by the Node.js backend (backend_) which adds OpenAI-powered reasoning on top of the ML predictions.

```
Node.js Agent → HTTP Request → Python ML Service → Returns Predictions
```

## Model Training

To train models:
```bash
python train_models.py
```

Models are saved in the `models/` directory.
