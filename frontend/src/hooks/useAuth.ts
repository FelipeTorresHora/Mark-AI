import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import { showSuccess } from '../lib/toast';

export function useAuth() {
    const { user, accessToken, isAuthLoading, setAuth, clearAuth } = useAppStore();
    const navigate = useNavigate();

    const isAuthenticated = !!accessToken;

    /** Restore session from HttpOnly cookie on page load. */
    const silentRefresh = useCallback(async () => {
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/auth/refresh`,
                {},
                { withCredentials: true },
            );
            const newToken: string = res.data.access_token;
            // Fetch user info
            const meRes = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/auth/me`,
                { headers: { Authorization: `Bearer ${newToken}` } },
            );
            setAuth({ id: meRes.data.id, email: meRes.data.email }, newToken);
        } catch {
            clearAuth();
        }
    }, [setAuth, clearAuth]);

    const login = useCallback(
        async (email: string, password: string) => {
            const res = await api.post('/api/v1/auth/login', { email, password });
            const token: string = res.data.access_token;
            const meRes = await api.get('/api/v1/auth/me', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAuth({ id: meRes.data.id, email: meRes.data.email }, token);
            showSuccess('Login realizado com sucesso!');
            navigate('/campanhas');
        },
        [setAuth, navigate],
    );

    const register = useCallback(
        async (email: string, password: string) => {
            await api.post('/api/v1/auth/register', { email, password });
            // Auto-login after registration
            await login(email, password);
        },
        [login],
    );

    const logout = useCallback(async () => {
        try {
            await api.post('/api/v1/auth/logout');
        } catch {
            // Ignore logout errors — clear local state regardless
        }
        clearAuth();
        navigate('/login', { replace: true });
    }, [clearAuth, navigate]);

    return { user, accessToken, isAuthenticated, isAuthLoading, silentRefresh, login, register, logout };
}
