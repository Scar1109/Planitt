import logging

logger = logging.getLogger(__name__)

def placements_to_state(placements, products, levels):
    """Helper: convert flat placements back to state dict for scoring."""
    products_map = {p['sku']: p for p in products}
    state = {}

    for l in levels:
        state[str(l['_id'])] = {
            'obj': l,
            'remaining_width': l['usableWidthCm'],
            'items': []
        }

    for p in placements:
        lid = str(p['level_id'])
        sku = p['sku']
        prod = products_map.get(sku)
        if not prod or lid not in state:
            continue

        width_used = p.get('width_used', p['facings'] * prod['widthCm'])
        
        state[lid]['items'].append({
            'sku': sku,
            'facings': p['facings'],
            'width_one': prod['widthCm'],
            'total_width': width_used,
            'min_facings': prod.get('minFacings', 1),
            'max_facings': prod.get('maxFacings', 10),
            'height': prod['heightCm'],
            'depth': prod['depthCm']
        })
        state[lid]['remaining_width'] -= width_used

    return state

def score_state(state, products_map, constraint_checker=None):
    """
    Evaluate the objective function for a given state.
    Ported from SimulatedAnnealingOptimizer.
    """
    score = 0
    for lid, s in state.items():
        level = s['obj']
        h = level.get('heightFromFloorCm', 0)

        # Level Quality Factor (ergonomic)
        if 100 <= h <= 170:
            level_factor = 2.0   # Eye level
        elif h < 100:
            level_factor = 1.0   # Bottom
        else:
            level_factor = 0.8   # Top

        # Category & Dimension Penalties
        level_tags = [t.lower().strip() for t in level.get('tags', [])]
        is_general_level = not level_tags or any(t in ('general', 'misc') for t in level_tags)

        for item in s['items']:
            prod = products_map.get(item['sku'])
            if not prod: continue
            
            # 1. Category mismatch (if level has tags)
            if not is_general_level:
                cat = (prod.get('category', '') or '').lower()
                allowed_tags = [t.lower().strip() for t in (prod.get('allowedTags') or [])]
                
                # Check strict match first (category or allowedTags)
                strict_match = any(tag in cat or cat in tag for tag in level_tags) if cat else False
                if not strict_match and allowed_tags:
                    strict_match = any(
                        at in tag or tag in at 
                        for at in allowed_tags for tag in level_tags
                    )
                
                if not strict_match:
                    # Check if it's a cross-department violation (much worse)
                    FOOD_KW = {'beverages','dairy','bakery','frozen','snacks','confectionery','rice','dry goods','baby','instant'}
                    NON_FOOD_KW = {'household','cleaning','personal care','personal','stationery','health','beauty'}
                    
                    def _family(text):
                        if not text: return 'unknown'
                        t = text.lower()
                        if any(k in t for k in FOOD_KW): return 'food'
                        if any(k in t for k in NON_FOOD_KW): return 'non_food'
                        return 'unknown'
                    
                    prod_family = _family(cat)
                    shelf_families = {_family(tag) for tag in level_tags} - {'unknown'}
                    
                    if prod_family != 'unknown' and shelf_families and prod_family not in shelf_families:
                        score -= 200  # Cross-department violation (severe)
                    else:
                        score -= 30   # Same department, wrong subcategory (mild)

            # 2. Dimensions mismatch
            if item['height'] > level.get('usableHeightCm', 100):
                score -= 2000 # Hard physical impossibility
            if item['depth'] > level.get('usableDepthCm', 100):
                score -= 2000 # Hard physical impossibility

            # 3. Minimum facings violation
            min_f = prod.get('minFacings', 1)
            if item['facings'] < min_f:
                score -= 500 * (min_f - item['facings'])

            # --- Basic Score ---
            priority = prod.get('priority', 1.0)
            density = (item['depth'] / level.get('usableDepthCm', 1)) * \
                      (item['height'] / level.get('usableHeightCm', 1))
            
            score += priority * item['facings'] * density * level_factor

    # Penalties for width overflow (Physical Constraints)
    for lid, s in state.items():
        if s['remaining_width'] < 0:
            # Huge penalty for overflow: base penalty + multiplier of overflow amount
            score -= (5000 + abs(s['remaining_width']) * 50)

    # Penalties for constraint violations (User Logic)
    if constraint_checker:
        # Convert list of items to dict for checker
        state_for_checker = {}
        for lid, s in state.items():
            state_for_checker[lid] = {
                'obj': s['obj'],
                'remaining_width': s['remaining_width'],
                'items': {item['sku']: item for item in s['items']}
            }
        penalty, _ = constraint_checker.compute_penalty(state_for_checker)
        score -= penalty

    return score

def fitness_score(state, products_map):
    """
    Compute a pure fitness score (always >= 0) for display purposes.
    
    This is the "goodness" of the layout without penalty deductions.
    Formula: Σ (priority × facings × density_bonus × level_factor)
    
    Where density_bonus = units_deep × units_high (how well the product
    fills the shelf depth and height).
    
    Used for the API response score shown to users. The penalty-adjusted
    score_state() is used internally by optimizers only.
    """
    import math
    score = 0.0
    for lid, s in state.items():
        level = s['obj']
        h = level.get('heightFromFloorCm', 0)
        level_depth = level.get('usableDepthCm', 1)
        level_height = level.get('usableHeightCm', 1)

        # Level Quality Factor (ergonomic)
        if 100 <= h <= 170:
            level_factor = 2.0   # Eye level
        elif h < 100:
            level_factor = 1.0   # Bottom
        else:
            level_factor = 0.8   # Top

        items = s['items']
        if isinstance(items, dict):
            items = list(items.values())

        for item in items:
            prod = products_map.get(item['sku'])
            if not prod:
                continue

            priority = prod.get('priority_score', prod.get('priority', 1.0))

            # Density bonus: how many units deep × high fit on this shelf
            prod_depth = prod.get('depthCm', 1)
            prod_height = prod.get('heightCm', 1)
            units_deep = max(1, math.floor(level_depth / prod_depth))
            units_high = max(1, math.floor(level_height / prod_height))
            density_bonus = units_deep * units_high

            score += priority * item['facings'] * density_bonus * level_factor

    return round(score, 2)

def state_to_placements(state, products_map):
    """
    Convert internal shelf state (grouped by levels) back to a flat list of 
    placements with coordinates and full metadata for the frontend.
    """
    final_placements = []
    
    for lid, s in state.items():
        level = s['obj']
        # s['items'] is a list in state (from placements_to_state) 
        # or it might be a dict depending on who calls it.
        # Let's handle both.
        items = s['items']
        if isinstance(items, dict):
            items = list(items.values())
            
        # Sort items by priority (highest priority on left)
        # We try to get priority from products_map if not in item
        for item in items:
            if 'priority' not in item:
                item['priority'] = products_map.get(item['sku'], {}).get('priority_score', 0)
        
        items.sort(key=lambda x: x.get('priority', 0), reverse=True)

        current_x = 0
        for item in items:
            sku = item['sku']
            prod = products_map.get(sku, {})
            
            placement = {
                'sku': sku,
                'product_id': prod.get('_id') or item.get('product_id'),
                'level_id': str(lid),
                'fixture_id': str(level.get('fixtureId', '')),
                'facings': item['facings'],
                'x_position': float(current_x),
                'y_position': 0.0,
                'width_used': float(item['total_width']),
                # Include these for safety
                'width_one': float(prod.get('widthCm', 10)),
                'height': float(prod.get('heightCm', 10)),
                'depth': float(prod.get('depthCm', 10))
            }
            final_placements.append(placement)
            current_x += item['total_width']
            
    return final_placements
