import axios from 'axios';
import { useAppStore } from '../store/useAppStore';

// Base API instance for standard REST calls
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // required to send/receive HttpOnly refresh_token cookie
    timeout: 20_000,
});

// Request interceptor — attach access token from Zustand memory
api.interceptors.request.use((config) => {
    const token: string | null = useAppStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor — on 401, attempt one silent refresh via the HttpOnly cookie
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token!);
        }
    });
    failedQueue = [];
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const url = String(originalRequest?.url ?? '');
        const isAuthRefresh = url.includes('/api/v1/auth/refresh');
        const isAuthLogin = url.includes('/api/v1/auth/login');
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRefresh && !isAuthLogin) {
            if (isRefreshing) {
                return new Promise<string>((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Use a bare axios call so this request doesn't re-trigger the interceptor
                const res = await axios.post<{ access_token: string; user?: { id: string; email: string } }>(
                    `${api.defaults.baseURL}/api/v1/auth/refresh`,
                    {},
                    { withCredentials: true, timeout: 12_000 },
                );
                const newToken: string = res.data.access_token;
                const refreshedUser = res.data.user;
                const currentUser = useAppStore.getState().user;
                if (refreshedUser?.id && refreshedUser?.email) {
                    useAppStore.getState().setAuth(
                        { id: refreshedUser.id, email: refreshedUser.email },
                        newToken,
                    );
                } else if (currentUser) {
                    useAppStore.getState().setAuth(currentUser, newToken);
                } else {
                    const meRes = await axios.get<{ id: string; email: string }>(
                        `${api.defaults.baseURL}/api/v1/auth/me`,
                        { headers: { Authorization: `Bearer ${newToken}` }, timeout: 12_000 },
                    );
                    useAppStore.getState().setAuth(
                        { id: meRes.data.id, email: meRes.data.email },
                        newToken,
                    );
                }

                processQueue(null, newToken);
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                useAppStore.getState().clearAuth();
                const onLogin = window.location.pathname.startsWith('/login')
                    || window.location.pathname.startsWith('/register');
                if (!onLogin) {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    },
);

export const SSE_ENDPOINT = `${api.defaults.baseURL}/sse`;
