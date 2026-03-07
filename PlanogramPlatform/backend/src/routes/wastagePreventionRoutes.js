import express from 'express';
import axios from 'axios';
const router = express.Router();

const PYTHON_WASTAGE_API = 'http://127.0.0.1:8006/api/wastage';

// GET /api/wastage/index-scores 
router.get('/index-scores', async (req, res) => {
    try {
        const response = await axios.get(`${PYTHON_WASTAGE_API}/index-scores`);
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error fetching Wastage Prevention Index Scores:', error.message);
        res.status(500).json({ error: 'Failed to communicate with Wastage Prevention AI Service' });
    }
});

export default router;
