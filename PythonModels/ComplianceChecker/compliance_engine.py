import json
from typing import List, Dict, Any
from dataclasses import dataclass, asdict

@dataclass
class ComplianceDeviation:
    type: str  # MISSING_ITEM, EXTRA_ITEM, MISPLACED_ITEM, FACING_MISMATCH
    sku: str
    description: str
    severity: str  # HIGH, MEDIUM, LOW
    current_state: Dict[str, Any]
    optimized_state: Dict[str, Any]

class ComplianceEngine:
    def __init__(self):
        pass

    def _get_placement_key(self, p):
        # Unique identifier for a placement position
        return f"{p.get('sku')}_{p.get('fixtureId')}_{p.get('levelIndex')}"

    def compare_planograms(self, current_data: Dict, optimized_data: Dict) -> List[Dict]:
        """
        Compare current layout vs optimized layout.
        Expects input format:
        {
            "placements": [
                { "sku": "A1", "fixtureId": "F1", "levelIndex": 1, "positionXcm": 10, "facings": 2, "productName": "..." }
            ]
        }
        """
        deviations = []
        
        # Index data for O(1) lookup
        # Map: SKU -> List of placements (since SKU can appear multiple times)
        opt_map = {}
        for p in optimized_data.get('placements', []):
            sku = p.get('sku')
            if sku not in opt_map:
                opt_map[sku] = []
            opt_map[sku].append(p)

        curr_map = {}
        for p in current_data.get('placements', []):
            sku = p.get('sku')
            if sku not in curr_map:
                curr_map[sku] = []
            curr_map[sku].append(p)

        # 1. Check for MISSING Items (In Optimized but not in Current)
        for sku, opt_placements in opt_map.items():
            if sku not in curr_map:
                for p in opt_placements:
                    deviations.append(ComplianceDeviation(
                        type="MISSING_ITEM",
                        sku=sku,
                        description=f"Item {sku} is missing from the shelf.",
                        severity="HIGH",
                        current_state=None,
                        optimized_state=p
                    ))
            else:
                # SKU exists, but check if we have enough instances?
                # Simple check: Count mismatch
                if len(curr_map[sku]) < len(opt_placements):
                     deviations.append(ComplianceDeviation(
                        type="MISSING_INSTANCE",
                        sku=sku,
                        description=f"Missing {len(opt_placements) - len(curr_map[sku])} facings/instances of {sku}.",
                        severity="MEDIUM",
                        current_state={"count": len(curr_map[sku])},
                        optimized_state={"count": len(opt_placements)}
                    ))

        # 2. Check for EXTRA Items (In Current but not in Optimized)
        for sku, curr_placements in curr_map.items():
            if sku not in opt_map:
                for p in curr_placements:
                    deviations.append(ComplianceDeviation(
                        type="EXTRA_ITEM",
                        sku=sku,
                        description=f"Item {sku} should not be on this shelf.",
                        severity="MEDIUM",
                        current_state=p,
                        optimized_state=None
                    ))

        # 3. Check for MISPLACEMENT (Location verification)
        # Detailed check for items present in both
        for sku in opt_map:
            if sku in curr_map:
                # Heuristic: Try to match placements by closest location
                # For this academic implementation, we'll assume strict matching by Level first
                opts = opt_map[sku]
                currs = curr_map[sku]
                
                # Simple case: 1 vs 1 comparison
                if len(opts) == 1 and len(currs) == 1:
                    o = opts[0]
                    c = currs[0]
                    
                    # Level Mismatch (Critical)
                    if o.get('levelIndex') != c.get('levelIndex'):
                        deviations.append(ComplianceDeviation(
                            type="MISPLACED_ITEM",
                            sku=sku,
                            description=f"Item {sku} is on Level {c.get('levelIndex')}, should be on Level {o.get('levelIndex')}.",
                            severity="HIGH",
                            current_state=c,
                            optimized_state=o
                        ))
                    
                    # Facing Mismatch
                    elif o.get('facings') != c.get('facings'):
                         deviations.append(ComplianceDeviation(
                            type="FACING_MISMATCH",
                            sku=sku,
                            description=f"Item {sku} has {c.get('facings')} facings, should have {o.get('facings')}.",
                            severity="LOW",
                            current_state=c,
                            optimized_state=o
                        ))
                    
                    # Position Deviation (Warning)
                    elif abs(o.get('positionXcm', 0) - c.get('positionXcm', 0)) > 5: # 5cm tolerance
                         deviations.append(ComplianceDeviation(
                            type="POSITION_DEVIATION",
                            sku=sku,
                            description=f"Item {sku} is shifted by {abs(o.get('positionXcm', 0) - c.get('positionXcm', 0))}cm.",
                            severity="LOW",
                            current_state=c,
                            optimized_state=o
                        ))

        return [asdict(d) for d in deviations]

if __name__ == "__main__":
    # Test Stub
    engine = ComplianceEngine()
    current_test = {"placements": [{"sku": "A", "levelIndex": 1, "facings": 1}]}
    opt_test = {"placements": [{"sku": "A", "levelIndex": 2, "facings": 1}, {"sku": "B", "levelIndex": 1}]}
    
    print(json.dumps(engine.compare_planograms(current_test, opt_test), indent=2))
