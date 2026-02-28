import OpenAI from 'openai';
import config from '../config/index.js';
import logger from '../config/logger.js';

/**
 * OpenAI service wrapper for agent interactions
 * Handles chat completions with function calling
 */
class OpenAIService {
    constructor() {
        this.client = new OpenAI({
            apiKey: config.openai.apiKey,
        });
        this.model = config.openai.model;
        this.maxTokens = config.openai.maxTokens;
        this.temperature = config.openai.temperature;
    }

    /**
     * Create a chat completion with function calling
     * @param {Array} messages - Array of message objects
     * @param {Array} tools - Array of tool/function definitions
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} OpenAI response
     */
    async createChatCompletion(messages, tools = null, options = {}) {
        try {
            const requestParams = {
                model: options.model || this.model,
                messages: messages,
                temperature: options.temperature || this.temperature,
                max_tokens: options.maxTokens || this.maxTokens,
            };

            // Add tools if provided
            if (tools && tools.length > 0) {
                requestParams.tools = tools;
                requestParams.tool_choice = options.toolChoice || 'auto';
            }

            logger.info(`OpenAI Request: ${messages.length} messages, ${tools ? tools.length : 0} tools`);

            const response = await this.client.chat.completions.create(requestParams);

            logger.info(`OpenAI Response: ${response.choices[0].finish_reason}, tokens: ${response.usage.total_tokens}`);

            return {
                success: true,
                data: response,
                usage: response.usage,
            };
        } catch (error) {
            logger.error('OpenAI API Error:', error.message);

            return {
                success: false,
                error: error.message,
                data: null,
            };
        }
    }

    /**
     * Execute a function call and return the result
     * @param {Object} functionCall - Function call from OpenAI
     * @param {Object} availableFunctions - Map of function names to implementations
     * @returns {Promise<Object>} Function execution result
     */
    async executeFunctionCall(functionCall, availableFunctions) {
        try {
            const functionName = functionCall.name;
            const functionArgs = JSON.parse(functionCall.arguments);

            logger.info(`Executing function: ${functionName}`, functionArgs);

            if (!availableFunctions[functionName]) {
                throw new Error(`Function ${functionName} not found`);
            }

            const result = await availableFunctions[functionName](functionArgs);

            return {
                success: true,
                functionName: functionName,
                result: result,
            };
        } catch (error) {
            logger.error(`Function execution error: ${error.message}`);

            return {
                success: false,
                error: error.message,
                functionName: functionCall.name,
                result: null,
            };
        }
    }

    /**
     * Run a complete agent loop with function calling
     * @param {Array} messages - Initial messages
     * @param {Array} tools - Available tools
     * @param {Object} availableFunctions - Function implementations
     * @param {number} maxIterations - Maximum number of iterations
     * @returns {Promise<Object>} Final agent response
     */
    async runAgentLoop(messages, tools, availableFunctions, maxIterations = 5) {
        let currentMessages = [...messages];
        let iterations = 0;

        while (iterations < maxIterations) {
            iterations++;

            // Get response from OpenAI
            const response = await this.createChatCompletion(currentMessages, tools);

            if (!response.success) {
                return {
                    success: false,
                    error: response.error,
                };
            }

            const choice = response.data.choices[0];
            const message = choice.message;

            // Add assistant's response to messages
            currentMessages.push(message);

            // Check if we're done
            if (choice.finish_reason === 'stop') {
                return {
                    success: true,
                    message: message.content,
                    iterations: iterations,
                    usage: response.usage,
                };
            }

            // Handle function calls
            if (choice.finish_reason === 'tool_calls' && message.tool_calls) {
                // Execute all function calls
                for (const toolCall of message.tool_calls) {
                    const functionResult = await this.executeFunctionCall(
                        toolCall.function,
                        availableFunctions
                    );

                    // Add function result to messages
                    currentMessages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(functionResult.result),
                    });
                }
            } else {
                // Unexpected finish reason
                break;
            }
        }

        return {
            success: false,
            error: 'Maximum iterations reached',
            iterations: iterations,
        };
    }

    /**
     * Simple text completion without function calling
     * @param {string} systemPrompt - System prompt
     * @param {string} userMessage - User message
     * @returns {Promise<Object>} Response
     */
    async simpleCompletion(systemPrompt, userMessage) {
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
        ];

        const response = await this.createChatCompletion(messages);

        if (response.success) {
            return {
                success: true,
                message: response.data.choices[0].message.content,
                usage: response.usage,
            };
        }

        return response;
    }
}

// Export singleton instance
const openAIService = new OpenAIService();
export default openAIService;
