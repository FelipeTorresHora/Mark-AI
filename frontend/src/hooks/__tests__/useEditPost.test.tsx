import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEditPost } from '../useEditPost';
import * as apiModule from '../../lib/api';

vi.mock('../../lib/api', () => ({
    api: { patch: vi.fn() },
}));

vi.mock('../../lib/toast', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
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

describe('useEditPost', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('edits post content', async () => {
        mockApi.patch.mockResolvedValueOnce({ data: { id: '1', content: 'New content' } });

        const { result } = renderHook(() => useEditPost(), { wrapper: createWrapper() });

        await result.current.editPost({ id: 'post-1', content: 'New content' });

        expect(mockApi.patch).toHaveBeenCalledWith('/api/v1/posts/post-1', {
            content: 'New content',
            scheduled_at: undefined,
        });
    });

    it('edits scheduled_at', async () => {
        mockApi.patch.mockResolvedValueOnce({ data: { id: '1', scheduled_at: '2025-06-01T10:00:00Z' } });

        const { result } = renderHook(() => useEditPost(), { wrapper: createWrapper() });

        await result.current.editPost({ id: 'post-1', scheduled_at: '2025-06-01T10:00:00Z' });

        expect(mockApi.patch).toHaveBeenCalledWith('/api/v1/posts/post-1', {
            content: undefined,
            scheduled_at: '2025-06-01T10:00:00Z',
        });
    });
});
