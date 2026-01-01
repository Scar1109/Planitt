from impact_estimator import ImpactEstimator
import json

print("Initializing Estimator...")
est = ImpactEstimator()

print(f"Product Map Size: {len(est.product_map)}")
sku = "LOC-BONI-1KG-E7"

print(f"Checking SKU: '{sku}'")
if sku in est.product_map:
    print("Found!")
    print(est.product_map[sku])
else:
    print("Not Found!")
    print("First 5 keys:", list(est.product_map.keys())[:5])
