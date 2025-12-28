import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
});

export const checkHealth = async () => {
    return await axios.get('http://localhost:5000/health');
};

export default api;
