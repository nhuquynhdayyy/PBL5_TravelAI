import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'https://localhost:7243/api',
    headers: { 'Content-Type': 'application/json' }
});

export default axiosInstance;