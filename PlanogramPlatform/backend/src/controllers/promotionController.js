import axios from 'axios';

const PYTHON_SERVICE_URL = 'http://localhost:8000/api/v1';

export const simulatePromotion = async (req, res) => {
    try {
        // Forward the request body directly to the Python service
        const response = await axios.post(`${PYTHON_SERVICE_URL}/simulate/sku`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Error calling Python service:', error.message);
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            res.status(503).json({ message: 'Python service unavailable' });
        } else {
            // Something happened in setting up the request that triggered an Error
            res.status(500).json({ message: 'Error calling promotion forecasting service', error: error.message });
        }
    }
};

export const generatePlan = async (req, res) => {
    try {
        const response = await axios.post(`${PYTHON_SERVICE_URL}/plan/generate`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Error calling Python service:', error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ message: 'Error calling promotion planning service', error: error.message });
        }
    }
};
