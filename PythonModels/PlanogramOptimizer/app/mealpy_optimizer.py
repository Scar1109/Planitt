import logging
import time
import numpy as np
from mealpy import GWO, GA, PSO, DE, WOA
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import Matern, ConstantKernel

from app.main_utils import placements_to_state, score_state, state_to_placements

logger = logging.getLogger(__name__)

class MealpyOptimizer:
    """
    Production-ready wrapper for MEALPY metaheuristics (GWO, etc.) 
    and Surrogate-Assisted Optimization (SAEO).
    
    Key Design: Uses a REPAIR mechanism to convert raw float vectors
    into physically valid shelf layouts before scoring. This ensures
    every candidate solution respects shelf width constraints.
    """
    def __init__(self, algorithm='gwo', use_surrogate=False):
        self.algorithm_name = algorithm.lower()
        self.use_surrogate = use_surrogate
        
        self.solvers = {
            'gwo': GWO.OriginalGWO,
            'ga': GA.BaseGA,
            'pso': PSO.OriginalPSO,
            'de': DE.OriginalDE,
            'woa': WOA.OriginalWOA
        }

    def optimize(self, initial_placements, products, levels, config, constraint_checker=None):
        """
        Main optimization entry point.
        
        The GWO vector encodes facings per product. Before scoring,
        a repair step clamps facings to respect shelf width limits.
        """
        start_time = time.time()
        convergence = []
        
        sku_to_level = {p['sku']: p['level_id'] for p in initial_placements}
        placed_skus = [p['sku'] for p in initial_placements]
        products_map = {p['sku']: p for p in products}
        
        # Build level width budget lookup
        level_width_map = {str(l['_id']): l['usableWidthCm'] for l in levels}
        
        # Only optimize products that are actually placed (not the full 413)
        # This dramatically reduces the search space
        skus = placed_skus
        dim = len(skus)
        
        if dim == 0:
            logger.warning("No placed products to optimize.")
            return initial_placements, 0.0, []
        
        # Build bounds from actual placement constraints
        lb = [0] * dim
        ub = []
        for sku in skus:
            prod = products_map.get(sku, {})
            ub.append(prod.get('maxFacings', 10))
        
        def repair_vector(vector):
            """
            Repair a raw float vector into a physically valid placement.
            
            Strategy:
            1. Round to integers, clamp to [minFacings, maxFacings]
            2. Group by level
            3. First pass: guarantee every product gets at least minFacings
            4. Second pass: distribute remaining width to higher-priority products
            """
            # Step 1: Round and clamp
            desired_facings = {}
            for i, f in enumerate(vector):
                sku = skus[i]
                prod = products_map.get(sku, {})
                val = int(round(f))
                min_f = prod.get('minFacings', 1)
                max_f = prod.get('maxFacings', 10)
                val = max(min_f, min(max_f, val))
                desired_facings[sku] = val
            
            # Step 2: Group by level
            level_items = {}
            for sku, fc in desired_facings.items():
                lid = str(sku_to_level.get(sku, ''))
                if not lid:
                    continue
                prod = products_map.get(sku, {})
                width = prod.get('widthCm', 10)
                priority = prod.get('priority_score', 0)
                min_f = prod.get('minFacings', 1)
                if lid not in level_items:
                    level_items[lid] = []
                level_items[lid].append({
                    'sku': sku, 'desired': fc, 'width': width,
                    'priority': priority, 'min_f': min_f
                })
            
            # Step 3: Two-pass allocation per level
            repaired_facings = {}
            for lid, items in level_items.items():
                max_width = level_width_map.get(lid, 999)
                
                # Pass A: Guarantee minimum facings for ALL products
                current_width = 0
                for item in items:
                    min_f = max(1, item['min_f'])  # Never drop below 1
                    space_for_min = min_f * item['width']
                    if current_width + space_for_min <= max_width:
                        item['allocated'] = min_f
                        current_width += space_for_min
                    else:
                        # Even minimum doesn't fit — give 1 if possible
                        if current_width + item['width'] <= max_width:
                            item['allocated'] = 1
                            current_width += item['width']
                        else:
                            item['allocated'] = 0
                
                # Pass B: Distribute remaining width to high-priority products
                # Sort by priority descending for extra facings
                items.sort(key=lambda x: x['priority'], reverse=True)
                remaining = max_width - current_width
                
                for item in items:
                    if item['allocated'] >= item['desired']:
                        continue
                    extra_wanted = item['desired'] - item['allocated']
                    extra_possible = int(remaining // item['width']) if item['width'] > 0 else 0
                    extra = min(extra_wanted, extra_possible)
                    if extra > 0:
                        item['allocated'] += extra
                        remaining -= extra * item['width']
                
                for item in items:
                    repaired_facings[item['sku']] = item['allocated']
            
            return repaired_facings
        
        def obj_func(vector):
            """Score a candidate vector after repairing it."""
            repaired = repair_vector(vector)
            
            # Convert to placements
            current_placements = []
            for sku, fc in repaired.items():
                if fc > 0:
                    prod = products_map.get(sku)
                    if prod:
                        current_placements.append({
                            'sku': sku,
                            'level_id': sku_to_level.get(sku, levels[0]['_id']),
                            'facings': fc,
                            'width_used': fc * prod['widthCm']
                        })
            
            state = placements_to_state(current_placements, products, levels)
            score = score_state(state, products_map, constraint_checker)
            return -score  # MEALPY minimizes by default
            
        from mealpy import FloatVar
        
        problem_dict = {
            "obj_func": obj_func,
            "bounds": FloatVar(lb, ub),
            "minmax": "min",
            "log_to": None
        }

        epoch = config.get('hyperparams', {}).get('epoch', 50)
        pop_size = config.get('hyperparams', {}).get('pop_size', 30)

        if self.use_surrogate:
            return self._optimize_surrogate(
                problem_dict, obj_func, repair_vector,
                initial_placements, skus, products_map, 
                sku_to_level, levels, constraint_checker
            )
        else:
            solver_class = self.solvers.get(self.algorithm_name, GWO.OriginalGWO)
            model = solver_class(epoch=epoch, pop_size=pop_size)
            
            # Seed with initial heuristic solution
            initial_vector = self._get_initial_vector(initial_placements, skus)
            initial_score = -obj_func(initial_vector)
            logger.info(f"GWO baseline score (from heuristic): {initial_score:.2f}")

            try:
                best_agent = model.solve(problem_dict, starting_positions=[initial_vector])
            except Exception:
                best_agent = model.solve(problem_dict)
            
            best_score = -best_agent.target.fitness
            best_vector = best_agent.solution
            convergence = [{"iteration": i, "score": -val} for i, val in enumerate(model.history.list_global_best_fit)]
            
            logger.info(f"GWO best score: {best_score:.2f} (baseline was {initial_score:.2f})")
            
            # Regression protection: always return the better result
            if best_score < initial_score:
                logger.warning(f"Metaheuristic regression: {best_score:.2f} < {initial_score:.2f}. Falling back to baseline.")
                return initial_placements, initial_score, convergence
            
            # Convert best vector through repair to get valid placements
            repaired = repair_vector(best_vector)
            final_placements = self._repaired_to_placements(repaired, products_map, sku_to_level, levels)
            
            return final_placements, best_score, convergence

    def _get_initial_vector(self, initial_placements, skus):
        """Convert initial placements to a vector matching skus indices."""
        vector = np.zeros(len(skus))
        sku_to_idx = {sku: i for i, sku in enumerate(skus)}
        for p in initial_placements:
            if p['sku'] in sku_to_idx:
                vector[sku_to_idx[p['sku']]] = p['facings']
        return vector

    def _repaired_to_placements(self, repaired_facings, products_map, sku_to_level, levels):
        """Convert repaired facings dict to final placements with coordinates."""
        flat_placements = []
        for sku, fc in repaired_facings.items():
            if fc > 0:
                prod = products_map.get(sku)
                if prod:
                    flat_placements.append({
                        'sku': sku,
                        'level_id': sku_to_level.get(sku, levels[0]['_id']),
                        'facings': fc
                    })
        
        state = placements_to_state(flat_placements, list(products_map.values()), levels)
        return state_to_placements(state, products_map)

    def _vector_to_placements(self, vector, skus, products_map, sku_to_level, levels):
        """Legacy method kept for compatibility."""
        flat_placements = []
        for i, f in enumerate(vector):
            facings = int(round(f))
            if facings > 0:
                sku = skus[i]
                prod = products_map.get(sku)
                if prod:
                    flat_placements.append({
                        'sku': sku,
                        'level_id': sku_to_level.get(sku, levels[0]['_id']),
                        'facings': facings
                    })
        
        state = placements_to_state(flat_placements, list(products_map.values()), levels)
        return state_to_placements(state, products_map)

    def _optimize_surrogate(self, problem_dict, obj_func, repair_vector,
                            initial_placements, skus, products_map, 
                            sku_to_level, levels, constraint_checker):
        """Method C: Surrogate-Assisted Evolutionary Optimization (SAEO)"""
        logger.info("Running Surrogate-Assisted Optimization (SAEO)")
        
        dim = len(skus)
        lb = problem_dict['bounds'].lb
        ub = problem_dict['bounds'].ub
        
        # Initial Sampling
        n_initial = min(50, 5 * dim)
        X_train = np.random.uniform(lb, ub, (n_initial, dim))
        
        # Warm start
        initial_vector = self._get_initial_vector(initial_placements, skus)
        initial_score = -obj_func(initial_vector)
        X_train = np.vstack([X_train, initial_vector])
        
        y_train = [problem_dict['obj_func'](x) for x in X_train]
        
        # Infill Loop
        max_real_evals = 100
        n_cycles = 10
        
        kernel = ConstantKernel(1.0) * Matern(length_scale=1.0, nu=2.5)
        gp = GaussianProcessRegressor(kernel=kernel, n_restarts_optimizer=10, normalize_y=True)
        
        convergence = []
        for cycle in range(n_cycles):
            gp.fit(X_train, y_train)
            
            def surrogate_obj(x):
                return gp.predict(x.reshape(1, -1))[0]
            
            from mealpy import FloatVar
            
            surrogate_prob = {
                "obj_func": surrogate_obj,
                "bounds": FloatVar(lb, ub),
                "minmax": "min",
                "log_to": None
            }
            
            sub_model = GWO.OriginalGWO(epoch=30, pop_size=50)
            best_on_surrogate = sub_model.solve(surrogate_prob)
            
            x_new = best_on_surrogate.solution
            y_new = problem_dict['obj_func'](x_new)
            
            X_train = np.vstack([X_train, x_new])
            y_train.append(y_new)
            
            current_best = -min(y_train)
            convergence.append({"iteration": cycle, "score": current_best})
            
            if len(y_train) >= max_real_evals:
                break
                
        idx_best = np.argmin(y_train)
        best_vector = X_train[idx_best]
        best_score = -y_train[idx_best]
        
        # Regression protection
        if best_score < initial_score:
            logger.warning(f"Surrogate regression: {best_score:.2f} < {initial_score:.2f}. Falling back to baseline.")
            return initial_placements, initial_score, convergence
        
        repaired = repair_vector(best_vector)
        final_placements = self._repaired_to_placements(repaired, products_map, sku_to_level, levels)
        
        return final_placements, best_score, convergence
