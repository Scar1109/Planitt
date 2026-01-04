import BaseAgent from '../core/BaseAgent.js';
import { WASTAGE_SYSTEM_PROMPT } from './prompts.js';
import {
    wastageTools,
    getExpiringProducts,
    getWasteRiskPrediction,
    recommendMarkdown,
    suggestBundles,
    estimateWasteImpact,
} from './tools.js';
import logger from '../../config/logger.js';

/**
 * Wastage Prevention Agent
 * Handles waste reduction queries, expiry tracking, and markdown recommendations
 */
class WastageAgent extends BaseAgent {
    constructor() {
        super('WastageAgent', WASTAGE_SYSTEM_PROMPT);

        // Register all tools
        this.registerTool(wastageTools[0], getExpiringProducts);
        this.registerTool(wastageTools[1], getWasteRiskPrediction);
        this.registerTool(wastageTools[2], recommendMarkdown);
        this.registerTool(wastageTools[3], suggestBundles);
        this.registerTool(wastageTools[4], estimateWasteImpact);

        logger.info('WastageAgent initialized with 5 tools');
    }

    /**
     * Format the agent's response for wastage queries
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
                    action: structuredData.action,
                    priority: structuredData.priority || 'medium',
                };
            }

            // Parse key information from the message
            const action = this.extractAction(message);
            const discount = this.extractDiscount(message);
            const priority = this.extractPriority(message);

            return {
                message: message,
                data: {
                    action,
                    discount,
                    priority,
                },
            };
        } catch (error) {
            logger.error('Error formatting wastage response:', error);
            return {
                message: message,
                data: null,
            };
        }
    }

    /**
     * Extract action from message
     */
    extractAction(message) {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('donate')) {
            return 'donate';
        } else if (lowerMessage.includes('markdown') || lowerMessage.includes('discount')) {
            return 'markdown';
        } else if (lowerMessage.includes('bundle')) {
            return 'bundle';
        } else if (lowerMessage.includes('monitor')) {
            return 'monitor';
        }

        return 'unknown';
    }

    /**
     * Extract discount percentage from message
     */
    extractDiscount(message) {
        // Look for patterns like "50% discount" or "discount of 30%"
        const discountMatch = message.match(/(\d+)%\s*discount/) ||
            message.match(/discount\s*of\s*(\d+)%/);
        if (discountMatch) {
            return parseInt(discountMatch[1], 10);
        }
        return null;
    }

    /**
     * Extract priority from message
     */
    extractPriority(message) {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('critical') || lowerMessage.includes('urgent')) {
            return 'critical';
        } else if (lowerMessage.includes('high priority') || lowerMessage.includes('high risk')) {
            return 'high';
        } else if (lowerMessage.includes('medium')) {
            return 'medium';
        } else if (lowerMessage.includes('low')) {
            return 'low';
        }

        return 'medium';
    }
}

export default WastageAgent;
