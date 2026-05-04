import pandas as pd
import numpy as np

pd.set_option('future.no_silent_downcasting', True)

class DataCleaner:
    """
    Centralized logic for cleaning, imputing, and finalizing the Golden Table.
    Separates messy data patching from the clean ingestion logic.
    """
    
    def finalize_golden_table(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Main pipeline to fix schema issues, impute missing metadata, 
        and ensure critical columns exist for the Guardian.
        """
        df = df.copy()
        
        # 0. Augment Promo Prices (Fix covariate shift)
        # The raw dataset has PromoFlag=True but prices don't drop.
        # We inject realistic promotional pricing so the ML model learns
        # the causal relationship between discounts and demand uplift.
        df = self._augment_promo_prices(df)
        
        # 1. Fix Missing Critical Metrics
        if 'AvgPrice' not in df.columns:
            # Sales file usually has 'UnitPriceLKR'
            if 'UnitPriceLKR' in df.columns:
                df['AvgPrice'] = df['UnitPriceLKR']
            else:
                # If neither exists (unlikely), default to 0
                df['AvgPrice'] = 0.0
                
        # 2. Handle Product Master Mismatch (Inference Layer)
        # If Category is consistently missing, use SKU-based inference
        if df['Category'].isnull().mean() > 0.5: # If >50% missing
            print(">>> DataCleaner: High missing Category rate. Inferring from SKU.")
            df['Category'] = df['Category'].fillna(df['SKU'].apply(self._infer_category_from_sku))
            
        # 3. Impute Financials (ADVANCED)
        # Profit models need Cost. If missing, assume Category-based margin.
        if 'CostPriceLKR' not in df.columns:
            df['CostPriceLKR'] = pd.NA
            
        # Fix Zero/Negative Prices first (Anomaly Detection)
        if df['AvgPrice'].le(0).any():
             # Replace <=0 with global mean for safety
            global_mean = df[df['AvgPrice'] > 0]['AvgPrice'].mean()
            df.loc[df['AvgPrice'] <= 0, 'AvgPrice'] = global_mean

        # Impute Cost using Category-specific Margins
        if df['CostPriceLKR'].isnull().any():
            print(">>> DataCleaner: Imputing missing CostPriceLKR with Category Margins.")
            
            # Vectorized approach for efficiency? 
            # For simplicity and readability in Python 3.9+: use apply
            def calc_cost(row):
                if pd.notna(row['CostPriceLKR']):
                    return row['CostPriceLKR']
                margin = self._get_margin_by_category(row['Category'])
                return row['AvgPrice'] * (1 - margin)
                
                
            df['CostPriceLKR'] = df.apply(calc_cost, axis=1)

        # 4. Outlier Clipping (ADVANCED)
        # Remove extreme sales spikes (e.g. bulk buying errors) > 99th percentile
        # We cap them instead of removing rows to preserve data continuity
        cap_val = df['UnitsSold'].quantile(0.99)
        if cap_val > 0:
            df['UnitsSold'] = df['UnitsSold'].clip(upper=cap_val)

        # 5. Fill Product Attributes with Defaults (To satisfy Pandera/Model)
        defaults = {
            'ProductName': df['SKU'], # Fallback to SKU
            'Brand': 'Generic',
            'SubCategory': 'General',
            'UnitSize': '1 Unit',
            'PerishabilityTier': 'Low',
            'PromotionType': 'None',
            'PromotionDiscountPct': 0.0,
            'UnitsSold': 0,
            'TotalRevenueLKR': 0.0
        }
        
        for col, val in defaults.items():
            if col not in df.columns:
                df[col] = val
            else:
                df[col] = df[col].fillna(val)
                
        return df

    # --- ADVANCED HELPER METHODS ---

    def _infer_category_from_sku(self, sku: str) -> str:
        """
        Parses SKU (e.g., LK-BEV-001) to extract category.
        Expanded to handle more prefixes and edge cases.
        """
        if not isinstance(sku, str): return "Unknown"
        s = sku.strip().upper()
        
        # Mapping: Prefix -> Category
        mappings = {
            "BEV": "Beverages",
            "SNK": "Snacks",
            "FRU": "Fruits",
            "VEG": "Vegetables",
            "DAI": "Dairy",
            "BAK": "Bakery",
            "MEA": "Meat",
            "SEA": "Seafood",
            "HOU": "Household",
            "PER": "Personal Care",
            "GRO": "Grocery",
            "STA": "Stationery",
            "JUI": "Juices"
        }
        
        # Try to find prefix in the string
        for prefix, category in mappings.items():
            if prefix in s:
                return category
                
        # Fallback: Hash or Generic
        return "General"

    def _get_margin_by_category(self, category: str) -> float:
        """
        Returns estimated profit margin based on retail standards.
        Used for imputing CostPrice when missing.
        """
        margins = {
            "Beverages": 0.25,     # High volume, mid margin
            "Snacks": 0.20,        # Competitive
            "Fruits": 0.35,        # Perishable risk premium
            "Vegetables": 0.35,    # Perishable risk premium
            "Dairy": 0.15,         # Fast turnover, low margin
            "Bakery": 0.30,        # Manufacturing margin
            "Meat": 0.25,
            "Seafood": 0.30,
            "Household": 0.40,     # Slow mover, high margin
            "Personal Care": 0.35,
            "General": 0.20
        }
        return margins.get(category, 0.20)

    def _augment_promo_prices(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Retroactively applies realistic promotional price reductions to promo rows.
        
        Academic Justification:
        The original POS dataset records PromotionFlag=True but does NOT reduce
        the UnitPriceLKR during promotions (prices remain at base level). This
        causes a covariate shift (Shimodaira, 2000) between training and inference:
        the S-Learner model never sees discounted prices paired with is_promo=1,
        so it cannot learn the causal price-demand relationship.
        
        We apply domain-informed discount rates based on PromotionType, following
        standard Sri Lankan retail promotion mechanics:
        - Discount: 10% off (standard shelf discount)
        - BOGOF: ~25% effective discount (2-for-1 amortized)
        - Bundle: ~15% effective discount (multi-buy savings)
        - Flash: 20% off (limited-time urgency pricing)
        - Near-Expiry: 30% off (clearance to reduce waste)
        
        References:
        - Chawla et al. (2002) — Data augmentation with domain knowledge
        - Shimodaira (2000) — Covariate shift correction
        """
        # Determine promo flag column name
        promo_col = None
        for candidate in ['PromotionFlag', 'PromoFlag', 'promotionFlag']:
            if candidate in df.columns:
                promo_col = candidate
                break
        
        if promo_col is None:
            return df  # No promo information available
        
        # Determine promo type column
        type_col = None
        for candidate in ['PromotionType', 'PromoType', 'promotionType']:
            if candidate in df.columns:
                type_col = candidate
                break
        
        # Define effective discount rates per promotion type
        discount_map = {
            'Discount': 0.10,
            'BOGOF': 0.25,
            'Bundle': 0.15,
            'Flash': 0.20,
            'Near-Expiry': 0.30,
        }
        default_discount = 0.12  # Conservative default
        
        # Identify promo rows
        promo_mask = df[promo_col].fillna(False).astype(bool)
        
        if promo_mask.sum() == 0:
            return df
        
        # Determine the price column to adjust
        price_col = 'AvgPrice' if 'AvgPrice' in df.columns else 'UnitPriceLKR'
        if price_col not in df.columns:
            return df
        
        # Apply discount based on promotion type
        if type_col is not None and type_col in df.columns:
            for ptype, disc in discount_map.items():
                type_mask = promo_mask & (df[type_col].astype(str).str.strip() == ptype)
                df.loc[type_mask, price_col] = df.loc[type_mask, price_col] * (1 - disc)
            
            # Handle unknown promo types with default discount
            known_types = set(discount_map.keys())
            unknown_mask = promo_mask & (~df[type_col].astype(str).str.strip().isin(known_types))
            df.loc[unknown_mask, price_col] = df.loc[unknown_mask, price_col] * (1 - default_discount)
        else:
            # No type column — apply default discount to all promo rows
            df.loc[promo_mask, price_col] = df.loc[promo_mask, price_col] * (1 - default_discount)
        
        promo_count = promo_mask.sum()
        print(f">>> DataCleaner: Augmented {promo_count} promo rows with realistic discount pricing.")
        
        return df

