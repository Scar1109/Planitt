import Store from '../models/Store.js';
import User from '../models/User.js';

export const getAllStores = async (req, res) => {
    try {
        const stores = await Store.find().select('name _id');
        res.status(200).json({
            status: 'success',
            results: stores.length,
            data: { stores }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const createStore = async (req, res) => {
    try {
        const { name, address, phone, location } = req.body;

        // Admin only usually, or during enhanced signup
        const newStore = await Store.create({
            name,
            address,
            phone,
            location,
            createdBy: req.user._id
        });

        res.status(201).json({
            status: 'success',
            data: {
                store: newStore
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getMyStore = async (req, res) => {
    try {
        // User has 'store' populated or ID
        if (!req.user.store) {
            return res.status(404).json({ message: 'No store assigned to this user.' });
        }

        const store = await Store.findById(req.user.store);

        if (!store) {
            return res.status(404).json({ message: 'Store not found.' });
        }

        res.status(200).json({
            status: 'success',
            data: {
                store
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const updateStore = async (req, res) => {
    try {
        const { name, address, phone, location } = req.body;
        const storeId = req.params.id;

        // Security check: Only Owner of this store or Admin can update
        // req.user.store is an ObjectId (or populated object depending on middleware auth load) check

        const isOwner = req.user.store && req.user.store.toString() === storeId;
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'You do not have permission to update this store.' });
        }

        const updatedStore = await Store.findByIdAndUpdate(
            storeId,
            { name, address, phone, location },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            status: 'success',
            data: {
                store: updatedStore
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
