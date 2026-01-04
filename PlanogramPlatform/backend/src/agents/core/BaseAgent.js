import openAIService from '../../services/OpenAIService.js';
import logger from '../../config/logger.js';

/**
 * Base Agent class
 * All domain agents should extend this class
 */
class BaseAgent {
    constructor(name, systemPrompt) {
        this.name = name;
        this.systemPrompt = systemPrompt;
        this.tools = [];
        this.availableFunctions = {};
    }

    /**
     * Register a tool/function for the agent
     * @param {Object} toolDefinition - OpenAI tool definition
     * @param {Function} implementation - Function implementation
     */
    registerTool(toolDefinition, implementation) {
        this.tools.push(toolDefinition);
        this.availableFunctions[toolDefinition.function.name] = implementation;
        logger.info(`Registered tool: ${toolDefinition.function.name} for agent: ${this.name}`);
    }

    /**
     * Process a user query
     * @param {string} query - User's natural language query
     * @param {Object} context - Additional context (storeId, productId, etc.)
     * @returns {Promise<Object>} Agent response
     */
    async processQuery(query, context = {}) {
        try {
            logger.info(`${this.name} processing query: ${query}`);

            // Build initial messages
            const messages = [
                { role: 'system', content: this.systemPrompt },
                { role: 'user', content: this.buildUserMessage(query, context) },
            ];

            // Run agent loop with function calling
            const result = await openAIService.runAgentLoop(
                messages,
                this.tools,
                this.availableFunctions,
                5 // max iterations
            );

            if (!result.success) {
                return {
                    success: false,
                    error: result.error,
                };
            }

            // Parse and format the response
            const formattedResponse = await this.formatResponse(result.message, context);

            return {
                success: true,
                ...formattedResponse,
                metadata: {
                    agent: this.name,
                    iterations: result.iterations,
                    tokensUsed: result.usage?.total_tokens,
                },
            };
        } catch (error) {
            logger.error(`${this.name} error:`, error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Build user message with context
     * @param {string} query - User query
     * @param {Object} context - Context object
     * @returns {string} Formatted user message
     */
    buildUserMessage(query, context) {
        let message = query;

        if (context.storeId) {
            message += `\n\nStore ID: ${context.storeId}`;
        }

        if (context.productId) {
            message += `\nProduct ID: ${context.productId}`;
        }

        if (context.horizon) {
            message += `\nForecast Horizon: ${context.horizon} days`;
        }

        return message;
    }

    /**
     * Format the agent's response
     * Override this in subclasses for domain-specific formatting
     * @param {string} message - Raw message from OpenAI
     * @param {Object} context - Request context
     * @returns {Promise<Object>} Formatted response
     */
    async formatResponse(message, context) {
        // Default implementation - just return the message
        return {
            message: message,
            data: null,
        };
    }

    /**
     * Extract structured data from agent response
     * @param {string} message - Agent message
     * @returns {Object|null} Extracted data
     */
    extractStructuredData(message) {
        try {
            // Try to find JSON in the message
            const jsonMatch = message.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1]);
            }

            // Try to parse the entire message as JSON
            return JSON.parse(message);
        } catch (error) {
            // Not JSON, return null
            return null;
        }
    }
}

export default BaseAgent;
