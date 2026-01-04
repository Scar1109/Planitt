import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import logger from '../config/logger.js';

/**
 * Get all products
 * Supports filtering by storeId (though products might be global) and category
 */
export const getProducts = async (req, res) => {
    try {
        const { category, limit = 500, sortBy } = req.query;
        const query = {};

        if (category) {
            query.category = category;
        }

        logger.info(`Fetching products with query: ${JSON.stringify(query)}, sortBy: ${sortBy}`);

        let products = [];
        let total = 0;

        if (sortBy === 'highSales') {
            // Aggregation to find top selling products
            logger.info("Running High Sales Impact aggregation...");
            products = await Sale.aggregate([
                // 1. Group by SKU and sum sales
                { $group: { _id: "$sku", totalSold: { $sum: "$unitsSold" } } },
                // 2. Sort by impact
                { $sort: { totalSold: -1 } },
                // 3. Limit (optimization)
                { $limit: parseInt(limit) },
                // 4. Lookup product details
                {
                    $lookup: {
                        from: "products",
                        localField: "_id",
                        foreignField: "sku",
                        as: "productInfo"
                    }
                },
                // 5. Unwind to get object
                { $unwind: "$productInfo" },
                // 6. Project fields (merge totalSold if needed, but for now just return product)
                {
                    $project: {
                        _id: "$productInfo._id",
                        sku: "$productInfo.sku",
                        productName: "$productInfo.productName",
                        category: "$productInfo.category",
                        brand: "$productInfo.brand",
                        unitSize: "$productInfo.unitSize",
                        typicalShelfLifeDays: "$productInfo.typicalShelfLifeDays",
                        // Optional: include metric if needed
                        // salesVolume: "$totalSold" 
                    }
                }
            ]);

            // If query.category applied, we must filter results in aggregation or locally.
            // Aggregation is better: Add $match after lookup. 
            // But 'match' uses 'productInfo.category'.
            if (category) {
                products = products.filter(p => p.category === category);
            }

            total = products.length; // Approximate total for this sorted list

        } else {
            // Normal Fetch
            // Get total count before applying limit
            total = await Product.countDocuments(query);

            products = await Product.find(query)
                .limit(parseInt(limit))
                .lean();
        }

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
