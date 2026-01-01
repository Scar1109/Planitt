import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    const cookieOptions = {
        expires: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' // Adjust based on requirement
    };

    res.cookie('jwt', token, cookieOptions);

    user.passwordHash = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
};

export const signup = async (req, res) => {
    try {
        const { fullName, email, password, role } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Restrict allowed roles for self-signup
        const allowedRoles = ['manager', 'staff'];
        const userRole = allowedRoles.includes(role) ? role : 'staff';

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await User.create({
            fullName,
            email,
            passwordHash,
            role: userRole,
            isActive: false // Always inactive initially
        });

        // Do NOT log in automatically. Require approval.
        res.status(201).json({
            status: 'success',
            message: 'Account created successfully. Please contact your Store Owner or Admin to approve your account.'
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        const user = await User.findOne({ email }).populate('store');

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ message: 'Incorrect email or password' });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is pending approval. Please contact your manager for access.' });
        }

        user.lastLoginAt = Date.now();
        await user.save({ validateBeforeSave: false });

        createSendToken(user, 200, res);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.status(200).json({ status: 'success' });
};

export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('store');
        res.status(200).json({
            status: 'success',
            data: {
                user
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
