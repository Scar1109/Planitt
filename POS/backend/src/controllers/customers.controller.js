const PosCustomer = require('../models/PosCustomer');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

const searchCustomers = asyncHandler(async (req, res) => {
    const { query } = req.query; // can be phone or name
    if (!query || query.length < 3) {
        return res.json({ data: [] });
    }

    const customers = await PosCustomer.find({
        storeId: req.storeId,
        $or: [
            { phone: { $regex: query, $options: 'i' } },
            { name: { $regex: query, $options: 'i' } }
        ]
    }).limit(10);

    res.json({ data: customers });
});

const getCustomers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const customers = await PosCustomer.find({ storeId: req.storeId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await PosCustomer.countDocuments({ storeId: req.storeId });

    res.json({
        data: customers,
        pagination: {
            total,
            page,
            pages: Math.ceil(total / limit)
        }
    });
});

const createCustomer = asyncHandler(async (req, res) => {
    const { phone, name, email } = req.body;

    if (!phone || !name) {
        throw new HttpError(400, 'Phone and name are required');
    }

    const existing = await PosCustomer.findOne({ storeId: req.storeId, phone });
    if (existing) {
        throw new HttpError(409, 'Customer with this phone number already exists');
    }

    const customer = await PosCustomer.create({
        storeId: req.storeId,
        phone,
        name,
        email
    });

    res.status(201).json(customer);
});

module.exports = {
    searchCustomers,
    getCustomers,
    createCustomer
};
