import os
from typing import List, Dict
from dotenv import load_dotenv
from openai import OpenAI
from src.domain.entities import PromotionCandidate, SKUInfo

class NarratorAgent:
    """
    The Storyteller Agent (LLM Powered).
    Uses OpenAI to generate executive summaries and explain strategic decisions.
    """
    
    def __init__(self):
        load_dotenv()
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("!! Narrator: No OpenAI API Key found. Using fallback.")
            self.client = None
        else:
            self.client = OpenAI(api_key=api_key)
            
    def explain_plan(self, plan: List[PromotionCandidate], skus: Dict[str, SKUInfo]) -> List[PromotionCandidate]:
        """
        Enriches the plan with natural language reasoning.
        """
        if not self.client:
            return self._fallback_explain(plan, skus)
            
        print(">>> Narrator: Consulting OpenAI for Strategic Analysis...")
        
        # Batch processing or individual?
        # For cost/speed, let's do a batch analysis of the top items, 
        # but here we iterate for granular reasoning on the recommended items.
        
        for cand in plan:
            sku = skus.get(cand.sku_id)
            if not sku: continue
            
            prompt = self._build_prompt(cand, sku)
            
            try:
                response = self.client.chat.completions.create(
                    model="gpt-4o", # Or gpt-3.5-turbo if 4o unavailable
                    messages=[
                        {"role": "system", "content": "You are a Senior Retail Strategist for a high-volume supermarket in Sri Lanka. Your goal is to explain promotion decisions to Store Managers. Consider intent: Is this a 'Revenue Driver' or 'Stock Clearance'? Be concise, professional, and explain the *why*."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=100,
                    temperature=0.7
                )
                reasoning = response.choices[0].message.content.strip()
                cand.reasoning = reasoning
            except Exception as e:
                print(f"!! Narrator Error: {e}")
                cand.reasoning = self._fallback_reasoning(cand)
                
        return plan

    def _build_prompt(self, cand: PromotionCandidate, sku: SKUInfo) -> str:
        return f"""
        Explain why we are recommending a {cand.discount_depth*100:.0f}% discount on {sku.name} ({sku.category}).
        
        Data:
        - Baseline Forecast: {cand.baseline_forecast:.1f} units
        - Predicted Lift: +{cand.uplift_forecast:.1f} units
        - Profit Impact: {cand.profit_lift:.2f} LKR
        - Stock Level: {sku.stock_level}
        
        Explain the strategic value in 1 sentence. Mentions if it catches a trend or clears stock.
        """

    def _fallback_explain(self, plan: List[PromotionCandidate], skus: Dict[str, SKUInfo]) -> List[PromotionCandidate]:
        for cand in plan:
            cand.reasoning = self._fallback_reasoning(cand)
        return plan

    def _fallback_reasoning(self, cand: PromotionCandidate) -> str:
        return f"Model predicts {cand.uplift_forecast:.1f} unit lift, generating {cand.profit_lift:.2f} profit."
