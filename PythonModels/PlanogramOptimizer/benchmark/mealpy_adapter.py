"""
MEALPY Problem Adapter for Planogram Optimization.

Encodes the shelf-space allocation problem as an IntegerVar optimization problem
compatible with MEALPY's optimizer API.

Encoding:
  Solution vector x = [f₁₁, f₁₂, ..., f₁ₘ, f₂₁, ..., fₙₘ]
  Where fᵢⱼ = number of facings for product i on shelf level j
  Length = n_products × n_levels

Decoding:
  Reshape vector → matrix F[n×m], then convert to placement dicts.

References:
  Van Thieu, N. & Mirjalili, S. (2023). MEALPY. Journal of Systems Architecture.
"""
import numpy as np
import math
import copy
import logging

from mealpy import Problem, IntegerVar

logger = logging.getLogger(__name__)


class PlanogramProblem(Problem):
    """
    Custom MEALPY Problem class for planogram shelf-space allocation.

    Converts between MEALPY's numerical vector representation and
    the internal placement/state format used by SA/TS optimizers.
    """

    def __init__(self, products, levels, constraint_checker=None, **kwargs):
        """
        Args:
            products: list of ranked product dicts (with priority_score)
            levels: list of shelf level dicts
            constraint_checker: ConstraintChecker instance (optional)
        """
        self.products = products
        self.levels = levels
        self.products_map = {p['sku']: p for p in products}
        self.levels_map = {l['_id']: l for l in levels}
        self.constraint_checker = constraint_checker

        self.n_products = len(products)
        self.n_levels = len(levels)
        self.n_vars = self.n_products * self.n_levels

        # Build upper bounds: max_facings per product (same for all shelves)
        # Lower bound is always 0 (product may not be on that shelf)
        lb = [0] * self.n_vars
        ub = []
        for p in products:
            max_f = p.get('maxFacings', 10)
            if constraint_checker and p['sku'] in constraint_checker.facings_overrides:
                ov = constraint_checker.facings_overrides[p['sku']]
                max_f = ov.get('max', max_f)
            for _ in levels:
                ub.append(max_f)

        bounds = IntegerVar(lb=tuple(lb), ub=tuple(ub), name="facings")
        super().__init__(bounds=bounds, minmax="min", **kwargs)

    def obj_func(self, solution):
        """
        Evaluate the planogram objective function for a given solution vector.

        MEALPY minimizes, but we want to maximize score, so we return -score.
        Infeasible solutions get a large penalty.

        Args:
            solution: numpy array of integers [f₁₁, f₁₂, ..., fₙₘ]

        Returns:
            float: negative score (for minimization)
        """
        solution = np.array(solution, dtype=int)

        # Decode: reshape to matrix [n_products × n_levels]
        facings_matrix = solution.reshape(self.n_products, self.n_levels)

        # Build state dict (same format as SA/TS internal state)
        state = {}
        for j, level in enumerate(self.levels):
            lid = level['_id']
            state[lid] = {
                'obj': level,
                'remaining_width': level['usableWidthCm'],
                'items': []
            }

        infeasible_penalty = 0

        for i, product in enumerate(self.products):
            sku = product['sku']
            width_one = product['widthCm']
            height = product['heightCm']
            depth = product['depthCm']

            # Get effective facings limits
            min_f = product.get('minFacings', 1)
            max_f = product.get('maxFacings', 10)
            if self.constraint_checker and sku in self.constraint_checker.facings_overrides:
                ov = self.constraint_checker.facings_overrides[sku]
                min_f = ov.get('min', min_f)
                max_f = ov.get('max', max_f)

            # Find where this product is placed (first non-zero shelf)
            total_facings_for_product = 0
            for j, level in enumerate(self.levels):
                facings = int(facings_matrix[i, j])
                if facings <= 0:
                    continue

                lid = level['_id']
                shelf = state[lid]
                needed_width = facings * width_one

                # Dimension check
                if level['usableHeightCm'] < height or level['usableDepthCm'] < depth:
                    infeasible_penalty += 500
                    continue

                # Width check (clip if overflowing)
                if shelf['remaining_width'] < needed_width:
                    max_possible = int(shelf['remaining_width'] // width_one)
                    if max_possible <= 0:
                        continue
                    facings = max_possible
                    needed_width = facings * width_one

                # Enforce max facings
                facings = min(facings, max_f - total_facings_for_product)
                if facings <= 0:
                    continue
                needed_width = facings * width_one

                shelf['items'].append({
                    'sku': sku,
                    'facings': facings,
                    'width_one': width_one,
                    'total_width': needed_width,
                    'min_facings': min_f,
                    'max_facings': max_f,
                    'height': height,
                    'depth': depth
                })
                shelf['remaining_width'] -= needed_width
                total_facings_for_product += facings

            # Penalize if minimum facings not met
            if total_facings_for_product < min_f and total_facings_for_product > 0:
                infeasible_penalty += 200 * (min_f - total_facings_for_product)

        # Score using the same formulation as SA/TS
        score = self._compute_score(state)
        score -= infeasible_penalty

        # Subtract constraint penalties
        if self.constraint_checker:
            state_dict = {}
            for lid, s in state.items():
                state_dict[lid] = {
                    'obj': s['obj'],
                    'remaining_width': s['remaining_width'],
                    'items': {item['sku']: item for item in s['items']}
                }
            penalty, _ = self.constraint_checker.compute_penalty(state_dict)
            score -= penalty

        # Return negative (MEALPY minimizes)
        return -score

    def _compute_score(self, state):
        """Compute planogram score (same formula as SA/TS _score_state)."""
        score = 0
        for lid, s in state.items():
            level = s['obj']
            h = level.get('heightFromFloorCm', 0)
            level_depth = level.get('usableDepthCm', 0)
            level_height = level.get('usableHeightCm', 0)

            # Level quality factor (ergonomic)
            if 100 <= h <= 170:
                level_factor = 2.0   # Eye level
            elif h < 100:
                level_factor = 1.0   # Bottom
            else:
                level_factor = 0.8   # Top

            for item in s['items']:
                prod = self.products_map.get(item['sku'])
                if prod:
                    prio = prod.get('priority_score', 0)
                    prod_depth = prod.get('depthCm', 1)
                    units_deep = math.floor(level_depth / prod_depth) if prod_depth > 0 else 1
                    if units_deep < 1:
                        units_deep = 1
                    prod_height = prod.get('heightCm', 1)
                    units_high = math.floor(level_height / prod_height) if prod_height > 0 else 1
                    if units_high < 1:
                        units_high = 1
                    density_bonus = units_deep * units_high
                    score += (prio * item['facings'] * density_bonus * level_factor)

        return score

    def decode_solution(self, solution):
        """
        Convert a MEALPY solution vector back to flat placement list.

        Args:
            solution: numpy array of integers

        Returns:
            list of placement dicts (same format as SA/TS output)
        """
        solution = np.array(solution, dtype=int)
        facings_matrix = solution.reshape(self.n_products, self.n_levels)

        placements = []
        for j, level in enumerate(self.levels):
            lid = level['_id']
            current_x = 0
            remaining = level['usableWidthCm']

            for i, product in enumerate(self.products):
                facings = int(facings_matrix[i, j])
                if facings <= 0:
                    continue

                width_one = product['widthCm']
                needed = facings * width_one

                # Clip to available width
                if needed > remaining:
                    facings = int(remaining // width_one)
                    if facings <= 0:
                        continue
                    needed = facings * width_one

                # Dimension check
                if level['usableHeightCm'] < product['heightCm']:
                    continue
                if level['usableDepthCm'] < product['depthCm']:
                    continue

                placements.append({
                    'sku': product['sku'],
                    'level_id': lid,
                    'fixture_id': level.get('fixtureId'),
                    'facings': facings,
                    'x_position': current_x,
                    'y_position': 0,
                    'width_used': needed
                })
                current_x += needed
                remaining -= needed

        return placements

    def encode_placements(self, placements):
        """
        Convert flat placement list to MEALPY solution vector.
        Used for warm-starting the population with the heuristic solution.

        Args:
            placements: list of placement dicts from heuristic

        Returns:
            numpy array of integers (length = n_products × n_levels)
        """
        solution = np.zeros(self.n_vars, dtype=int)

        # Build lookup: product index, level index
        prod_idx = {p['sku']: i for i, p in enumerate(self.products)}
        level_idx = {l['_id']: j for j, l in enumerate(self.levels)}

        for p in placements:
            sku = p['sku']
            lid = p['level_id']
            if sku in prod_idx and lid in level_idx:
                i = prod_idx[sku]
                j = level_idx[lid]
                solution[i * self.n_levels + j] = p['facings']

        return solution
