const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

function extractToken(req) {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }
    if (req.cookies && req.cookies.pos_jwt) {
        return req.cookies.pos_jwt;
    }
    return null;
}

const requireAuth = asyncHandler(async (req, res, next) => {
    const token = extractToken(req);
    if (!token) {
        throw new HttpError(401, 'Authentication required');
    }

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new HttpError(401, 'Invalid token');
    }

    const user = await User.findById(payload.id).lean();
    if (!user || !user.isActive) {
        throw new HttpError(401, 'User not active');
    }

    req.user = user;
    req.storeId = user.store ? String(user.store) : null;
    next();
});

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return next(new HttpError(401, 'Authentication required'));
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(new HttpError(403, 'Insufficient permissions'));
        }
        return next();
    };
}

module.exports = {
    requireAuth,
    requireRole,
};
