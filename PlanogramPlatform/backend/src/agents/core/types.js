/**
 * Type definitions for agent system
 */

/**
 * @typedef {Object} AgentRequest
 * @property {string} query - User's natural language query
 * @property {string} storeId - Store ID
 * @property {string} [productId] - Optional product ID
 * @property {Object} [context] - Additional context
 */

/**
 * @typedef {Object} AgentResponse
 * @property {boolean} success - Whether the request was successful
 * @property {string} [message] - Human-readable response message
 * @property {Object} [data] - Structured data response
 * @property {number} [confidence] - Confidence score (0-1)
 * @property {string} [error] - Error message if failed
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} AgentTool
 * @property {string} type - Tool type (always 'function')
 * @property {Object} function - Function definition
 * @property {string} function.name - Function name
 * @property {string} function.description - Function description
 * @property {Object} function.parameters - JSON schema for parameters
 */

/**
 * @typedef {Object} AgentContext
 * @property {string} storeId - Store ID
 * @property {string} [productId] - Product ID
 * @property {Date} timestamp - Request timestamp
 * @property {Object} [user] - User information
 */

export const AgentTypes = {
    INVENTORY: 'inventory',
    WASTAGE: 'wastage',
    GENERAL: 'general',
};

export const IntentTypes = {
    FORECAST: 'forecast',
    REORDER: 'reorder',
    WASTE_ANALYSIS: 'waste_analysis',
    MARKDOWN: 'markdown',
    BUNDLE: 'bundle',
    GENERAL_QUERY: 'general_query',
};
