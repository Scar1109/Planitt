import pandas as pd
import pandera as pa
from typing import Dict, Any

class DataGuardian:
    """
    The Guardian ensures data quality before it enters the ML Pipeline.
    Refactored to use Pandera Functional API for maximum compatibility.
    """
    
    def __init__(self):
        # Define Schema using Functional API (More robust to environment issues)
        self.sales_schema = pa.DataFrameSchema({
            "SKU": pa.Column(str, required=False), # Validates if present
            "UnitsSold": pa.Column(float, pa.Check.ge(0), required=False),
            "AvgPrice": pa.Column(float, pa.Check.ge(0), required=False),
            # Date is handled separately due to pandas timestamps complexity
        })

    def validate_ingest(self, df: pd.DataFrame) -> Dict[str, Any]:
        report = {
            "total_rows": len(df),
            "missing_values": df.isnull().sum().to_dict(),
            "status": "PASS"
        }
        
        # 1. Check Critical Columns
        critical_cols = ['Date', 'SKU', 'UnitsSold', 'AvgPrice']
        missing_crit = [c for c in critical_cols if c not in df.columns]
        
        if missing_crit:
            report['status'] = "FAIL"
            report['error'] = f"Missing critical columns: {missing_crit}"
            return report
            
        # 2. Schema Validation (Soft)
        try:
            self.sales_schema.validate(df, lazy=True)
        except pa.errors.SchemaErrors as err:
            report['schema_errors'] = len(err.failure_cases)
            # We don't fail immediately, just log
        except Exception as e:
            report['schema_errors'] = str(e)
            
        # 3. Biz Logic Checks
        # Negative Sales
        if 'UnitsSold' in df.columns:
            neg_sales = df[df['UnitsSold'] < 0]
            if not neg_sales.empty:
                report['negative_sales_rows'] = len(neg_sales)
            
        return report

    def clean_and_impute(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Fixes common issues:
        - Fills missing weather with ffill
        - Clips negative values
        """
        df = df.copy()
        
        # Sort by Date for imputing
        if 'Date' in df.columns:
            df = df.sort_values(by=['SKU', 'Date'])
            
        # Impute Weather (Forward Fill)
        weather_cols = ['AvgTemp', 'RainfallMM'] # Example
        for col in weather_cols:
            if col in df.columns:
                df[col] = df[col].ffill().bfill()
                
        # Clip Negatives
        if 'UnitsSold' in df.columns:
            df['UnitsSold'] = df['UnitsSold'].clip(lower=0)
            
        return df
