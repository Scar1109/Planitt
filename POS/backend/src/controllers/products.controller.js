const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { writeAuditLog } = require('../services/audit.service');

const listProducts = asyncHandler(async (req, res) => {
    const { search = '', category, isActive } = req.query;
    const query = {};
    if (category) query.category = category;
    if (isActive === 'true') query.isActive = true;
    if (isActive === 'false') query.isActive = false;
    if (search) {
        query.$or = [
            { sku: { $regex: search, $options: 'i' } },
            { productName: { $regex: search, $options: 'i' } },
            { barcode: { $regex: search, $options: 'i' } },
        ];
    }
    const items = await Product.find(query).sort({ productName: 1 }).limit(Number(req.query.limit || 500));
    res.json({ data: items });
});

const createProduct = asyncHandler(async (req, res) => {
    const existing = await Product.findOne({ $or: [{ sku: req.body.sku }, { barcode: req.body.barcode || '__none__' }] });
    if (existing) {
        throw new HttpError(409, 'SKU or barcode already exists');
    }
    const created = await Product.create(req.body);
    await writeAuditLog({
        storeId: req.storeId,
        userId: req.user._id,
        action: 'PRODUCT_CREATE',
        entityType: 'Product',
        entityId: created._id,
        payload: created.toObject(),
    });
    res.status(201).json(created);
});

const updateProduct = asyncHandler(async (req, res) => {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!updated) {
        throw new HttpError(404, 'Product not found');
    }
    await writeAuditLog({
        storeId: req.storeId,
        userId: req.user._id,
        action: 'PRODUCT_UPDATE',
        entityType: 'Product',
        entityId: updated._id,
        payload: req.body,
    });
    res.json(updated);
});

const toggleProductStatus = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        throw new HttpError(404, 'Product not found');
    }
    product.isActive = !product.isActive;
    await product.save();
    await writeAuditLog({
        storeId: req.storeId,
        userId: req.user._id,
        action: 'PRODUCT_STATUS_TOGGLE',
        entityType: 'Product',
        entityId: product._id,
        payload: { isActive: product.isActive },
    });
    res.json(product);
});

module.exports = {
    listProducts,
    createProduct,
    updateProduct,
    toggleProductStatus,
};
