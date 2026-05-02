import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../useAuth';
import * as apiModule from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';

// Mocks
vi.mock('../../lib/api', () => ({
    api: {
        post: vi.fn(),
        get: vi.fn(),
        defaults: { baseURL: 'http://test' },
    },
}));

vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
}));

const mockApi = apiModule.api as unknown as { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
}

describe('useAuth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAppStore.getState().clearAuth();
    });

    it('login populates auth store', async () => {
        mockApi.post.mockResolvedValueOnce({ data: { access_token: 'test-token' } });
        mockApi.get.mockResolvedValueOnce({ data: { id: 'user-1', email: 'test@test.com' } });

        const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

        await result.current.login('test@test.com', 'password123');

        await waitFor(() => {
            expect(useAppStore.getState().accessToken).toBe('test-token');
            expect(useAppStore.getState().user?.email).toBe('test@test.com');
        });
    });

    it('login fails with wrong credentials', async () => {
        mockApi.post.mockRejectedValueOnce(new Error('Unauthorized'));

        const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

        await expect(result.current.login('test@test.com', 'wrong')).rejects.toThrow('Unauthorized');
        expect(useAppStore.getState().accessToken).toBeNull();
    });

    it('logout clears auth store', async () => {
        // First set auth
        useAppStore.getState().setAuth({ id: '1', email: 'test@test.com' }, 'token');
        mockApi.post.mockResolvedValueOnce({ data: {} });

        const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

        await result.current.logout();

        expect(useAppStore.getState().accessToken).toBeNull();
        expect(useAppStore.getState().user).toBeNull();
    });
});
