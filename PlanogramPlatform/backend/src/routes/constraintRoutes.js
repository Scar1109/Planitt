import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
    getConstraints,
    createConstraint,
    updateConstraint,
    deleteConstraint,
    toggleConstraint
} from '../controllers/constraintController.js';

const router = express.Router();

// All constraint routes are protected
router.use(protect);

router.get('/', getConstraints);
router.post('/', createConstraint);
router.patch('/:id', updateConstraint);
router.delete('/:id', deleteConstraint);
router.patch('/:id/toggle', toggleConstraint);

export default router;
