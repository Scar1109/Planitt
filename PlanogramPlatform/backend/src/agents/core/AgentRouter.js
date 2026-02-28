import openAIService from '../../services/OpenAIService.js';
import logger from '../../config/logger.js';
import { IntentTypes } from './types.js';

/**
 * Agent Router - Routes queries to appropriate domain agents
 * Uses OpenAI to classify user intent
 */
class AgentRouter {
    constructor() {
        this.agents = new Map();
    }

    /**
     * Register a domain agent
     * @param {string} agentType - Agent type identifier
     * @param {BaseAgent} agent - Agent instance
     */
    registerAgent(agentType, agent) {
        this.agents.set(agentType, agent);
        logger.info(`Registered agent: ${agentType}`);
    }

    /**
     * Classify user intent and route to appropriate agent
     * @param {string} query - User query
     * @param {Object} context - Request context
     * @returns {Promise<Object>} Agent response
     */
    async routeQuery(query, context = {}) {
        try {
            // Classify intent
            const intent = await this.classifyIntent(query, context);

            logger.info(`Classified intent: ${intent.type}, agent: ${intent.agent}`);

            // Get appropriate agent
            const agent = this.agents.get(intent.agent);

            if (!agent) {
                return {
                    success: false,
                    error: `No agent found for type: ${intent.agent}`,
                };
            }

            // Route to agent
            const response = await agent.processQuery(query, {
                ...context,
                intent: intent.type,
            });

            return response;
        } catch (error) {
            logger.error('Agent routing error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Classify user intent using OpenAI
     * @param {string} query - User query
     * @param {Object} context - Request context
     * @returns {Promise<Object>} Intent classification
     */
    async classifyIntent(query, context) {
        const systemPrompt = `You are an intent classifier for a retail AI system.
Classify the user's query into one of these categories:

1. INVENTORY_FORECAST - Questions about future demand, sales predictions, or stock forecasting
   Examples: "What's the forecast for Coca-Cola?", "How much will we sell next week?"

2. INVENTORY_REORDER - Questions about reordering, stock replenishment, or when to order
   Examples: "Should I reorder milk?", "When should I order more bread?"

3. WASTAGE_ANALYSIS - Questions about expiring products, waste risk, or products at risk
   Examples: "What products are expiring soon?", "Which items have high waste risk?"

4. WASTAGE_MARKDOWN - Questions about discounts, markdowns, or promotions for expiring items
   Examples: "What discount should I give on yogurt?", "How to reduce waste through promotions?"

5. WASTAGE_BUNDLE - Questions about bundling products or creating offers
   Examples: "What products should I bundle?", "Create a combo offer for slow-moving items"

Respond with a JSON object:
{
  "type": "INVENTORY_FORECAST" | "INVENTORY_REORDER" | "WASTAGE_ANALYSIS" | "WASTAGE_MARKDOWN" | "WASTAGE_BUNDLE",
  "agent": "inventory" | "wastage",
  "confidence": 0.0-1.0
}`;

        const response = await openAIService.simpleCompletion(systemPrompt, query);

        if (!response.success) {
            // Default to inventory agent
            return {
                type: IntentTypes.GENERAL_QUERY,
                agent: 'inventory',
                confidence: 0.5,
            };
        }

        try {
            const classification = JSON.parse(response.message);
            return classification;
        } catch (error) {
            logger.error('Failed to parse intent classification:', error);
            // Default to inventory agent
            return {
                type: IntentTypes.GENERAL_QUERY,
                agent: 'inventory',
                confidence: 0.5,
            };
        }
    }
}

// Export singleton instance
const agentRouter = new AgentRouter();
export default agentRouter;
