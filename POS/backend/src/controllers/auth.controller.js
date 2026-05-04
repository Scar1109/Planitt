const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Store = require('../models/Store');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

function signToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
}

function sanitizeUser(user) {
    const safe = { ...user };
    delete safe.passwordHash;
    return safe;
}

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).lean();
    if (!user) {
        throw new HttpError(401, 'Invalid credentials');
    }
    const matched = await bcrypt.compare(password, user.passwordHash);
    if (!matched) {
        throw new HttpError(401, 'Invalid credentials');
    }
    if (!user.isActive) {
        throw new HttpError(403, 'Account is inactive');
    }

    const token = signToken(user._id);
    res.cookie('pos_jwt', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    let storeName = null;
    if (user.store) {
        const store = await Store.findById(user.store).select('name').lean();
        storeName = store?.name || null;
    }

    res.json({
        token,
        user: { ...sanitizeUser(user), storeName },
    });
});

const me = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate('store').lean();
    res.json({
        user: sanitizeUser(user),
    });
});

const logout = asyncHandler(async (req, res) => {
    res.cookie('pos_jwt', '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 0,
    });
    res.json({ message: 'Logged out' });
});

module.exports = {
    login,
    me,
    logout,
};
