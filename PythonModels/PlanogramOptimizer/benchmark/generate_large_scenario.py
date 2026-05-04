"""
Large scenario generator for benchmark testing.
Creates 80 products across 20 shelf levels with 10 constraints.
Run this file to regenerate large_scenario.json.
"""
import json
import os
import random

random.seed(42)

CATEGORIES = ['dairy', 'grains', 'bakery', 'beverages', 'personal_care',
              'snacks', 'canned', 'cooking', 'cleaning', 'frozen']
BRANDS = ['Highland', 'Anchor', 'Prima', 'Araliya', 'Munchee', 'Lays', 'Kandos',
          'CocaCola', 'Dettol', 'Sunsilk', 'Signal', 'Heinz', 'Dilmah', 'Nescafe',
          'Parachute', 'Vim', 'Surf', 'Lanka', 'Tropicana', 'Nestle']

products = []
for i in range(1, 81):
    cat = CATEGORIES[(i - 1) % len(CATEGORIES)]
    brand = BRANDS[(i - 1) % len(BRANDS)]
    w = round(random.uniform(5.0, 16.0), 1)
    h = round(random.uniform(4.0, 32.0), 1)
    d = round(random.uniform(4.0, 14.0), 1)
    cost = random.randint(40, 600)
    price = cost + random.randint(30, 250)
    products.append({
        "_id": f"p{i}",
        "sku": f"SKU-LRG-{i:03d}",
        "productName": f"Product {i} ({cat})",
        "widthCm": w,
        "heightCm": h,
        "depthCm": d,
        "minFacings": random.randint(1, 2),
        "maxFacings": random.randint(4, 10),
        "unitCostLKR": cost,
        "baseUnitPriceLKR": price,
        "brand": brand,
        "category": cat
    })

fixtures = []
for fi in range(1, 6):
    fixtures.append({
        "_id": f"f{fi}",
        "aisleBaySide": f"A{fi}-Left",
        "totalWidthCm": 120,
        "totalHeightCm": 200,
        "totalDepthCm": 45
    })

levels = []
lid = 1
heights_from_floor = [20, 65, 115, 165]
for fi in range(1, 6):
    for li, hf in enumerate(heights_from_floor):
        usable_h = 35 if hf < 160 else 28
        levels.append({
            "_id": f"l{lid}",
            "fixtureId": f"f{fi}",
            "levelIndex": li,
            "heightFromFloorCm": hf,
            "usableWidthCm": 120,
            "usableHeightCm": usable_h,
            "usableDepthCm": 40,
            "tags": ["general"]
        })
        lid += 1

constraints = [
    {"name": "Dairy Min 2", "isActive": True, "ruleType": "min_facings_override", "scope": "category", "targetCategory": "dairy", "hardConstraint": True, "penaltyWeight": 100, "params": {"minFacings": 2}},
    {"name": "Beverages Min 1", "isActive": True, "ruleType": "min_facings_override", "scope": "category", "targetCategory": "beverages", "hardConstraint": True, "penaltyWeight": 100, "params": {"minFacings": 1}},
    {"name": "Highland Block", "isActive": True, "ruleType": "brand_block", "scope": "brand", "targetBrand": "Highland", "hardConstraint": False, "penaltyWeight": 50, "params": {}},
    {"name": "Prima Block", "isActive": True, "ruleType": "brand_block", "scope": "brand", "targetBrand": "Prima", "hardConstraint": False, "penaltyWeight": 50, "params": {}},
    {"name": "Nestle Block", "isActive": True, "ruleType": "brand_block", "scope": "brand", "targetBrand": "Nestle", "hardConstraint": False, "penaltyWeight": 50, "params": {}},
    {"name": "Snacks Max 35%", "isActive": True, "ruleType": "max_shelf_share", "scope": "category", "targetCategory": "snacks", "hardConstraint": False, "penaltyWeight": 80, "params": {"maxPercent": 35}},
    {"name": "Cleaning Max 30%", "isActive": True, "ruleType": "max_shelf_share", "scope": "category", "targetCategory": "cleaning", "hardConstraint": False, "penaltyWeight": 80, "params": {"maxPercent": 30}},
    {"name": "Dairy Max 40%", "isActive": True, "ruleType": "max_shelf_share", "scope": "category", "targetCategory": "dairy", "hardConstraint": False, "penaltyWeight": 60, "params": {"maxPercent": 40}},
    {"name": "P1 P2 Adjacent", "isActive": True, "ruleType": "adjacency_required", "scope": "sku", "targetSku": "SKU-LRG-001", "hardConstraint": False, "penaltyWeight": 40, "params": {"adjacentSku": "SKU-LRG-011"}},
    {"name": "P5 P15 Forbidden", "isActive": True, "ruleType": "adjacency_forbidden", "scope": "sku", "targetSku": "SKU-LRG-005", "hardConstraint": True, "penaltyWeight": 100, "params": {"forbiddenSku": "SKU-LRG-015"}}
]

scenario = {
    "scenario_name": "Large",
    "description": "80 products across 20 shelf levels (5 fixtures × 4 levels) — stress test",
    "products": products,
    "fixtures": fixtures,
    "levels": levels,
    "constraints": constraints
}

if __name__ == "__main__":
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "large_scenario.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(scenario, f, indent=2)
    print(f"Generated: {out_path} ({len(products)} products, {len(levels)} levels, {len(constraints)} constraints)")
else:
    # When imported, write the file
    _dir = os.path.dirname(os.path.abspath(__file__))
    _path = os.path.join(_dir, "data", "large_scenario.json")
    if not os.path.exists(_path):
        os.makedirs(os.path.dirname(_path), exist_ok=True)
        with open(_path, "w") as f:
            json.dump(scenario, f, indent=2)
