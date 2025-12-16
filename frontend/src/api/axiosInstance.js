import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL !== undefined
    ? process.env.REACT_APP_API_URL
    : 'http://localhost:8081';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// 요청 인터셉터 - 토큰 자동 첨부
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 응답 인터셉터 - 401 에러 처리
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // 토큰 만료 시 로그아웃 처리
            localStorage.removeItem('token');
            localStorage.removeItem('member');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
