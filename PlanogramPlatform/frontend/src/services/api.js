import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3001/api',
    withCredentials: true
});

export const getComplianceRuns = () => api.get('/compliance/runs');
export const deleteComplianceRun = (id) => api.delete(`/compliance/runs/${id}`);
export const rerunComplianceCheck = (id) => api.post(`/compliance/runs/${id}/rerun`);

export const analyzeShelfScan = (formData) => api.post('/compliance/shelf-scan', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});

export default api;
