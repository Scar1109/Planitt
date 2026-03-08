"""
Constructive Heuristic Optimizer for Planogram Layout Generation.

Algorithm: 4-Step Greedy Construction with Constraint Satisfaction
────────────────────────────────────────────────────────────────────
Step 1: Place Minimum Facings (Constraint Satisfaction Phase)
         - Assign each product its minimum facings on the highest-quality
           feasible shelf, respecting dimensional, tag, and user constraints.

Step 2 & 3: Fill Remaining Width (Greedy Maximization Phase)
         - Iteratively add facings to already-placed products, prioritizing
           highest-priority products first, until shelves are full.

Step 4: Pack / Render (Coordinate Generation Phase)
         - Convert internal state to final placement coordinates (x, y).

Constraint Enforcement:
  - Hard constraints: checked during placement; violated placements are rejected.
  - Soft constraints: tracked as violations but allowed; penalty computed later.

References:
  - Burke, E.K. et al. (2013). "Hyper-heuristics: A Survey of the State of the Art."
  - Drèze, X. et al. (1994). "Shelf Management and Space Elasticity."
"""
import logging

logger = logging.getLogger(__name__)


class ConstraintChecker:
    """
    Pre-processes user-defined constraint rules into efficient lookup structures.
    Used by both heuristic construction and metaheuristic evaluation.

    Constraint Taxonomy:
      Hard constraints → Feasibility requirements (solution MUST satisfy)
      Soft constraints → Objective function penalties (solution SHOULD satisfy)
    """

    def __init__(self, constraints, products_map):
        self.adjacency_required = []     # [(sku_a, sku_b, is_hard, penalty)]
        self.adjacency_forbidden = []    # [(sku_a, sku_b, is_hard, penalty)]
        self.shelf_affinity = {}         # category -> { level_ids: [...], is_hard, penalty }
        self.brand_blocks = {}           # brand -> { required: True, is_hard, penalty }
        self.max_shelf_share = {}        # category -> { max_pct: 0.0-1.0, is_hard, penalty }
        self.facings_overrides = {}      # sku -> { min: int, max: int }
        self.products_map = products_map
        self._build(constraints)

    def _build(self, constraints):
        """Parse constraint dicts into structured lookups."""
        for c in constraints:
            if not c.get('isActive', True):
                continue

            rule_type = c.get('ruleType', '')
            is_hard = c.get('hardConstraint', True)
            penalty = c.get('penaltyWeight', 100.0)
            params = c.get('params', {})

            if rule_type == 'adjacency_required':
                sku_a = c.get('targetSku', '')
                sku_b = params.get('adjacentSku', '')
                if sku_a and sku_b:
                    self.adjacency_required.append((sku_a, sku_b, is_hard, penalty))

            elif rule_type == 'adjacency_forbidden':
                sku_a = c.get('targetSku', '')
                sku_b = params.get('forbiddenSku', '')
                if sku_a and sku_b:
                    self.adjacency_forbidden.append((sku_a, sku_b, is_hard, penalty))

            elif rule_type == 'min_facings_override':
                target_sku = c.get('targetSku', '')
                target_cat = c.get('targetCategory', '')
                min_val = params.get('minFacings', 1)

                if target_sku:
                    if target_sku not in self.facings_overrides:
                        self.facings_overrides[target_sku] = {}
                    self.facings_overrides[target_sku]['min'] = min_val
                elif target_cat:
                    # Apply to all products in category
                    for sku, prod in self.products_map.items():
                        if (prod.get('category', '') or '').lower() == target_cat.lower():
                            if sku not in self.facings_overrides:
                                self.facings_overrides[sku] = {}
                            self.facings_overrides[sku]['min'] = min_val

            elif rule_type == 'max_facings_override':
                target_sku = c.get('targetSku', '')
                target_cat = c.get('targetCategory', '')
                max_val = params.get('maxFacings', 10)

                if target_sku:
                    if target_sku not in self.facings_overrides:
                        self.facings_overrides[target_sku] = {}
                    self.facings_overrides[target_sku]['max'] = max_val
                elif target_cat:
                    for sku, prod in self.products_map.items():
                        if (prod.get('category', '') or '').lower() == target_cat.lower():
                            if sku not in self.facings_overrides:
                                self.facings_overrides[sku] = {}
                            self.facings_overrides[sku]['max'] = max_val

            elif rule_type == 'category_shelf_affinity':
                cat = c.get('targetCategory', '')
                level_id = c.get('targetLevelId', '')
                fixture_id = c.get('targetFixtureId', '')
                if cat:
                    if cat not in self.shelf_affinity:
                        self.shelf_affinity[cat] = {'level_ids': [], 'fixture_ids': [], 'is_hard': is_hard, 'penalty': penalty}
                    if level_id:
                        self.shelf_affinity[cat]['level_ids'].append(level_id)
                    if fixture_id:
                        self.shelf_affinity[cat]['fixture_ids'].append(fixture_id)

            elif rule_type == 'brand_block':
                brand = c.get('targetBrand', '')
                if brand:
                    self.brand_blocks[brand] = {'required': True, 'is_hard': is_hard, 'penalty': penalty}

            elif rule_type == 'max_shelf_share':
                cat = c.get('targetCategory', '')
                max_pct = params.get('maxPercent', 100) / 100.0
                if cat:
                    self.max_shelf_share[cat] = {'max_pct': max_pct, 'is_hard': is_hard, 'penalty': penalty}

    def get_effective_facings(self, sku, product):
        """Return effective (min, max) facings considering overrides."""
        min_f = product.get('minFacings', 1)
        max_f = product.get('maxFacings', 10)

        if sku in self.facings_overrides:
            ov = self.facings_overrides[sku]
            min_f = ov.get('min', min_f)
            max_f = ov.get('max', max_f)

        return min_f, max_f

    def check_shelf_share(self, sku, product, level_id, shelf_state, additional_width=0):
        """Check if placing this product would violate max_shelf_share for its category."""
        category = (product.get('category', '') or '').lower()
        if category not in self.max_shelf_share:
            return True  # No constraint

        rule = self.max_shelf_share[category]
        state = shelf_state.get(level_id)
        if not state:
            return True

        total_shelf_width = state['obj'].get('usableWidthCm', 0)
        if total_shelf_width == 0:
            return True

        # Sum existing width for this category on this shelf
        cat_width = additional_width
        for item_sku, item_data in state['items'].items():
            item_prod = self.products_map.get(item_sku)
            if item_prod and (item_prod.get('category', '') or '').lower() == category:
                cat_width += item_data['total_width']

        share = cat_width / total_shelf_width
        if share > rule['max_pct']:
            return False  # Would violate

        return True

    def check_adjacency_forbidden(self, sku, level_id, shelf_state):
        """Check if placing sku on this level would violate any adjacency_forbidden rules."""
        state = shelf_state.get(level_id)
        if not state:
            return True

        for sku_a, sku_b, is_hard, penalty in self.adjacency_forbidden:
            if sku == sku_a and sku_b in state['items']:
                if is_hard:
                    return False
            elif sku == sku_b and sku_a in state['items']:
                if is_hard:
                    return False

        return True

    def check_shelf_affinity(self, sku, product, level_id, level):
        """Check if the product's category has a shelf affinity constraint."""
        category = (product.get('category', '') or '').lower()
        if category not in self.shelf_affinity:
            return True  # No constraint

        rule = self.shelf_affinity[category]
        lid_str = str(level_id)
        fid_str = str(level.get('fixtureId', ''))

        # Check if this level or fixture is in the affinity list
        if rule['level_ids'] and lid_str not in [str(x) for x in rule['level_ids']]:
            if rule['is_hard']:
                return False
        if rule['fixture_ids'] and fid_str not in [str(x) for x in rule['fixture_ids']]:
            if rule['is_hard']:
                return False

        return True

    def compute_penalty(self, shelf_state):
        """
        Compute total penalty score for all soft constraint violations in current state.
        Returns (total_penalty, list_of_violation_dicts).
        """
        total_penalty = 0.0
        violations = []

        # --- Adjacency Required: sku_a and sku_b should be on same shelf ---
        for sku_a, sku_b, is_hard, penalty in self.adjacency_required:
            a_lid = None
            b_lid = None
            for lid, state in shelf_state.items():
                if sku_a in state['items']:
                    a_lid = lid
                if sku_b in state['items']:
                    b_lid = lid

            if a_lid and b_lid and a_lid != b_lid:
                total_penalty += penalty
                violations.append({
                    'ruleType': 'adjacency_required',
                    'message': f'{sku_a} and {sku_b} should be on the same shelf',
                    'penalty': penalty
                })

        # --- Adjacency Forbidden: sku_a and sku_b should NOT be on same shelf ---
        for sku_a, sku_b, is_hard, penalty in self.adjacency_forbidden:
            for lid, state in shelf_state.items():
                if sku_a in state['items'] and sku_b in state['items']:
                    total_penalty += penalty
                    violations.append({
                        'ruleType': 'adjacency_forbidden',
                        'message': f'{sku_a} and {sku_b} must not be on the same shelf',
                        'penalty': penalty
                    })

        # --- Max Shelf Share ---
        for category, rule in self.max_shelf_share.items():
            for lid, state in shelf_state.items():
                total_width = state['obj'].get('usableWidthCm', 0)
                if total_width == 0:
                    continue
                cat_width = 0
                for item_sku, item_data in state['items'].items():
                    prod = self.products_map.get(item_sku)
                    if prod and (prod.get('category', '') or '').lower() == category:
                        cat_width += item_data['total_width']
                share = cat_width / total_width
                if share > rule['max_pct']:
                    penalty = rule['penalty'] * (share - rule['max_pct']) * 10
                    total_penalty += penalty
                    violations.append({
                        'ruleType': 'max_shelf_share',
                        'message': f'Category "{category}" uses {share*100:.1f}% of shelf (max: {rule["max_pct"]*100:.0f}%)',
                        'penalty': penalty
                    })

        # --- Brand Block: products of same brand should be contiguous on same shelf ---
        for brand, rule in self.brand_blocks.items():
            brand_shelves = set()
            for lid, state in shelf_state.items():
                for item_sku in state['items']:
                    prod = self.products_map.get(item_sku)
                    if prod and (prod.get('brand', '') or '').lower() == brand.lower():
                        brand_shelves.add(lid)
            if len(brand_shelves) > 1:
                penalty = rule['penalty'] * (len(brand_shelves) - 1)
                total_penalty += penalty
                violations.append({
                    'ruleType': 'brand_block',
                    'message': f'Brand "{brand}" is split across {len(brand_shelves)} shelves',
                    'penalty': penalty
                })

        return total_penalty, violations


class HeuristicOptimizer:
    """
    Constructive heuristic for generating initial planogram layouts.

    Strategy: Priority-ordered greedy placement with constraint checking.
    Complexity: O(P × L) where P = products, L = shelf levels.

    Output: A feasible (or near-feasible) initial solution for metaheuristic refinement.
    """

    def __init__(self):
        pass

    def generate_layout(self, products, fixtures, levels, constraints=None):
        """
        Generate a layout using the Advanced Heuristic Strategy (4-Step):
        1. Place Minimum Facings (Constraint Satisfaction)
        2. Prioritize Eye-Level Shelves (Business Logic)
        3. Fill Remaining Space (Maximization)
        4. Render Blocks (Packing)

        Args:
            products: List of product dicts (already ranked by priority_score)
            fixtures: List of fixture dicts
            levels: List of level dicts with tags
            constraints: List of constraint rule dicts (optional)

        Returns:
            (placements, shelf_state) tuple
        """
        constraints = constraints or []

        # --- Pre-processing ---
        products_map = {p['sku']: p for p in products}

        # Initialize constraint checker
        checker = ConstraintChecker(constraints, products_map)

        # 1. Sort Products by Priority (Highest First)
        sorted_products = sorted(products, key=lambda x: x.get('priority_score', 0), reverse=True)

        # 2. Sort Levels by Quality (Eye Level > Bottom > Top) AND Depth
        def get_level_score(level):
            h = level.get('heightFromFloorCm', 0)
            d = level.get('usableDepthCm', 0)

            score = 0
            if 100 <= h <= 170:
                score += 100  # Prime Eye Level
            elif h < 100:
                score += 50   # Bottom (Accessible but lower value)
            else:
                score += 10   # Top (Harder to reach)

            score += (d * 0.5)
            return score

        sorted_levels = sorted(levels, key=get_level_score, reverse=True)
        logger.info(f"Sorted Levels: {[l['_id'] for l in sorted_levels]}")

        # Track State
        shelf_state = {}
        for lvl in levels:
            shelf_state[lvl['_id']] = {
                'obj': lvl,
                'remaining_width': lvl['usableWidthCm'],
                'items': {}  # sku -> placement_obj
            }

        # Map: sku -> assigned_level_id
        product_assignments = {}

        # --- Step 1: Place Minimum Facings ---
        logger.info("Step 1: Assigning Minimum Facings...")

        for p in sorted_products:
            sku = p['sku']

            # Get effective facings (with constraint overrides)
            min_facings, max_facings = checker.get_effective_facings(sku, p)

            # --- Constraint Checks ---
            product_tags = p.get('tags', [])
            product_category = p.get('category', '').lower()

            # Standard Dims
            width = p['widthCm']
            height = p['heightCm']
            depth = p['depthCm']

            needed_width = min_facings * width

            placed = False
            for lvl in sorted_levels:
                lid = lvl['_id']
                state = shelf_state[lid]

                # --- Strict Category Coherence ---
                # Products must go on shelves whose tags contain the product's category.
                # Falls back to general/misc shelves only as last resort.
                level_tags = [t.lower().strip() for t in lvl.get('tags', [])]

                if level_tags:
                    is_general = any(t in ('general', 'misc') for t in level_tags)

                    if not is_general:
                        # Strict: product category must appear in level tags
                        category_matches = False
                        for tag in level_tags:
                            if product_category and product_category in tag:
                                category_matches = True
                                break
                            if tag in product_category:
                                category_matches = True
                                break

                        if not category_matches:
                            continue  # Skip — category mismatch

                # Check Dimensions
                if lvl['usableHeightCm'] < height:
                    continue
                if lvl['usableDepthCm'] < depth:
                    continue

                # Check Capacity
                if state['remaining_width'] < needed_width:
                    continue

                # --- User Constraint Checks ---
                # Adjacency forbidden
                if not checker.check_adjacency_forbidden(sku, lid, shelf_state):
                    continue

                # Shelf affinity
                if not checker.check_shelf_affinity(sku, p, lid, lvl):
                    continue

                # Max shelf share
                if not checker.check_shelf_share(sku, p, lid, shelf_state, additional_width=needed_width):
                    continue

                # --- All checks passed: Assign ---
                product_assignments[sku] = lid
                state['items'][sku] = {
                    'sku': sku,
                    'product_id': p.get('_id'),
                    'facings': min_facings,
                    'width_one': width,
                    'total_width': needed_width,
                    'priority': p.get('priority_score', 0),
                    'max_facings': max_facings,
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

        changed = True
        while changed:
            changed = False
            for p in sorted_products:
                sku = p['sku']
                if sku not in product_assignments:
                    continue

                lid = product_assignments[sku]
                state = shelf_state[lid]
                item_data = state['items'][sku]

                current_facings = item_data['facings']
                max_facings_eff = item_data['max_facings']
                width_one = item_data['width_one']

                # Check constraints
                if current_facings < max_facings_eff and state['remaining_width'] >= width_one:
                    # Check max shelf share before adding
                    if checker.check_shelf_share(sku, p, lid, shelf_state, additional_width=width_one):
                        item_data['facings'] += 1
                        item_data['total_width'] += width_one
                        state['remaining_width'] -= width_one
                        changed = True

        # --- Step 4: Pack (Generate Coordinates) ---
        logger.info("Step 4: Generating Coordinates...")

        final_placements = []

        for lid, state in shelf_state.items():
            lvl = state['obj']
            items_on_shelf = list(state['items'].values())
            # Sort by priority (highest priority on the left = most visible)
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
                    'y_position': 0,
                    'width_used': item['total_width'],
                    'height': lvl['usableHeightCm'],
                    'depth': lvl['usableDepthCm']
                }
                final_placements.append(placement)
                current_x += item['total_width']

        # Compute constraint violations for reporting
        _, violations = checker.compute_penalty(shelf_state)
        if violations:
            logger.warning(f"Heuristic solution has {len(violations)} constraint violations")

        return final_placements, shelf_state, checker
