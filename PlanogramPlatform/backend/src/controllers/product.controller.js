import Product from '../models/Product.js';
import logger from '../config/logger.js';

/**
 * Get all products
 * Supports filtering by storeId (though products might be global) and category
 */
export const getProducts = async (req, res) => {
    try {
        const { category, limit = 500 } = req.query;
        const query = {};

        if (category) {
            query.category = category;
        }

        logger.info(`Fetching products with query: ${JSON.stringify(query)}`);

        // Get total count before applying limit
        const total = await Product.countDocuments(query);

        const products = await Product.find(query)
            .limit(parseInt(limit))
            .lean();

        // Map to standardized format for frontend
        const mappedProducts = products.map(p => ({
            sku: p.sku || p.productId || p._id,
            productName: p.productName || p.name || p.sku,
            category: p.category || 'Unknown',
            brand: p.brand || '',
            unitSize: p.unitSize || '',
            shelfLifeDays: p.shelfLifeDays || p.typicalShelfLifeDays || 7,
        }));

        res.json({
            success: true,
            count: mappedProducts.length,
            total: total,  // Total products in MongoDB
            data: mappedProducts
        });

    } catch (error) {
        logger.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error.message
        });
    }
};

/**
 * Get single product by ID (SKU)
 */
export const getProductBySku = async (req, res) => {
    try {
        const { sku } = req.params;
        const product = await Product.findOne({ sku }).lean();

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: product
        });

    } catch (error) {
        logger.error(`Error fetching product ${req.params.sku}:`, error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product',
            error: error.message
        });
    }
};
