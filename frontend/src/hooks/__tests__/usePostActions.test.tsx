import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePostActions } from '../usePostActions';
import * as apiModule from '../../lib/api';

vi.mock('../../lib/api', () => ({
    api: { patch: vi.fn() },
}));

vi.mock('../../lib/toast', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const mockApi = apiModule.api as unknown as { patch: ReturnType<typeof vi.fn> };

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
}

describe('usePostActions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('approves a post', async () => {
        mockApi.patch.mockResolvedValueOnce({ data: { id: '1', status: 'FINAL' } });

        const { result } = renderHook(() => usePostActions(), { wrapper: createWrapper() });

        await result.current.approvePost('post-1');

        expect(mockApi.patch).toHaveBeenCalledWith('/api/v1/posts/post-1', { status: 'FINAL' });
    });

    it('rejects a post', async () => {
        mockApi.patch.mockResolvedValueOnce({ data: { id: '1', status: 'REJECTED' } });

        const { result } = renderHook(() => usePostActions(), { wrapper: createWrapper() });

        await result.current.rejectPost('post-1');

        expect(mockApi.patch).toHaveBeenCalledWith('/api/v1/posts/post-1', { status: 'REJECTED' });
    });

    it('shows loading state during approval', async () => {
        mockApi.patch.mockReturnValueOnce(new Promise(() => {}));

        const { result } = renderHook(() => usePostActions(), { wrapper: createWrapper() });

        await act(async () => {
            void result.current.approvePost('post-1');
        });

        await waitFor(() => {
            expect(result.current.isApproving).toBe(true);
        });
    });
});
