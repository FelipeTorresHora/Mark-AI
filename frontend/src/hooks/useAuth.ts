import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { bootstrapAuthSession } from '../lib/authBootstrap';
import { useAppStore } from '../store/useAppStore';
import { showSuccess } from '../lib/toast';
import { isOnboardingComplete } from '../lib/onboarding';

type AuthLoginResponse = {
    access_token: string;
    user: { id: string; email: string };
};

export function useAuth() {
    const { user, accessToken, isAuthLoading, setAuth, clearAuth } = useAppStore();
    const navigate = useNavigate();

    const isAuthenticated = !!accessToken;

    /** Restore session from HttpOnly cookie on page load. */
    const silentRefresh = useCallback(async () => {
        await bootstrapAuthSession();
    }, []);

    const login = useCallback(
        async (email: string, password: string, options?: { redirectTo?: string }) => {
            const res = await api.post<AuthLoginResponse>('/api/v1/auth/login', { email, password });
            const token: string = res.data.access_token;
            const profile = res.data.user;
            setAuth({ id: profile.id, email: profile.email }, token);
            showSuccess('Login realizado com sucesso!');

            if (options?.redirectTo) {
                navigate(options.redirectTo);
                return;
            }

            navigate(isOnboardingComplete(profile.id) ? '/campanhas' : '/onboarding');
        },
        [setAuth, navigate],
    );

    const register = useCallback(
        async (email: string, password: string) => {
            await api.post('/api/v1/auth/register', { email, password });
            await login(email, password, { redirectTo: '/onboarding' });
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
