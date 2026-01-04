# Planitt - Retail AI Platform

Planitt is a comprehensive Retail AI Platform designed to optimize retail operations through intelligent planogram management, demand forecasting, and integrated point-of-sale systems. This solution employs a microservices architecture to deliver a scalable and robust ecosystem for modern retail management.

## Project Structure

The solution is organized into several key modules, each serving a specific function within the ecosystem:

*   **PlanogramPlatform**: The core web application for designing and managing planograms.
*   **POS (Point of Sale)**: A dedicated system for handling retail transactions.
*   **MobileApp**: A mobile interface for on-the-go access to platform features.
*   **PythonModels**: A suite of AI/ML services providing intelligence for optimization and forecasting.
*   **Website**: The public-facing landing page and marketing site.

*   **Website**: The public-facing landing page and marketing site.

## Architecture

![Architecture Diagram](resources/Arcitecture.png)

## Technologies Used

### Frontend Applications
*   **PlanogramPlatform Frontend**: Built with **React** and **Vite**, utilizing **TailwindCSS** for styling and **Radix UI** for accessible components.
*   **POS Frontend**: Built with **React** and **Vite**.
*   **Website**: Built with **React** and **Vite**.
*   **MobileApp**: Built with **React Native** and **Expo**.

### Backend Services
*   **PlanogramPlatform Backend**: **Node.js** with **Express**, using **MongoDB** (Mongoose) for data persistence and integrating with **OpenAI** for advanced AI features.
*   **POS Backend**: **Node.js** with **Express** and **MongoDB**.

### AI & Machine Learning
*   **PythonModels**: hosted using **FastAPI** and **Uvicorn**.
    *   Key Libraries: **Pandas**, **Numpy**, **Scikit-learn**, **XGBoost**, **LightGBM**, **Joblib**.
    *   Services include:
        *   `PlanogramOptimizer`: Optimizes shelf layouts.
        *   `InventoryForecasting`: Predicts stock requirements.
        *   `AiPromotion`: Forecasts promotion performance.
        *   `ComplianceChecker`: Validates planogram compliance.

## Getting Started

Follow the instructions below to set up and run each component of the solution.

### Prerequisites
*   **Node.js** (Latest LTS recommended)
*   **Python** (3.8 or higher)
*   **MongoDB** (running locally or a cloud connection string)

### 1. Planogram Platform

**Backend:**
Navigate to the backend directory and start the server:
```bash
cd PlanogramPlatform/backend
npm install
npm start
```
*   Running on: `http://localhost:3000` (default)

**Frontend:**
Navigate to the frontend directory and start the development server:
```bash
cd PlanogramPlatform/frontend
npm install
npm run dev
```
*   Running on: `http://localhost:5173` (default)

### 2. Python Models (AI Services)

You can run all Python services concurrently using the provided script in the `PythonModels` directory, or run them individually.

**Concurrent Execution:**
```bash
cd PythonModels
npm install
npm start
```

**Individual Execution (Example - InventoryForecasting):**
```bash
cd PythonModels/InventoryForecasting
pip install -r requirements.txt
python main.py
```

### 3. POS System

**Backend:**
```bash
cd POS/backend
npm install
npm start
```

**Frontend:**
```bash
cd POS/frontend
npm install
npm run dev
```

### 4. Mobile App

Ensure you have the Expo CLI installed.
```bash
cd MobileApp
npm install
npx expo start
```
*   Use the Expo Go app on your phone or an emulator to view the application.

### 5. Website

```bash
cd Website
npm install
npm run dev
```

## Features

*   **Intelligent Planograms**: AI-driven layout optimization to maximize sales and aesthetic appeal.
*   **Demand Forecasting**: Advanced ML models (XGBoost/LightGBM) to predict inventory needs.
*   **Compliance Checking**: Automated verification of planogram implementation.
*   **Integrated POS**: Seamless sales tracking connected to the central platform.
*   **Mobile Access**: Manage operations from anywhere.
