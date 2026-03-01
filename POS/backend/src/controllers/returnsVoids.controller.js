const PosBill = require('../models/PosBill');
const asyncHandler = require('../utils/asyncHandler');

const listReturnsAndVoids = asyncHandler(async (req, res) => {
    const data = await PosBill.find({
        storeId: req.storeId,
        status: { $in: ['paid', 'voided', 'partially_returned', 'returned'] },
    })
        .sort({ updatedAt: -1 })
        .limit(Number(req.query.limit || 200));
    res.json({ data });
});

module.exports = {
    listReturnsAndVoids,
};
