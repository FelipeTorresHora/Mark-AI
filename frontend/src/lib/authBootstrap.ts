import axios from 'axios';
import { useAppStore } from '../store/useAppStore';

const authHttp = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    withCredentials: true,
    timeout: 12_000,
    headers: { 'Content-Type': 'application/json' },
});

const PUBLIC_PATH_PREFIXES = ['/login', '/register', '/oauth/'];

export function isPublicAppPath(pathname: string): boolean {
    if (pathname === '/') return true;
    return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Restore session from HttpOnly refresh cookie; bounded time so UI never hangs. */
export async function bootstrapAuthSession(): Promise<void> {
    const { setAuth, clearAuth, finishAuthBootstrap } = useAppStore.getState();

    try {
        const res = await authHttp.post<{ access_token: string; user: { id: string; email: string } }>(
            '/api/v1/auth/refresh',
            {},
        );
        const token = res.data.access_token;
        const userPayload = res.data.user;
        if (userPayload?.id && userPayload?.email) {
            setAuth({ id: userPayload.id, email: userPayload.email }, token);
            return;
        }
        const meRes = await authHttp.get<{ id: string; email: string }>('/api/v1/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
        });
        setAuth({ id: meRes.data.id, email: meRes.data.email }, token);
    } catch {
        clearAuth();
    } finally {
        finishAuthBootstrap();
    }
}
