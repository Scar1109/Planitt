import BaseAgent from '../core/BaseAgent.js';
import { INVENTORY_SYSTEM_PROMPT } from './prompts.js';
import {
    inventoryTools,
    getCurrentInventory,
    getDemandForecast,
    getHistoricalSales,
    calculateReorderPoint,
    analyzeTrends,
} from './tools.js';
import logger from '../../config/logger.js';

/**
 * Inventory Forecasting Agent
 * Handles inventory-related queries, demand forecasting, and reorder recommendations
 */
class InventoryAgent extends BaseAgent {
    constructor() {
        super('InventoryAgent', INVENTORY_SYSTEM_PROMPT);

        // Register all tools
        this.registerTool(inventoryTools[0], getCurrentInventory);
        this.registerTool(inventoryTools[1], getDemandForecast);
        this.registerTool(inventoryTools[2], getHistoricalSales);
        this.registerTool(inventoryTools[3], calculateReorderPoint);
        this.registerTool(inventoryTools[4], analyzeTrends);

        logger.info('InventoryAgent initialized with 5 tools');
    }

    /**
     * Format the agent's response for inventory queries
     * @param {string} message - Raw message from OpenAI
     * @param {Object} context - Request context
     * @returns {Promise<Object>} Formatted response
     */
    async formatResponse(message, context) {
        try {
            // Try to extract structured data
            const structuredData = this.extractStructuredData(message);

            if (structuredData) {
                return {
                    message: message,
                    data: structuredData,
                    recommendation: structuredData.recommendation,
                    confidence: structuredData.confidence || 0.8,
                };
            }

            // Parse key information from the message
            const recommendation = this.extractRecommendation(message);
            const quantity = this.extractQuantity(message);
            const confidence = this.extractConfidence(message);

            return {
                message: message,
                data: {
                    recommendation,
                    quantity,
                    confidence,
                },
            };
        } catch (error) {
            logger.error('Error formatting inventory response:', error);
            return {
                message: message,
                data: null,
            };
        }
    }

    /**
     * Extract recommendation from message
     */
    extractRecommendation(message) {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('reorder') || lowerMessage.includes('order')) {
            return 'reorder';
        } else if (lowerMessage.includes('don\'t reorder') || lowerMessage.includes('sufficient')) {
            return 'no_action';
        } else if (lowerMessage.includes('monitor') || lowerMessage.includes('watch')) {
            return 'monitor';
        }

        return 'unknown';
    }

    /**
     * Extract quantity from message
     */
    extractQuantity(message) {
        // Look for patterns like "order 30 units" or "reorder 50"
        const quantityMatch = message.match(/(?:order|reorder)\s+(\d+)/i);
        if (quantityMatch) {
            return parseInt(quantityMatch[1], 10);
        }
        return null;
    }

    /**
     * Extract confidence from message
     */
    extractConfidence(message) {
        // Look for patterns like "confidence: 0.85" or "85% confident"
        const confidenceMatch = message.match(/confidence[:\s]+(\d+\.?\d*)/i) ||
            message.match(/(\d+)%\s+confident/i);
        if (confidenceMatch) {
            const value = parseFloat(confidenceMatch[1]);
            return value > 1 ? value / 100 : value;
        }
        return 0.8; // Default confidence
    }
}

export default InventoryAgent;
