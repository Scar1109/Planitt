from prophet import Prophet
import pandas as pd
import logging

# Mute logs
logging.getLogger('cmdstanpy').setLevel(logging.WARNING)
logging.getLogger('prophet').setLevel(logging.WARNING)

def test_prophet_init():
    print(">>> Testing Prophet Initialization...")
    try:
        m = Prophet()
        print("[PASS] Prophet instantiated successfully.")
    except Exception as e:
        print(f"[FAIL] Prophet init failed: {e}")
        return

    print(">>> Testing Prophet Fitting...")
    try:
        df = pd.DataFrame({
            'ds': pd.date_range(start='2023-01-01', periods=20),
            'y': list(range(20))
        })
        m.fit(df)
        print("[PASS] Prophet fit successfully.")
    except Exception as e:
        print(f"[FAIL] Prophet fit failed: {e}")

if __name__ == "__main__":
    test_prophet_init()
