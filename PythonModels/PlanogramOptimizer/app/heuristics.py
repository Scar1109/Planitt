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
from app.main_utils import state_to_placements

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

    def generate_layout(self, products, fixtures, levels, constraints=None, skip_fill=False):
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
        unplaced_products = []

        # Define department families to prevent cross-contamination
        # e.g., Washing powder should NEVER go on a Dairy shelf
        FOOD_DEPARTMENTS = {'beverages', 'dairy', 'bakery', 'frozen', 'snacks', 'confectionery',
                            'rice', 'dry goods', 'baby food', 'baby', 'instant', 'instant noodles'}
        NON_FOOD_DEPARTMENTS = {'household', 'cleaning', 'personal care', 'personal',
                                'stationery', 'health', 'beauty'}

        def _get_department_family(text):
            """Classify a tag/category into 'food', 'non_food', or 'unknown'."""
            if not text:
                return 'unknown'
            t = text.lower().strip()
            for kw in FOOD_DEPARTMENTS:
                if kw in t:
                    return 'food'
            for kw in NON_FOOD_DEPARTMENTS:
                if kw in t:
                    return 'non_food'
            return 'unknown'

        def _check_category_match(product_category, product_allowed_tags, level_tags, mode='strict'):
            """
            Check if a product can go on a shelf.
            
            Modes:
              'strict'  — category or allowedTags must match a level tag
              'relaxed' — only prevents cross-department (food vs non-food)
              'any'     — no category restriction (truly last resort)
            """
            if not level_tags:
                return True  # No tags on shelf = accepts anything
            
            is_general = any(t in ('general', 'misc') for t in level_tags)
            if is_general:
                return True
            
            if mode == 'any':
                return True
            
            if mode == 'strict':
                # Check 1: product.category matches a level tag
                if product_category:
                    for tag in level_tags:
                        if product_category in tag or tag in product_category:
                            return True
                
                # Check 2: product.allowedTags matches a level tag
                if product_allowed_tags:
                    for allowed in product_allowed_tags:
                        allowed_lower = allowed.lower().strip()
                        for tag in level_tags:
                            if allowed_lower in tag or tag in allowed_lower:
                                return True
                
                return False
            
            if mode == 'relaxed':
                # Prevent cross-department only
                # Determine what "family" the shelf belongs to
                shelf_families = set()
                for tag in level_tags:
                    family = _get_department_family(tag)
                    if family != 'unknown':
                        shelf_families.add(family)
                
                if not shelf_families:
                    return True  # Unknown shelf = allow anything
                
                # Determine product's family
                product_family = _get_department_family(product_category)
                if product_family == 'unknown' and product_allowed_tags:
                    for at in product_allowed_tags:
                        pf = _get_department_family(at)
                        if pf != 'unknown':
                            product_family = pf
                            break
                
                if product_family == 'unknown':
                    return True  # Unknown product = allow anywhere
                
                # Block cross-department: food product on non-food shelf, or vice versa
                if product_family not in shelf_families:
                    return False
                
                return True

        def attempt_placement(p, match_mode='strict'):
            sku = p['sku']
            min_facings, max_facings = checker.get_effective_facings(sku, p)
            product_category = (p.get('category', '') or '').lower()
            product_allowed_tags = [t.lower().strip() for t in (p.get('allowedTags') or [])]
            width, height, depth = p['widthCm'], p['heightCm'], p['depthCm']
            needed_width = min_facings * width

            for lvl in sorted_levels:
                lid = lvl['_id']
                state = shelf_state[lid]
                level_tags = [t.lower().strip() for t in lvl.get('tags', [])]

                # Category Check
                if not _check_category_match(product_category, product_allowed_tags, level_tags, mode=match_mode):
                    continue

                # Physical Checks
                if lvl['usableHeightCm'] < height or lvl['usableDepthCm'] < depth:
                    continue
                if state['remaining_width'] < needed_width:
                    continue

                # User Constraints
                if not checker.check_adjacency_forbidden(sku, lid, shelf_state):
                    continue
                if not checker.check_shelf_affinity(sku, p, lid, lvl):
                    continue
                if not checker.check_shelf_share(sku, p, lid, shelf_state, additional_width=needed_width):
                    continue

                # Placement
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
                return True
            return False

        # Pass 1: Strict Category + AllowedTags Matching
        for p in sorted_products:
            if not attempt_placement(p, match_mode='strict'):
                unplaced_products.append(p)
        
        logger.info(f"Pass 1 (Strict): Placed {len(sorted_products) - len(unplaced_products)}, Unplaced: {len(unplaced_products)}")

        # Pass 2: Relaxed (same department family only — food↔food, non-food↔non-food)
        if unplaced_products:
            pass2_remaining = []
            for p in unplaced_products:
                if not attempt_placement(p, match_mode='relaxed'):
                    pass2_remaining.append(p)
            logger.info(f"Pass 2 (Relaxed): Placed {len(unplaced_products) - len(pass2_remaining)} more")
            unplaced_products = pass2_remaining

        # Pass 3: True Last Resort (any shelf with physical space)
        if unplaced_products:
            logger.info(f"Pass 3 (Last Resort): Attempting {len(unplaced_products)} remaining products...")
            final_failures = []
            for p in unplaced_products:
                if not attempt_placement(p, match_mode='any'):
                    final_failures.append(p['sku'])
            
            if final_failures:
                logger.warning(f"Final Failure: Could not place {len(final_failures)} products (no physical space).")

        # --- Step 2 & 3: Fill Remaining Width ---
        # When a metaheuristic will refine afterward, skip this step
        # so the optimizer has room to genuinely improve facings allocation.
        if skip_fill:
            logger.info("Step 2 & 3: SKIPPED (metaheuristic will handle facings optimization)")
        else:
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

        final_placements = state_to_placements(shelf_state, products_map)

        # Compute constraint violations for reporting
        _, violations = checker.compute_penalty(shelf_state)
        if violations:
            logger.warning(f"Heuristic solution has {len(violations)} constraint violations")

        return final_placements, shelf_state, checker
