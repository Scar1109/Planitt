"""
Tabu Search (TS) Metaheuristic for Planogram Optimization.

Algorithm Description:
──────────────────────
Tabu Search maintains a short-term memory (tabu list) of recent moves
to prevent cycling back to previously visited solutions. Unlike SA,
TS is a deterministic local search that always selects the best
non-tabu neighbor, making it more aggressive in exploitation.

Key Components:
  - Tabu List: FIFO queue of recently performed moves (size = tabu_tenure)
  - Aspiration Criterion: A tabu move is accepted if it produces a new global best
  - Neighborhood: Same operators as SA (add/remove facing, move level, swap)

Mathematical Formulation:
  Same objective as SA:
  max f(x) = Σᵢ (Pᵢ · Fᵢ · Dᵢ · Lᵢ) - λ · Σⱼ penalty(cⱼ)

References:
  Glover, F. (1986). "Future Paths for Integer Programming and Links to AI."
  Glover, F. & Laguna, M. (1997). "Tabu Search." Kluwer Academic Publishers.
"""
import random
import math
import copy
import logging
from collections import deque

logger = logging.getLogger(__name__)


class TabuSearchOptimizer:
    """
    Tabu Search metaheuristic for planogram shelf-space allocation.
    
    Uses short-term memory to avoid revisiting recent solutions,
    combined with aspiration criteria for escaping local optima.
    """

    def __init__(self, tabu_tenure=7, max_iterations=300):
        self.tabu_tenure = tabu_tenure
        self.max_iterations = max_iterations

    @staticmethod
    def _category_matches_shelf(product_category, shelf_obj):
        """Check if a product's category is compatible with a shelf's tags."""
        tags = [t.lower().strip() for t in shelf_obj.get('tags', [])]
        if not tags:
            return True
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
        """Evaluate objective function (same formulation as SA)."""
        score = 0
        for lid, s in state.items():
            level = s['obj']
            h = level.get('heightFromFloorCm', 0)
            level_depth = level.get('usableDepthCm', 0)
            level_height = level.get('usableHeightCm', 0)

            if 100 <= h <= 170:
                level_factor = 2.0
            elif h < 100:
                level_factor = 1.0
            else:
                level_factor = 0.8

            for item in s['items']:
                prod = products_map.get(item['sku'])
                if prod:
                    prio = prod.get('priority_score', 0)
                    prod_depth = prod.get('depthCm', 1)
                    units_deep = math.floor(level_depth / prod_depth)
                    if units_deep < 1:
                        units_deep = 1

                    prod_height = prod.get('heightCm', 1)
                    units_high = math.floor(level_height / prod_height)
                    if units_high < 1:
                        units_high = 1

                    density_bonus = units_deep * units_high
                    score += (prio * item['facings'] * density_bonus * level_factor)

        if constraint_checker:
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

    def _generate_neighbors(self, state, products_map, num_neighbors=10):
        """
        Generate a set of neighbor solutions by applying random moves.
        Returns list of (new_state, move_description) tuples.
        """
        neighbors = []
        non_empty = [lid for lid, s in state.items() if s['items']]
        if not non_empty:
            return neighbors

        for _ in range(num_neighbors):
            new_state = copy.deepcopy(state)
            source_lid = random.choice(non_empty)
            source_shelf = new_state[source_lid]

            if not source_shelf['items']:
                continue

            item_idx = random.randint(0, len(source_shelf['items']) - 1)
            item = source_shelf['items'][item_idx]

            move_type = random.choice(['add_facing', 'remove_facing', 'move_level', 'swap'])
            move_desc = None

            if move_type == 'add_facing':
                if item['facings'] < item['max_facings'] and source_shelf['remaining_width'] >= item['width_one']:
                    item['facings'] += 1
                    item['total_width'] += item['width_one']
                    source_shelf['remaining_width'] -= item['width_one']
                    move_desc = f"add_{item['sku']}_{source_lid}"

            elif move_type == 'remove_facing':
                if item['facings'] > item['min_facings']:
                    item['facings'] -= 1
                    item['total_width'] -= item['width_one']
                    source_shelf['remaining_width'] += item['width_one']
                    move_desc = f"rem_{item['sku']}_{source_lid}"

            elif move_type == 'move_level':
                all_lids = list(new_state.keys())
                target_lid = random.choice(all_lids)
                if target_lid != source_lid:
                    target_shelf = new_state[target_lid]
                    target_obj = target_shelf['obj']
                    item_cat = products_map.get(item['sku'], {}).get('category', '')
                    if (self._category_matches_shelf(item_cat, target_obj)
                            and target_obj['usableHeightCm'] >= item['height']
                            and target_obj['usableDepthCm'] >= item['depth']
                            and target_shelf['remaining_width'] >= item['total_width']):
                        existing_skus = {it['sku'] for it in target_shelf['items']}
                        if item['sku'] not in existing_skus:
                            source_shelf['items'].pop(item_idx)
                            source_shelf['remaining_width'] += item['total_width']
                            target_shelf['items'].append(item)
                            target_shelf['remaining_width'] -= item['total_width']
                            move_desc = f"move_{item['sku']}_{source_lid}_to_{target_lid}"

            elif move_type == 'swap':
                other_non_empty = [lid for lid in non_empty if lid != source_lid]
                if other_non_empty:
                    target_lid = random.choice(other_non_empty)
                    target_shelf = new_state[target_lid]
                    if target_shelf['items']:
                        target_idx = random.randint(0, len(target_shelf['items']) - 1)
                        target_item = target_shelf['items'][target_idx]

                        source_obj = source_shelf['obj']
                        target_obj = target_shelf['obj']

                        src_new_w = source_shelf['remaining_width'] + item['total_width'] - target_item['total_width']
                        tgt_new_w = target_shelf['remaining_width'] + target_item['total_width'] - item['total_width']

                        if (src_new_w >= 0 and tgt_new_w >= 0
                                and source_obj['usableHeightCm'] >= target_item['height']
                                and source_obj['usableDepthCm'] >= target_item['depth']
                                and target_obj['usableHeightCm'] >= item['height']
                                and target_obj['usableDepthCm'] >= item['depth']):
                            item_cat = products_map.get(item['sku'], {}).get('category', '')
                            tgt_cat = products_map.get(target_item['sku'], {}).get('category', '')
                            if (self._category_matches_shelf(item_cat, target_obj)
                                    and self._category_matches_shelf(tgt_cat, source_obj)):
                                source_shelf['items'][item_idx] = target_item
                                target_shelf['items'][target_idx] = item
                                source_shelf['remaining_width'] = src_new_w
                                target_shelf['remaining_width'] = tgt_new_w
                                move_desc = f"swap_{item['sku']}_{target_item['sku']}"

            if move_desc:
                neighbors.append((new_state, move_desc))

        return neighbors

    def _state_to_placements(self, state, levels_map):
        """Convert state to flat placement list."""
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

    def optimize(self, initial_placements, products, levels, config, constraint_checker=None):
        """
        Run Tabu Search to refine the heuristic solution.

        Returns:
            (placements, best_score, convergence_history)
        """
        products_map = {p['sku']: p for p in products}
        levels_map = {l['_id']: l for l in levels}

        # Build internal state
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
            if not prod or lid not in state:
                continue

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

        # Tabu list (FIFO)
        tabu_list = deque(maxlen=self.tabu_tenure)
        convergence_history = []

        hyperparams = config.get('hyperparams', {})
        max_iterations = hyperparams.get('iterations', self.max_iterations)
        neighbors_per_iter = 15

        logger.info(f"Starting Tabu Search: Tenure={self.tabu_tenure}, MaxIter={max_iterations}, InitialScore={current_score:.2f}")

        for i in range(max_iterations):
            # Generate neighbors
            neighbors = self._generate_neighbors(current_state, products_map, neighbors_per_iter)

            if not neighbors:
                break

            # Evaluate and select best non-tabu neighbor
            best_neighbor = None
            best_neighbor_score = float('-inf')
            best_move = None

            for neighbor_state, move_desc in neighbors:
                n_score = self._score_state(neighbor_state, products_map, constraint_checker)

                is_tabu = move_desc in tabu_list

                # Aspiration criterion: accept tabu move if it's a new global best
                if is_tabu and n_score <= best_score:
                    continue

                if n_score > best_neighbor_score:
                    best_neighbor_score = n_score
                    best_neighbor = neighbor_state
                    best_move = move_desc

            if best_neighbor is None:
                break  # No valid moves

            # Accept best neighbor
            current_state = best_neighbor
            current_score = best_neighbor_score

            # Update tabu list
            if best_move:
                tabu_list.append(best_move)

            # Update global best
            if current_score > best_score:
                best_score = current_score
                best_state = copy.deepcopy(current_state)

            # Track convergence
            if i % 10 == 0:
                convergence_history.append({
                    'iteration': i,
                    'score': round(best_score, 2),
                    'current_score': round(current_score, 2),
                    'tabu_size': len(tabu_list)
                })

        convergence_history.append({
            'iteration': max_iterations,
            'score': round(best_score, 2),
            'current_score': round(current_score, 2),
            'tabu_size': len(tabu_list)
        })

        logger.info(f"Tabu Search Finished: BestScore={best_score:.2f}")

        final_placements = self._state_to_placements(best_state, levels_map)
        return final_placements, best_score, convergence_history
