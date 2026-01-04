import logging

logger = logging.getLogger(__name__)

class HeuristicOptimizer:
    def __init__(self):
        pass

    def generate_layout(self, products, fixtures, levels):
        """
        Generate a layout using the Advanced Heuristic Strategy (4-Step):
        1. Place Minimum Facings (Constraint Satisfaction)
        2. Prioritize Eye-Level Shelves (Business Logic)
        3. Fill Remaining Space (Maximization)
        4. Render Blocks (Packing)
        """
        # --- Pre-processing ---
        
        # 1. Sort Products by Priority (Highest First)
        # Assuming 'priority_score' is already calculated by the ranker
        sorted_products = sorted(products, key=lambda x: x.get('priority_score', 0), reverse=True)
        
        # 2. Sort Levels by Quality (Eye Level > Bottom > Top) AND Depth
        # Eye level approx 120cm - 160cm from floor
        def get_level_score(level):
            h = level.get('heightFromFloorCm', 0)
            d = level.get('usableDepthCm', 0)
            
            score = 0
            
            # Position Score
            if 100 <= h <= 170: score += 100 # Prime Eye Level
            elif h < 100: score += 50 # Bottom (Accessible but lower value)
            else: score += 10 # Top (Harder to reach)
            
            # Depth Score (Prefer deeper shelves)
            score += (d * 0.5)
            
            return score
            
        sorted_levels = sorted(levels, key=get_level_score, reverse=True)
        logger.info(f"Sorted Levels: {[l['_id'] for l in sorted_levels]}")
        
        # Track State
        # Map: level_id -> { remaining_width, items: [ {sku, facings, ...} ] }
        shelf_state = {}
        for lvl in levels:
            shelf_state[lvl['_id']] = {
                'obj': lvl,
                'remaining_width': lvl['usableWidthCm'],
                'items': {} # sku -> placement_obj
            }
            
        # Map: sku -> assigned_level_id (Strict blocking: one SKU on one shelf)
        product_assignments = {} 

        # --- Step 1: Place Minimum Facings ---
        logger.info("Step 1: Assigning Minimum Facings...")
        
        for p in sorted_products:
            sku = p['sku']
            min_facings = p.get('minFacings', 1)
            # --- Constraint Checks ---
            product_tags = p.get('tags', []) # e.g. ["biscuits", "sweet"]
            product_category = p.get('category', '').lower()
            
            min_facings = p.get('minFacings', 1)
            
            # Standard Dims
            width = p['widthCm']
            height = p['heightCm']
            depth = p['depthCm']
            
            needed_width = min_facings * width
            
            placed = False
            # Find best shelf
            for lvl in sorted_levels:
                lid = lvl['_id']
                state = shelf_state[lid]
                
                # TAG MATCHING LOGIC
                # Normalize tags to lower case for comparison
                level_tags = [t.lower() for t in lvl.get('tags', [])]
                product_tags_lower = [t.lower() for t in product_tags]
                
                # If Level has tags, strict enforcement?
                if level_tags:
                    # 1. Generic OPEN Shelf Check
                    # If shelf is explicitly "general" or "misc", allow ANYTHING (skip other checks)
                    if "general" in level_tags or "misc" in level_tags:
                        pass # Allow placement
                        
                    # 2. Special Rule: Coolers
                    elif "cooler" in level_tags or "beverages" in level_tags:
                        # Must be beverage/cooler item
                        if not ("beverages" in product_tags_lower or "soda" in product_tags_lower or "juice" in product_tags_lower or "cold_drinks" in product_tags_lower):
                            continue # Skip non-beverages
                        # No snacks in cooler
                        if "chips" in product_tags_lower or "nuts" in product_tags_lower:
                            continue
                            
                    # 3. Special Rule: Snacks
                    elif "snacks" in level_tags:
                         if not ("snacks" in product_tags_lower or "chips" in product_tags_lower or "nuts" in product_tags_lower or "biscuits" in product_tags_lower):
                            # Allow biscuits in snack aisle? Maybe strict:
                            if "biscuits" not in level_tags: 
                                pass 
                            
                    # 4. Generic Match for Critical Categories
                    else:
                        critical_tags = {"biscuits", "noodles", "pasta", "spices", "beverages", "snacks"}
                        shelf_critical = critical_tags.intersection(set(level_tags))
                        prod_critical = critical_tags.intersection(set(product_tags_lower))
                        
                        if shelf_critical:
                            # If shelf is critical type (e.g. Biscuits), product MUST share at least one
                            # UNLESS product category matches the critical tag
                            if not shelf_critical.intersection(set(product_tags_lower)) and product_category not in shelf_critical:
                                continue

                # Check Dimensions
                if lvl['usableHeightCm'] < height: continue
                if lvl['usableDepthCm'] < depth: continue
                
                # Check Capacity
                if state['remaining_width'] >= needed_width:
                    # Assign
                    product_assignments[sku] = lid
                    state['items'][sku] = {
                        'sku': sku,
                        'product_id': p.get('_id'),
                        'facings': min_facings,
                        'width_one': width,
                        'total_width': needed_width,
                        'priority': p.get('priority_score', 0),
                        'priority': p.get('priority_score', 0),
                        'max_facings': p.get('maxFacings', 10),
                        'height': height,
                        'depth': depth
                    }
                    state['remaining_width'] -= needed_width
                    placed = True
                    break
            
            if not placed:
                logger.warning(f"Failed to place essential product {sku} (Min Facings: {min_facings})")

        # --- Step 2 & 3: Fill Remaining Width ---
        logger.info("Step 2 & 3: Filling Remaining Width...")
        
        # Loop through products again to add facings where space exists on their assigned shelf
        # We loop continuously until no more items can be added
        changed = True
        while changed:
            changed = False
            for p in sorted_products:
                sku = p['sku']
                if sku not in product_assignments:
                    continue # specific logic: if not placed min, don't try to add max (or could try to place min again?)
                
                lid = product_assignments[sku]
                state = shelf_state[lid]
                item_data = state['items'][sku]
                
                current_facings = item_data['facings']
                max_facings = item_data['max_facings']
                width_one = item_data['width_one']
                
                # Check constraints
                if current_facings < max_facings and state['remaining_width'] >= width_one:
                    # Add Facing
                    item_data['facings'] += 1
                    item_data['total_width'] += width_one
                    state['remaining_width'] -= width_one
                    changed = True

        # --- Step 4: Pack (Generate Coordinates) ---
        logger.info("Step 4: generating Coordinates...")
        
        final_placements = []
        
        for lid, state in shelf_state.items():
            lvl = state['obj']
            # Sort items on this shelf by priority (Left to Right)
            items_on_shelf = list(state['items'].values())
            items_on_shelf.sort(key=lambda x: x['priority'], reverse=True)
            
            current_x = 0
            
            for item in items_on_shelf:
                placement = {
                    'product_id': item['product_id'],
                    'sku': item['sku'],
                    'level_id': lid,
                    'fixture_id': lvl.get('fixtureId'),
                    'facings': item['facings'],
                    'x_position': current_x,
                    'y_position': 0, # Bottom aligned
                    'width_used': item['total_width'],
                    'height': lvl['usableHeightCm'], # Just for ref
                    'depth': lvl['usableDepthCm']
                }
                final_placements.append(placement)
                
                current_x += item['total_width']
                
        return final_placements, shelf_state
