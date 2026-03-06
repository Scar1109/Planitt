import streamlit as st
import requests
import pandas as pd
from datetime import date

# Config
API_URL = "http://localhost:8000/api/v1"

st.set_page_config(page_title="AI Promotion Lab", layout="wide")

st.title("🤖 AI Promotion Intelligence Lab")
st.markdown("Interactive sandbox to test the **Agentic Council's** decision making.")

# Sidebar: Mode Selection
mode = st.sidebar.radio("Select Mode", ["SKU Simulator (Micro)", "Full Plan Generator (Macro)"])

if mode == "SKU Simulator (Micro)":
    st.header("🔬 Single SKU Analysis")
    st.info("Test how the agents (Futurist, Marketer, Steward) react to specific product scenarios.")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        sku_id = st.text_input("SKU ID", value="LK-BEV-AG2SR")
        name = st.text_input("Product Name", value="Apple Soda")
        cat = st.selectbox("Category", ["Beverages", "Snacks", "Dairy", "Vegetables", "General"])
        
    with col2:
        price = st.number_input("Base Price (LKR)", value=150.0)
        cost = st.number_input("Cost Price (LKR)", value=100.0)
        stock = st.number_input("Current Stock", value=5000)
        
    with col3:
        discount = st.slider("Test Discount Depth", 0.05, 0.50, 0.20)
        
    if st.button("Run Simulation"):
        # Construct Payload
        payload = {
            "sku": {
                "sku_id": sku_id,
                "name": name,
                "category": cat,
                "brand": "Generic",
                "base_price": price,
                "cost_price": cost,
                "stock_level": stock,
                "is_perishable": False
            },
            "test_discount": discount
        }
        
        try:
            with st.spinner("Consulting the Council..."):
                response = requests.post(f"{API_URL}/simulate/sku", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                
                # Metrics Display
                st.subheader("📊 Agent Predictions")
                m1, m2, m3, m4 = st.columns(4)
                m1.metric("Baseline Demand (7d)", f"{data['baseline']:.1f} units")
                m2.metric("Incremental Lift", f"+{data['uplift']:.1f} units", delta_color="normal")
                m3.metric("Revenue Impact", f"{data['revenue_lift']:.0f} LKR")
                m4.metric("Profit Impact", f"{data['profit_lift']:.0f} LKR")
                
                # Risk Analysis
                st.subheader("🛡️ Steward's Risk Assessment")
                risk_col1, risk_col2 = st.columns(2)
                stockout = data['risks']['stockout_risk'] * 100
                waste = data['risks']['waste_risk'] * 100
                
                risk_col1.progress(stockout / 100, text=f"Stockout Risk: {stockout:.1f}%")
                risk_col2.progress(waste / 100, text=f"Waste Risk: {waste:.1f}%")
                
                if stockout > 80:
                    st.error("⚠️ HIGH STOCKOUT RISK! Agents would likely VETO this promo.")
                elif waste > 80:
                    st.warning("⚠️ HIGH WASTE RISK! Agents would prioritize CLEARANCE.")
                    
            else:
                st.error(f"API Error: {response.text}")
                
        except Exception as e:
            st.error(f"Connection Error: {e}. Is the server running?")

elif mode == "Full Plan Generator (Macro)":
    st.header("📋 Automatic Promotion Planning")
    st.info("Trigger the Orchestrator to solve for the best plan across multiple SKUs.")
    
    budget = st.number_input("Budget Limit (LKR)", value=100000)
    objective = st.selectbox("Objective", ["MAX_PROFIT", "MAX_REVENUE", "MIN_WASTE"])
    
    if st.button("Generate Optimization Plan"):
        # Mock payload for demo purposes (usually would upload a CSV)
        # Using default test set
        payload = {
            "skus": [
                {
                    "sku_id": "LK-BEV-AG2SR", "name": "Apple Soda", "category": "Beverages",
                    "base_price": 150.0, "cost_price": 100.0, "stock_level": 5000, "is_perishable": False
                },
                {
                    "sku_id": "LK-VEG-CAR", "name": "Carrots", "category": "Vegetables",
                    "base_price": 300.0, "cost_price": 200.0, "stock_level": 50, "is_perishable": True, "days_to_expiry": 5
                },
                {
                    "sku_id": "LK-SNK-CHIP", "name": "Chips", "category": "Snacks",
                    "base_price": 200.0, "cost_price": 150.0, "stock_level": 1000, "is_perishable": False
                }
            ],
            "constraints": {
                "budget": budget,
                "allow_stockout_risk": False
            },
            "objective": objective
        }
        
        try:
            with st.spinner("The Council is debating... (OpenAI Narrator generating explanation...)"):
                response = requests.post(f"{API_URL}/plan/generate", json=payload)
                
            if response.status_code == 200:
                plan = response.json()
                st.success(f"Plan Generated! ID: {plan['plan_id']}")
                
                for cand in plan['recommendations']:
                    with st.expander(f"📢 {cand['promo_type']} on {cand['sku_id']} ({cand['discount_depth']*100:.0f}% off)"):
                        st.markdown(f"**Strategic Reasoning:** {cand['reasoning']}")
                        st.markdown(f"**Stats:** Lift +{cand['uplift_forecast']:.0f} units | Profit +{cand['profit_lift']:.0f} LKR")
            else:
                st.error(f"API Error: {response.text}")
                
        except Exception as e:
            st.error(f"Connection Error: {e}")
