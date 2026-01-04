import sys
import os

print(f"Python: {sys.version}")
print(f"CWD: {os.getcwd()}")

try:
    import pandas as pd
    print("Pandas imported")
    import numpy as np
    print("Numpy imported")
    from src.adapters.data_loader import DataLoader
    print("DataLoader imported")
    from src.agents.workers.guardian import DataGuardian
    print("DataGuardian imported")
    from src.engine.forecasting.hybrid_model import HybridForecaster
    print("HybridForecaster imported")
except ImportError as e:
    print(f"IMPORT ERROR: {e}")
except Exception as e:
    print(f"GENERAL ERROR: {e}")
