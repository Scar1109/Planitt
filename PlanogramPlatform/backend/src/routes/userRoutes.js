import express from 'express';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import { getUsers, createUser, updateUser, toggleUserStatus, updateMe } from '../controllers/userController.js';

const router = express.Router();

// All routes require login
router.use(protect);

// Self-service routes
router.get('/me', (req, res, next) => {
    req.params.id = req.user.id;
    next();
}, getUsers);

router.put('/me', updateMe);

// Admin/Owner/Manager Management Routes
router.use(restrictTo('admin', 'owner', 'manager'));

router
    .route('/')
    .get(getUsers)
    .post(createUser);

router
    .route('/:id')
    .put(updateUser);

router
    .route('/:id/status')
    .patch(restrictTo('admin', 'owner'), toggleUserStatus); // Only Admin/Owner can toggle status

export default router;
