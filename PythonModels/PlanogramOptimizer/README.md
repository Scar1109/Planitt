# Planitt — Planogram Optimizer

A powerful, ML-driven service for generating optimized retail planograms. This service uses a **Random Forest Regressor** to predict product demand and a **Simulated Annealing** metaheuristic engine to arrange products on shelves for maximum profitability and space efficiency.

---

## 🚀 Features

*   **Demand Forecasting**: Predicts future sales using historical data (2022-2024), seasonality, and inventory signals.
*   **Auto-Training**: Automatically trains a new model on startup if no model artifacts are found, ensuring the service is always ready.
*   **Space Optimization**: Places best-selling products in "eye-level" zones and manages shelf depth/facings.
*   **Constraint Handling**: Respects physical shelf dimensions and product categories.
*   **Metaheuristic Engine**: Refines layouts iteratively to find the global optimum.
*   **REST API**: Exposes endpoints for training, optimization, and metadata retrieval.

---

## 🛠️ Setup & Installation

### Prerequisites
*   Python 3.9+
*   `pip` (Python Package Manager)

### 1. Initialize Virtual Environment
It is recommended to use a virtual environment.
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

---

## 🧠 Training the Model

Before running optimizations, you must train the model with your dataset.

### Data Structure
Ensure your `data/` folder is structured as follows:
```
data/
├── 2022/
│   ├── Sales_2022.csv
│   └── Inventory_Snapshot_2022.csv
├── 2023/
│   ├── Sales_2023.csv
│   └── Inventory_Snapshot_2023.csv
└── 2024/
    ├── Sales_2024.csv
    └── Inventory_Snapshot_2024.csv
```

### Run Training
Execute the training script to ingest data, engineer features, and save the model artifacts (`demand_model.joblib`, `sku_encoder.joblib`).
```bash
python app/train_model.py
```
*   **Outputs**: `models/*.joblib`, `models/model_metadata.json`
*   **Metrics**: Check console output for MSE and R² Score.

---

## ⚡ Running the Service

Start the FastAPI server to handle optimization requests.

```bash
# Standard Launch
python -m uvicorn main:app --port 8000 --reload
```

The service will be available at: `http://127.0.0.1:8000`

---

## 🔌 API Endpoints

### 1. Optimize Planogram
**POST** `/optimize`
*   **Description**: Generates a layout for a given set of products and fixtures.
*   **Payload**: `OptimizationRequest` (JSON containing fixtures list and products list).
*   **Response**: `OptimizationResult` (Placements coordinates, Score).

### 2. Get Model Metadata
**GET** `/model/metadata`
*   **Description**: Returns accuracy metrics of the currently loaded model.
*   **Response**:
    ```json
    {
        "training_date": "2026-01-04...",
        "mse": 7746.76,
        "r2_score": 0.95,
        "feature_importances": { ... }
    }
    ```
*   **CLI Usage**:
    ```bash
    # using curl
    curl http://127.0.0.1:8000/model/metadata
    ```
    ```powershell
    # using PowerShell
    Invoke-RestMethod -Uri "http://127.0.0.1:8000/model/metadata"
    ```

### 3. Health Check
**GET** `/health`
*   **Description**: Returns status of the service and model loading.

---

## 🔬 How It Works

1.  **Ranking**: The system first predicts a `Score` for every product using the trained Machine Learning model. High-demand products get higher scores.
2.  **Construction**: A greedy heuristic fills shelves quickly, placing high-score items at eye level (120cm - 160cm).
3.  **Refinement**: The Simulated Annealing engine swaps, moves, and removes products over thousands of iterations to maximize the Total Planogram Value (TPV) while minimizing space waste.

---

## 📂 Project Structure

*   `app/`: Core application logic.
    *   `optimizer.py`: Main entry point for optimization logic.
    *   `heuristics.py`: Simulated Annealing and construction algorithms.
    *   `train_model.py`: Script for ML training.
    *   `model_based.py`: Inference logic using the saved model.
*   `data/`: Historical datasets (ignored in git).
*   `models/`: Saved binary model files (ignored in git).
