"""
Simulated Annealing (SA) Metaheuristic for Planogram Optimization.

Mathematical Formulation:
─────────────────────────
Objective: max f(x) = Σᵢ (Pᵢ · Fᵢ · Dᵢ · Lᵢ) - λ · Σⱼ penalty(cⱼ)

Where:
  Pᵢ  = Priority score of product i (from ML ranker)
  Fᵢ  = Number of facings for product i
  Dᵢ  = Depth × Height capacity (density bonus)
  Lᵢ  = Level quality factor (eye-level = 2.0, bottom = 1.0, top = 0.8)
  cⱼ  = Constraint violation j
  λ   = Penalty weight for soft constraints

Acceptance Probability (Metropolis criterion):
  P(accept) = 1                  if Δf > 0
             = exp(Δf / T)       if Δf ≤ 0

Cooling Schedule:
  T(k+1) = α · T(k)    (geometric cooling)
  Adaptive reheat: T = T × β when stagnation detected

Neighborhood Operators:
  1. Add Facing    — increase facings for a random product on its shelf
  2. Remove Facing — decrease facings for a random product on its shelf
  3. Move Level    — relocate a product to a different shelf
  4. Swap Products — swap two products between different shelves

References:
  Kirkpatrick, S. et al. (1983). "Optimization by Simulated Annealing."
  Talbi, E.-G. (2009). "Metaheuristics: From Design to Implementation."
"""
import random
import math
import copy
import logging

logger = logging.getLogger(__name__)


class SimulatedAnnealingOptimizer:
    """
    Simulated Annealing metaheuristic optimizer for shelf-space allocation.
    
    Accepts an initial solution (from the constructive heuristic) and
    iteratively improves it through stochastic neighborhood search.
    """

    def __init__(self):
        pass

    @staticmethod
    def _category_matches_shelf(product_category, shelf_obj):
        """Check if a product's category is compatible with a shelf's tags."""
        tags = [t.lower().strip() for t in shelf_obj.get('tags', [])]
        if not tags:
            return True  # No tags = accepts anything
        if any(t in ('general', 'misc') for t in tags):
            return True
        if not product_category:
            return True
        pc = product_category.lower().strip()
        for tag in tags:
            if pc in tag or tag in pc:
                return True
        return False

    def _score_state(self, state, products_map, constraint_checker=None):
        """
        Evaluate the objective function for a given state.
        
        Score = Σᵢ (priority × facings × density_bonus × level_factor) - penalty
        
        Args:
            state: dict of level_id -> { obj, remaining_width, items }
            products_map: dict of sku -> product dict
            constraint_checker: optional ConstraintChecker for penalty computation
        
        Returns:
            float: objective function value
        """
        score = 0
        for lid, s in state.items():
            level = s['obj']
            h = level.get('heightFromFloorCm', 0)
            level_depth = level.get('usableDepthCm', 0)
            level_height = level.get('usableHeightCm', 0)

            # Level Quality Factor (ergonomic)
            if 100 <= h <= 170:
                level_factor = 2.0   # Eye level
            elif h < 100:
                level_factor = 1.0   # Bottom
            else:
                level_factor = 0.8   # Top

            for item in s['items']:
                prod = products_map.get(item['sku'])
                if prod:
                    prio = prod.get('priority_score', 0)

                    # Depth capacity (units deep)
                    prod_depth = prod.get('depthCm', 1)
                    units_deep = math.floor(level_depth / prod_depth)
                    if units_deep < 1:
                        units_deep = 1

                    # Height capacity (stacking)
                    prod_height = prod.get('heightCm', 1)
                    units_high = math.floor(level_height / prod_height)
                    if units_high < 1:
                        units_high = 1

                    density_bonus = units_deep * units_high
                    score += (prio * item['facings'] * density_bonus * level_factor)

        # Subtract constraint penalties
        if constraint_checker:
            # Convert items list to dict format for checker
            state_dict = {}
            for lid, s in state.items():
                state_dict[lid] = {
                    'obj': s['obj'],
                    'remaining_width': s['remaining_width'],
                    'items': {item['sku']: item for item in s['items']}
                }
            penalty, _ = constraint_checker.compute_penalty(state_dict)
            score -= penalty

        return score

    def _state_to_placements(self, state, levels_map):
        """Convert internal state dict back to flat placement list."""
        placements = []
        for lid, s in state.items():
            lvl = levels_map[lid]
            current_x = 0
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
        Generate a neighbor solution by applying one random move.
        Returns a NEW state (deep copy).

        Neighborhood operators:
          1. add_facing    — +1 facing if below max and space available
          2. remove_facing — -1 facing if above min
          3. move_level    — relocate product to different shelf (if fits)
          4. swap          — swap two products between different shelves
        """
        new_state = copy.deepcopy(state)

        non_empty = [lid for lid, s in new_state.items() if s['items']]
        if not non_empty:
            return new_state

        source_lid = random.choice(non_empty)
        source_shelf = new_state[source_lid]

        item_idx = random.randint(0, len(source_shelf['items']) - 1)
        item = source_shelf['items'][item_idx]

        move_type = random.choice(['add_facing', 'remove_facing', 'move_level', 'swap'])

        if move_type == 'add_facing':
            if item['facings'] < item['max_facings']:
                if source_shelf['remaining_width'] >= item['width_one']:
                    item['facings'] += 1
                    item['total_width'] += item['width_one']
                    source_shelf['remaining_width'] -= item['width_one']

        elif move_type == 'remove_facing':
            if item['facings'] > item['min_facings']:
                item['facings'] -= 1
                item['total_width'] -= item['width_one']
                source_shelf['remaining_width'] += item['width_one']

        elif move_type == 'move_level':
            all_lids = list(new_state.keys())
            target_lid = random.choice(all_lids)

            if target_lid != source_lid:
                target_shelf = new_state[target_lid]
                target_obj = target_shelf['obj']

                # Category coherence check
                item_category = products_map.get(item['sku'], {}).get('category', '')
                if not self._category_matches_shelf(item_category, target_obj):
                    pass  # Skip — category mismatch
                elif (target_obj['usableHeightCm'] >= item['height']
                        and target_obj['usableDepthCm'] >= item['depth']
                        and target_shelf['remaining_width'] >= item['total_width']):
                    # Check product doesn't already exist on target shelf
                    existing_skus = {it['sku'] for it in target_shelf['items']}
                    if item['sku'] not in existing_skus:
                        source_shelf['items'].pop(item_idx)
                        source_shelf['remaining_width'] += item['total_width']
                        target_shelf['items'].append(item)
                        target_shelf['remaining_width'] -= item['total_width']

        elif move_type == 'swap':
            # Swap two products between different shelves
            other_non_empty = [lid for lid in non_empty if lid != source_lid]
            if other_non_empty:
                target_lid = random.choice(other_non_empty)
                target_shelf = new_state[target_lid]

                if target_shelf['items']:
                    target_idx = random.randint(0, len(target_shelf['items']) - 1)
                    target_item = target_shelf['items'][target_idx]

                    source_obj = source_shelf['obj']
                    target_obj = target_shelf['obj']

                    # Check if items fit on swapped shelves
                    source_new_width = source_shelf['remaining_width'] + item['total_width'] - target_item['total_width']
                    target_new_width = target_shelf['remaining_width'] + target_item['total_width'] - item['total_width']

                    if (source_new_width >= 0 and target_new_width >= 0
                            and source_obj['usableHeightCm'] >= target_item['height']
                            and source_obj['usableDepthCm'] >= target_item['depth']
                            and target_obj['usableHeightCm'] >= item['height']
                            and target_obj['usableDepthCm'] >= item['depth']):
                        # Category coherence: each item must match its new shelf
                        item_cat = products_map.get(item['sku'], {}).get('category', '')
                        target_item_cat = products_map.get(target_item['sku'], {}).get('category', '')
                        if (self._category_matches_shelf(item_cat, target_obj)
                                and self._category_matches_shelf(target_item_cat, source_obj)):
                            source_shelf['items'][item_idx] = target_item
                            target_shelf['items'][target_idx] = item
                            source_shelf['remaining_width'] = source_new_width
                            target_shelf['remaining_width'] = target_new_width

        return new_state

    def optimize(self, initial_placements, products, levels, config, constraint_checker=None):
        """
        Run Simulated Annealing to refine the heuristic solution.

        Args:
            initial_placements: flat list of placement dicts from heuristic
            products: list of ranked product dicts
            levels: list of level dicts
            config: optimization config dict
            constraint_checker: ConstraintChecker instance (optional)

        Returns:
            (placements, score, convergence_history)
        """
        products_map = {p['sku']: p for p in products}
        levels_map = {l['_id']: l for l in levels}

        # Build internal state from initial placements
        state = {}
        for l in levels:
            state[l['_id']] = {
                'obj': l,
                'remaining_width': l['usableWidthCm'],
                'items': []
            }

        for p in initial_placements:
            lid = p['level_id']
            sku = p['sku']
            prod = products_map.get(sku)
            if not prod:
                continue
            if lid not in state:
                continue

            # Get effective facings limits
            min_f = prod.get('minFacings', 1)
            max_f = prod.get('maxFacings', 10)
            if constraint_checker and sku in constraint_checker.facings_overrides:
                ov = constraint_checker.facings_overrides[sku]
                min_f = ov.get('min', min_f)
                max_f = ov.get('max', max_f)

            state[lid]['items'].append({
                'sku': sku,
                'facings': p['facings'],
                'width_one': prod['widthCm'],
                'total_width': p['width_used'],
                'min_facings': min_f,
                'max_facings': max_f,
                'height': prod['heightCm'],
                'depth': prod['depthCm']
            })
            state[lid]['remaining_width'] -= p['width_used']

        current_state = state
        current_score = self._score_state(current_state, products_map, constraint_checker)

        best_state = copy.deepcopy(current_state)
        best_score = current_score

        # --- Hyperparameters ---
        hyperparams = config.get('hyperparams', {})
        temp = hyperparams.get('initialTemperature', 1000)
        cooling_rate = hyperparams.get('coolingRate', 0.98)
        iterations = hyperparams.get('iterations', 500)

        # Adaptive reheat parameters
        REHEAT_THRESHOLD = 50    # iterations without improvement before reheat
        REHEAT_FACTOR = 1.5      # multiply temperature on reheat
        stagnation_counter = 0

        # Convergence tracking
        convergence_history = []

        logger.info(f"Starting SA: Temp={temp}, Iterations={iterations}, InitialScore={current_score:.2f}")

        for i in range(iterations):
            # 1. Perturb
            neighbor_state = self._perturb(current_state, levels, products_map)

            # 2. Evaluate
            neighbor_score = self._score_state(neighbor_state, products_map, constraint_checker)

            # 3. Acceptance (Metropolis criterion)
            delta = neighbor_score - current_score

            if delta > 0:
                accept = True
            else:
                try:
                    prob = math.exp(delta / temp)
                except (OverflowError, ZeroDivisionError):
                    prob = 0
                accept = random.random() < prob

            if accept:
                current_state = neighbor_state
                current_score = neighbor_score

                if current_score > best_score:
                    best_score = current_score
                    best_state = copy.deepcopy(current_state)
                    stagnation_counter = 0
                else:
                    stagnation_counter += 1
            else:
                stagnation_counter += 1

            # Track convergence (every 10 iterations for efficiency)
            if i % 10 == 0:
                convergence_history.append({
                    'iteration': i,
                    'score': round(best_score, 2),
                    'temperature': round(temp, 2),
                    'current_score': round(current_score, 2)
                })

            # 4. Cool
            temp *= cooling_rate

            # 5. Adaptive reheat
            if stagnation_counter >= REHEAT_THRESHOLD:
                temp *= REHEAT_FACTOR
                stagnation_counter = 0
                logger.info(f"SA Reheat at iteration {i}: New Temp={temp:.2f}")

            if temp < 0.1:
                break

        # Final convergence point
        convergence_history.append({
            'iteration': iterations,
            'score': round(best_score, 2),
            'temperature': round(temp, 2),
            'current_score': round(current_score, 2)
        })

        logger.info(f"SA Finished: BestScore={best_score:.2f}, Iterations={len(convergence_history)*10}")

        # Convert state to placements
        final_placements = self._state_to_placements(best_state, levels_map)
        return final_placements, best_score, convergence_history
