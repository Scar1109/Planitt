from ortools.linear_solver import pywraplp
from typing import List, Dict, Optional
from src.domain.entities import PromotionCandidate, PromotionPlan, Constraint, ObjectiveType, SKUInfo

import logging

logger = logging.getLogger(__name__)

class StrategistAgent:
    """
    The Optimizer.
    Uses Mixed Integer Programming (MIP) to solve the Knapsack Problem for retail promotions.
    
    Mathematical Formulation:
    -------------------------
    Maximize: 
        Z = sum_i( x_i * value_i )
    where:
        x_i in {0, 1} indicates if PromotionCandidate i is selected.
        value_i depends on the ObjectiveType:
            - MAX_PROFIT: sum_i( x_i * profit_lift_i )
            - MIN_WASTE: sum_i( x_i * waste_saved_i )
            - MAX_REVENUE: sum_i( x_i * revenue_lift_i )

    Subject to:
        1. Capacity Constraint: sum_i( x_i ) <= max_slots
        2. Category Diversity: sum_{i in Category(c)}( x_i ) <= max_per_category  (for all categories c)
        3. Mutual Exclusivity: sum_{i in SKU(s)}( x_i ) <= 1                      (for all SKUs s)
    """
    
    def generate_plan(self, 
                      candidates: List[PromotionCandidate], 
                      skus: Dict[str, SKUInfo],
                      constraints: Constraint,
                      objective: ObjectiveType = ObjectiveType.MAX_PROFIT) -> PromotionPlan:
                      
        # 1. Setup Solver (SCIP or CBC)
        solver = pywraplp.Solver.CreateSolver('SCIP')
        if not solver:
            # Fallback to GLOP? No, discrete vars needed.
            return self._heuristic_fallback(candidates, constraints, objective)
            
        # 2. Variables
        # x[i] = 1 if candidate i is selected, 0 otherwise
        x = {}
        for i, cand in enumerate(candidates):
            x[i] = solver.IntVar(0, 1, f'x_{i}')
            
        # 3. Objective Function
        objective_expr = 0
        for i, cand in enumerate(candidates):
            sku = skus.get(cand.sku_id)
            if objective == ObjectiveType.MAX_PROFIT:
                # Profit Lift = Lift Units * Margin - PromoCost
                # This is pre-calculated in 'profit_lift' by Uplift Agent usually
                # Using the value provided in candidate
                val = cand.profit_lift
            elif objective == ObjectiveType.MIN_WASTE:
                val = cand.waste_saved
            else: # Revenue
                val = cand.revenue_lift
            
            objective_expr += x[i] * val
            
        solver.Maximize(objective_expr)
        
        # 4. Constraints
        
        # C1: Max Slots (Capacity)
        slot_expr = 0
        for i in range(len(candidates)):
            slot_expr += x[i]
        solver.Add(slot_expr <= constraints.max_slots)
        
        # C2: Category Diversity (Max K per category)
        # Group indices by category
        cat_indices = {}
        for i, cand in enumerate(candidates):
            sku = skus.get(cand.sku_id)
            if sku:
                cat_indices.setdefault(sku.category, []).append(i)
                
        for cat, indices in cat_indices.items():
            cat_expr = 0
            for idx in indices:
                cat_expr += x[idx]
            solver.Add(cat_expr <= constraints.max_per_category)
            
        # C3: Mutually Exclusive (One promo per SKU)
        # If input has multiple options for same SKU (e.g., 10% vs 20%), 
        # we must pick at most one.
        sku_indices = {}
        for i, cand in enumerate(candidates):
            sku_indices.setdefault(cand.sku_id, []).append(i)
            
        for sku_id, indices in sku_indices.items():
            sku_expr = 0
            for idx in indices:
                sku_expr += x[idx]
            solver.Add(sku_expr <= 1)
            
        # 5. Solve
        
        # Logging constraint parameters to ensure formal mathematical reproducibility
        logger.info("=== Strategist Optimization Run ===")
        logger.info(f"Objective Type: {objective.value}")
        logger.info(f"Available Candidates: {len(candidates)}")
        logger.info(f"Constraints - Max Slots: {constraints.max_slots}")
        logger.info(f"Constraints - Max per Category: {constraints.max_per_category}")
        logger.info("Solving Multi-Objective Integer Formulation...")
        print(f">>> Strategist Opt: Obj={objective}, MaxSlots={constraints.max_slots}, MaxPerCat={constraints.max_per_category}, TotalCand={len(candidates)}")
        
        status = solver.Solve()
        
        selected_candidates = []
        if status == pywraplp.Solver.OPTIMAL or status == pywraplp.Solver.FEASIBLE:
            print(f"Solution Found! Objective Value: {solver.Objective().Value()}")
            for i in range(len(candidates)):
                if x[i].solution_value() > 0.5:
                    selected_candidates.append(candidates[i])
        else:
            print("Solver failed to find optimal solution.")
            
        return selected_candidates

    def _heuristic_fallback(self, candidates, constraints, objective):
        """
        Greedy Sort fallback if solver fails (or lib missing).
        """
        print("Using Greedy Heuristic Fallback")
        # Sort by value
        if objective == ObjectiveType.MAX_PROFIT:
            candidates.sort(key=lambda c: c.profit_lift, reverse=True)
            
        selected = []
        # Naive fill
        for cand in candidates:
            if len(selected) < constraints.max_slots:
                selected.append(cand)
        return selected
