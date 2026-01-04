import random
import math
import copy
import logging

logger = logging.getLogger(__name__)

class SimulatedAnnealingOptimizer:
    def __init__(self):
        pass

    def _calculate_score(self, placements, products_map, levels_map, config):
        """
        Objective Function:
        Maximize: Sum(Product_Priority * Facings * Level_Quality_Factor)
        """
        score = 0
        
        for p in placements:
            sku = p['sku']
            product = products_map.get(sku)
            if not product: continue
            
            facings = p['facings']
            priority = product.get('priority_score', 0)
            
            # Level Quality Factor
            lvl_id = p['level_id']
            level = levels_map.get(lvl_id)
            
            level_factor = 1.0
            level_depth = 0
            if level:
                h = level.get('heightFromFloorCm', 0)
                level_depth = level.get('usableDepthCm', 0)
                if 100 <= h <= 170: level_factor = 2.0 # Eye Level Boost
                elif h < 100: level_factor = 1.0
                else: level_factor = 0.8 # Top
            
            # Capacity (Depth & Height)
            prod_depth = product.get('depthCm', 1)
            units_deep = math.floor(level_depth / prod_depth)
            if units_deep < 1: units_deep = 1

            # Vertical Stacking (Height)
            prod_height = product.get('heightCm', 1)
            level_height = level.get('usableHeightCm', 0)
            units_high = math.floor(level_height / prod_height)
            if units_high < 1: units_high = 1
            
            # Value = Priority * Facings * UnitsDeep * UnitsHigh * LocationQuality
            # Adding Density Bonus: more units per linear cm
            density_bonus = (units_deep * units_high) 
            
            score += (priority * facings * density_bonus * level_factor)
            
        return score

    def optimize(self, initial_placements, products, levels, config):
        """
        Run Simulated Annealing to improve layout.
        Input: 
          initial_placements: List of dicts (from Heuristic)
          products: List of product dicts
          levels: List of level dicts
        """
        # --- Initialization ---
        # We need a data structure that allows easy modification.
        # Current 'placements' is a flat list. 
        # State: { level_id: { remaining_width, items: [ {sku, facings, ...} ] } }
        # Reconstruct state from placements for easier mutation
        
        products_map = {p['sku']: p for p in products}
        levels_map = {l['_id']: l for l in levels}
        
        state = {}
        for l in levels:
            state[l['_id']] = {
                'obj': l,
                'remaining_width': l['usableWidthCm'],
                'items': []
            }
            
        # Fill state from initial placements
        for p in initial_placements:
            lid = p['level_id']
            sku = p['sku']
            prod = products_map.get(sku)
            if not prod: continue
            
            state[lid]['items'].append({
                'sku': sku,
                'facings': p['facings'],
                'width_one': prod['widthCm'],
                'total_width': p['width_used'],
                # Keep reference to product constraints
                'min_facings': prod.get('minFacings', 1),
                'max_facings': prod.get('maxFacings', 10),
                'height': prod['heightCm'],
                'depth': prod['depthCm']
            })
            state[lid]['remaining_width'] -= p['width_used']
            
        current_state = state
        current_score = self._score_state(current_state, products_map)
        
        best_state = copy.deepcopy(current_state)
        best_score = current_score
        
        # Hyperparams
        hyperparams = config.get('hyperparams', {})
        temp = hyperparams.get('initialTemperature', 1000)
        cooling_rate = hyperparams.get('coolingRate', 0.98)
        iterations = hyperparams.get('iterations', 500)
        
        logger.info(f"Starting SA: Temp={temp}, Iterations={iterations}, InitialScore={current_score}")

        for i in range(iterations):
            # 1. Perturb
            neighbor_state = self._perturb(current_state, levels, products_map)
            
            # 2. Evaluate
            neighbor_score = self._score_state(neighbor_state, products_map)
            
            # 3. Acceptance
            delta = neighbor_score - current_score
            
            if delta > 0:
                accept = True
            else:
                try:
                    prob = math.exp(delta / temp)
                except OverflowError:
                    prob = 0
                accept = random.random() < prob
            
            if accept:
                current_state = neighbor_state
                current_score = neighbor_score
                
                if current_score > best_score:
                    best_score = current_score
                    best_state = copy.deepcopy(current_state)
            
            # 4. Cool
            temp *= cooling_rate
            if temp < 1: break
            
        logger.info(f"SA Finished: BestScore={best_score}")
        
        # --- Convert State back to Flat Placements ---
        final_placements = self._state_to_placements(best_state, levels_map)
        return final_placements, best_score

    def _score_state(self, state, products_map):
        """Helper to calculate score from State dict"""
        score = 0
        for lid, s in state.items():
            level = s['obj']
            # Level Factor
            h = level.get('heightFromFloorCm', 0)
            level_depth = level.get('usableDepthCm', 0)
            
            if 100 <= h <= 170: level_factor = 2.0
            elif h < 100: level_factor = 1.0
            else: level_factor = 0.8
            
            for item in s['items']:
                prod = products_map.get(item['sku'])
                if prod:
                    prio = prod.get('priority_score', 0)
                    
                    # Capacity
                    prod_depth = prod.get('depthCm', 1)
                    units_deep = math.floor(level_depth / prod_depth)
                    if units_deep < 1: units_deep = 1

                    # Height Capacity (Stacking)
                    prod_height = prod.get('heightCm', 1)
                    level_height = level.get('usableHeightCm', 0)
                    units_high = math.floor(level_height / prod_height)
                    if units_high < 1: units_high = 1
                    
                    density_bonus = (units_deep * units_high)

                    score += (prio * item['facings'] * density_bonus * level_factor)
        return score

    def _state_to_placements(self, state, levels_map):
        placements = []
        for lid, s in state.items():
            lvl = levels_map[lid]
            current_x = 0
            # Sort for display? Maybe SA scrambled order. Let's keep order in list.
            for item in s['items']:
                placements.append({
                    'sku': item['sku'],
                    'level_id': lid,
                    'fixture_id': lvl.get('fixtureId'),
                    'facings': item['facings'],
                    'x_position': current_x,
                    'y_position': 0,
                    'width_used': item['total_width']
                })
                current_x += item['total_width']
        return placements

    def _perturb(self, state, levels, products_map):
        """
        Randomly modify the state.
        Returns a NEW state object (deep copy).
        """
        new_state = copy.deepcopy(state)
        
        # Pick a random non-empty level (source)
        non_empty = [lid for lid, s in new_state.items() if s['items']]
        if not non_empty: return new_state
        
        source_lid = random.choice(non_empty)
        source_shelf = new_state[source_lid]
        
        # Pick a random item on this shelf
        item_idx = random.randint(0, len(source_shelf['items']) - 1)
        item = source_shelf['items'][item_idx]
        
        # Choose Move
        move_type = random.choice(['add_facing', 'remove_facing', 'move_level'])
        
        if move_type == 'add_facing':
            # Check Max Facings
            if item['facings'] < item['max_facings']:
                # Check Width
                if source_shelf['remaining_width'] >= item['width_one']:
                    item['facings'] += 1
                    item['total_width'] += item['width_one']
                    source_shelf['remaining_width'] -= item['width_one']
                    
        elif move_type == 'remove_facing':
            # Check Min Facings
            if item['facings'] > item['min_facings']:
                item['facings'] -= 1
                item['total_width'] -= item['width_one']
                source_shelf['remaining_width'] += item['width_one']
                
        elif move_type == 'move_level':
            # Pick valid target level
            all_lids = list(new_state.keys())
            target_lid = random.choice(all_lids)
            
            if target_lid != source_lid:
                target_shelf = new_state[target_lid]
                target_obj = target_shelf['obj']
                
                # Check Dimensions
                if target_obj['usableHeightCm'] >= item['height'] and target_obj['usableDepthCm'] >= item['depth']:
                    # Check Capacity
                    if target_shelf['remaining_width'] >= item['total_width']:
                        # Move it
                        # Remove from source
                        source_shelf['items'].pop(item_idx)
                        source_shelf['remaining_width'] += item['total_width']
                        
                        # Add to target
                        target_shelf['items'].append(item)
                        target_shelf['remaining_width'] -= item['total_width']
                        
        return new_state
