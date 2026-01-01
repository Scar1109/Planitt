import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export const getUsers = async (req, res) => {
    try {
        let query = {};

        // Role-Based Visibility Filtering
        let roleFilter = {};
        if (req.user.role === 'manager') {
            roleFilter = { $nin: ['admin', 'owner'] };
        } else if (req.user.role === 'owner') {
            roleFilter = { $ne: 'admin' };
        }

        if (req.user.role === 'admin') {
            if (req.query.store) {
                query.store = req.query.store;
            }
            if (req.query.unassigned) {
                query.store = null;
            }
        } else {
            // Apply Role Filter for non-admins
            if (Object.keys(roleFilter).length > 0) {
                query.role = roleFilter;
            }

            if (req.user.store) {
                query.store = req.user.store;
            } else {
                // Unassigned users see nothing
                return res.status(200).json({ status: 'success', results: 0, data: { users: [] } });
            }
        }
        query._id = { $ne: req.user._id };

        const users = await User.find(query)
            .select('-passwordHash')
            .populate('store'); // Populate the Store reference

        res.status(200).json({
            status: 'success',
            results: users.length,
            data: {
                users
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const createUser = async (req, res) => {
    try {
        const { fullName, email, password, role, store } = req.body;
        const currentUserRole = req.user.role;

        // Role-based Access Control
        if (currentUserRole === 'staff') {
            return res.status(403).json({ message: 'Staff cannot create users.' });
        }

        if (currentUserRole === 'manager') {
            if (!['manager', 'staff'].includes(role)) {
                return res.status(403).json({ message: 'Managers can only create Managers or Staff.' });
            }
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Determine Store Assignment
        // Admin can assign any store (by ID).
        // Owners/Managers assign to their own store.
        let assignedStore = null;
        if (currentUserRole === 'admin') {
            assignedStore = store || null;
        } else {
            assignedStore = req.user.store;
        }

        const isActive = true;

        const newUser = await User.create({
            fullName,
            email,
            passwordHash,
            role,
            store: assignedStore,
            isActive
        });

        // Populate store for response
        await newUser.populate('store');
        newUser.passwordHash = undefined;

        res.status(201).json({
            status: 'success',
            data: {
                user: newUser
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { fullName, role, email, store } = req.body;

        // Construct update object
        const updateData = { fullName, role, email };

        // Handle Store Reassignment
        if (store !== undefined) {
            updateData.store = store || null;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-passwordHash').populate('store');

        res.status(200).json({
            status: 'success',
            data: {
                user: updatedUser
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const updateMe = async (req, res) => {
    try {
        const { fullName, phone, currentPassword, newPassword } = req.body;

        // 1. Get user from collection
        const user = await User.findById(req.user.id).select('+passwordHash');

        // Create update object with only allowed fields
        const updateData = {};
        if (fullName) updateData.fullName = fullName;
        if (phone) updateData.phone = phone;

        // 2. Check if user is trying to update password
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Please provide your current password to set a new one.' });
            }

            // 3. Verify current password
            const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isMatch) {
                return res.status(401).json({ message: 'Incorrect current password.' });
            }

            // 4. Hash new password
            const salt = await bcrypt.genSalt(10);
            updateData.passwordHash = await bcrypt.hash(newPassword, salt);
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-passwordHash').populate('store');

        res.status(200).json({
            status: 'success',
            data: {
                user: updatedUser
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const toggleUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isActive = !user.isActive;
        await user.save();

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
