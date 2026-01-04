import Product from '../models/Product.js';

// Get all products with filtering
export const getProducts = async (req, res) => {
    try {
        const { search, category, brand, isActive } = req.query;
        let query = {};

        if (isActive !== undefined) {
            if (isActive === 'true') {
                query.$or = [
                    { isActive: true },
                    { isActive: { $exists: false } }
                ];
            } else {
                query.isActive = false;
            }
        }

        if (search) {
            query.$or = [
                { productName: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } }
            ];
        }

        if (category) {
            query.category = category;
        }

        if (brand) {
            query.brand = brand;
        }

        const products = await Product.find(query).sort({ productName: 1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch products" });
    }
};

// Create a new product
export const createProduct = async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(400).json({ error: "Failed to create product" });
    }
};

// Update an existing product
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedProduct = await Product.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedProduct) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.json(updatedProduct);
    } catch (error) {
        res.status(400).json({ error: "Failed to update product" });
    }
};

// Soft delete product
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedProduct = await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
        if (!updatedProduct) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.json({ message: "Product deactivated", product: updatedProduct });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete product" });
    }
};

// Get unique filter values (Categories, Brands)
export const getProductMetadata = async (req, res) => {
    try {
        const categories = await Product.distinct('category');
        const brands = await Product.distinct('brand');
        res.json({ categories, brands });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch metadata" });
    }
};
