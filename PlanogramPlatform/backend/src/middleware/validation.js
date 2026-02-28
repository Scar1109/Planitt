import { z } from 'zod';
import logger from '../config/logger.js';

/**
 * Validation middleware factory
 * @param {Object} schema - Zod schema object with optional body, query, params
 */
export function validate(schema) {
    return async (req, res, next) => {
        try {
            if (schema.body) {
                req.body = await schema.body.parseAsync(req.body);
            }
            if (schema.query) {
                req.query = await schema.query.parseAsync(req.query);
            }
            if (schema.params) {
                req.params = await schema.params.parseAsync(req.params);
            }
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                logger.warn('Validation error:', error.errors);
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error.errors && Array.isArray(error.errors)
                        ? error.errors.map(err => ({
                            field: err.path?.join('.') || 'unknown',
                            message: err.message || 'Validation failed',
                        }))
                        : [{ field: 'unknown', message: 'Validation failed' }],
                });
            }
            next(error);
        }
    };
}

/**
 * Common validation schemas
 */
export const schemas = {
    // Agent query schema
    agentQuery: {
        body: z.object({
            query: z.string().min(1, 'Query is required'),
            storeId: z.string().min(1, 'Store ID is required'),
            productId: z.string().optional(),
            horizon: z.number().int().positive().optional(),
        }),
    },

    // Inventory forecast schema
    inventoryForecast: {
        body: z.object({
            query: z.string().optional(),
            storeId: z.string().min(1, 'Store ID is required'),
            productId: z.string().min(1, 'Product ID is required'),
            horizon: z.number().int().positive().default(7),
        }),
    },

    // Wastage analysis schema
    wastageAnalysis: {
        body: z.object({
            query: z.string().optional(),
            storeId: z.string().min(1, 'Store ID is required'),
            productId: z.string().optional(),
            days: z.number().int().positive().default(7),
        }),
    },

    // Store ID param
    storeIdParam: {
        params: z.object({
            storeId: z.string().min(1, 'Store ID is required'),
        }),
    },

    // Product ID param
    productIdParam: {
        params: z.object({
            storeId: z.string().min(1, 'Store ID is required'),
            productId: z.string().min(1, 'Product ID is required'),
        }),
    },
};
