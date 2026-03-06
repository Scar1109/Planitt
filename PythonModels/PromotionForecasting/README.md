# PromotionForecasting Module

The `PromotionForecasting` module is responsible for forecasting demand and optimizing promotions using an intelligent, agentic workflow. It calculates projected uplifts, revenue impacts, and risks for discounted products.

## Architecture & Components

The module is built with an **Agentic System** design paradigm, dividing strategic analysis into discrete "expert" agents orchestrated by a central planner. It exposes findings through a FastAPI web service, which are consumed by the overarching `PlanogramPlatform` React frontend or directly via an interactive Streamlit `dashboard.py`.

### 1. Agents Setup (`src/agents/`)
The decision-making heart of the system.
- **`workers/`**
  - `futurist.py`: Forecasts base demand and predicts promotion-driven sales uplift.
  - `marketer.py`: Evaluates price elasticity, calculates optimal discount depths, and projects revenue/profit.
  - `steward.py`: Acts as the risk-assessor. Flags potential stockouts (if demand exceeds supply) and wastage (for perishable products nearing expiry).
- **`orchestrator.py`**: The manager. It delegates the SKUs to the workers, aggregates their individual insights (uplift, profit impact, risk), and generates a cohesive strategic recommendation using an LLM.

### 2. Core Engine & Data Foundation
- **`src/engine/`**: Houses the mathematical and machine learning models.
  - `forecasting/`: Contains the `HybridForecaster` that blends Time Series and XGBoost/LightGBM algorithms.
  - `optimization/`: Contains the `PromoOptimizer` which figures out optimal pricing strategies based on budget constraints.
- **`src/adapters/`**: Interfaces with external data.
  - `data_loader.py` handles reading the product master, inventory, and historical sales datasets to feed into the models.
- **`models/`**: Stores the persisted, trained ML artifacts (`.joblib` files) needed for inference.

### 3. API & Web Service (`src/api/` & `main.py`)
- **`main.py`**: The FastAPI application entry point running on port `8001`. Loads the API routes and serves static content.
- **`src/api/routes.py`**: Defines HTTP endpoints used by external services (e.g., `/simulate/sku` for single-product deep-dives or `/plan/generate` for macro portfolio optimization).

### 4. User Interfaces
While the primary user interface lives in the `PlanogramPlatform` frontend (specifically `PromotionForecasting.jsx`), this module includes a local testing layer:
- **`dashboard.py`**: A Streamlit application designed as a "lab" to interactively visualize the Agentic Council's decisions line-by-line.
- **`static/`**: Holds a placeholder HTML file served by FastAPI.

## Running the Module

### Standard API Mode (Used by PlanogramPlatform)
```bash
# Install dependencies
pip install -r requirements.txt

# Start the FastApi service on port 8001
python main.py
```

### Sandbox Mode (Streamlit Dashboard)
```bash
# Start the interactive Agentic Council dashboard
streamlit run dashboard.py
```

### Model Training
To retrain the predictive ML models using new data in your `Dataset` directory:
```bash
python train.py
```
