import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000', // Points to Platform Backend
});

export default api;
