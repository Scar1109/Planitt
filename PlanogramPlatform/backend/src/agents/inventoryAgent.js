import axios from 'axios';

const INVENTORY_SERVICE_URL = 'http://localhost:8003';

export const getInventoryForecast = async (data) => {
    try {
        const response = await axios.post(`${INVENTORY_SERVICE_URL}/forecast`, data);
        return response.data;
    } catch (error) {
        console.error('Error calling Inventory Service:', error.message);
        throw error;
    }
};

export default {
    getInventoryForecast
};
