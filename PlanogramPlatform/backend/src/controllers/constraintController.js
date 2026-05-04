import ConstraintRule from '../models/ConstraintRule.js';

/**
 * Get all constraint rules for the authenticated user.
 */
export const getConstraints = async (req, res) => {
    try {
        const constraints = await ConstraintRule.find({ ownerUserId: req.user._id })
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            results: constraints.length,
            data: constraints
        });
    } catch (error) {
        console.error('Get Constraints Error:', error);
        res.status(500).json({ message: 'Failed to fetch constraints', error: error.message });
    }
};

/**
 * Create a new constraint rule.
 */
export const createConstraint = async (req, res) => {
    try {
        const {
            name, ruleType, scope,
            targetSku, targetBrand, targetCategory,
            targetFixtureId, targetLevelId,
            hardConstraint, penaltyWeight, params
        } = req.body;

        // Validate required fields
        if (!name || !ruleType || !scope) {
            return res.status(400).json({ message: 'name, ruleType, and scope are required.' });
        }

        const validRuleTypes = [
            'adjacency_required', 'adjacency_forbidden',
            'min_facings_override', 'max_facings_override',
            'category_shelf_affinity', 'brand_block', 'max_shelf_share'
        ];

        if (!validRuleTypes.includes(ruleType)) {
            return res.status(400).json({ message: `Invalid ruleType. Must be one of: ${validRuleTypes.join(', ')}` });
        }

        const constraint = new ConstraintRule({
            ownerUserId: req.user._id,
            name,
            ruleType,
            scope,
            targetSku: targetSku || null,
            targetBrand: targetBrand || null,
            targetCategory: targetCategory || null,
            targetFixtureId: targetFixtureId || null,
            targetLevelId: targetLevelId || null,
            hardConstraint: hardConstraint !== undefined ? hardConstraint : true,
            penaltyWeight: penaltyWeight || 100,
            params: params || {}
        });

        await constraint.save();

        res.status(201).json({
            status: 'success',
            data: constraint
        });
    } catch (error) {
        console.error('Create Constraint Error:', error);
        res.status(500).json({ message: 'Failed to create constraint', error: error.message });
    }
};

/**
 * Update an existing constraint rule.
 */
export const updateConstraint = async (req, res) => {
    try {
        const { id } = req.params;

        const constraint = await ConstraintRule.findOneAndUpdate(
            { _id: id, ownerUserId: req.user._id },
            req.body,
            { new: true, runValidators: true }
        );

        if (!constraint) {
            return res.status(404).json({ message: 'Constraint not found or unauthorized.' });
        }

        res.status(200).json({
            status: 'success',
            data: constraint
        });
    } catch (error) {
        console.error('Update Constraint Error:', error);
        res.status(500).json({ message: 'Failed to update constraint', error: error.message });
    }
};

/**
 * Delete a constraint rule.
 */
export const deleteConstraint = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await ConstraintRule.findOneAndDelete({
            _id: id,
            ownerUserId: req.user._id
        });

        if (!deleted) {
            return res.status(404).json({ message: 'Constraint not found or unauthorized.' });
        }

        res.status(200).json({
            status: 'success',
            message: 'Constraint deleted.'
        });
    } catch (error) {
        console.error('Delete Constraint Error:', error);
        res.status(500).json({ message: 'Failed to delete constraint', error: error.message });
    }
};

/**
 * Toggle a constraint's active status.
 */
export const toggleConstraint = async (req, res) => {
    try {
        const { id } = req.params;

        const constraint = await ConstraintRule.findOne({
            _id: id,
            ownerUserId: req.user._id
        });

        if (!constraint) {
            return res.status(404).json({ message: 'Constraint not found or unauthorized.' });
        }

        constraint.isActive = !constraint.isActive;
        await constraint.save();

        res.status(200).json({
            status: 'success',
            data: constraint
        });
    } catch (error) {
        console.error('Toggle Constraint Error:', error);
        res.status(500).json({ message: 'Failed to toggle constraint', error: error.message });
    }
};
