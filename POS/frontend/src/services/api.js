import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_POS_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('pos_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export async function login(payload) {
    const { data } = await api.post('/auth/login', payload);
    if (data.token) {
        localStorage.setItem('pos_token', data.token);
    }
    return data;
}

export async function logout() {
    await api.post('/auth/logout');
    localStorage.removeItem('pos_token');
}

export async function getMe() {
    const { data } = await api.get('/auth/me');
    return data;
}

export default api;
