import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePosts } from '../usePosts';
import * as apiModule from '../../lib/api';

vi.mock('../../lib/api', () => ({
    api: { get: vi.fn() },
}));

const mockApi = apiModule.api as unknown as { get: ReturnType<typeof vi.fn> };

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
}

describe('usePosts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fetches posts without filters', async () => {
        const mockPosts = {
            items: [
                { id: '1', platform: 'X', content: 'Post 1', status: 'APPROVED', created_at: '', updated_at: '' },
                { id: '2', platform: 'LINKEDIN', content: 'Post 2', status: 'FINAL', created_at: '', updated_at: '' },
            ],
            total: 2,
            skip: 0,
            limit: 20,
        };
        mockApi.get.mockResolvedValueOnce({ data: mockPosts });

        const { result } = renderHook(() => usePosts(), { wrapper: createWrapper() });

        await waitFor(() => {
            expect(result.current.data).toEqual(mockPosts);
        });
        expect(mockApi.get).toHaveBeenCalledWith('/api/v1/posts?skip=0&limit=20');
    });

    it('fetches posts with status filter', async () => {
        const mockPosts = {
            items: [
                { id: '1', platform: 'X', content: 'Post 1', status: 'APPROVED', created_at: '', updated_at: '' },
            ],
            total: 1,
            skip: 0,
            limit: 20,
        };
        mockApi.get.mockResolvedValueOnce({ data: mockPosts });

        const { result } = renderHook(() => usePosts('APPROVED'), { wrapper: createWrapper() });

        await waitFor(() => {
            expect(result.current.data).toEqual(mockPosts);
        });
        expect(mockApi.get).toHaveBeenCalledWith('/api/v1/posts?status=APPROVED&skip=0&limit=20');
    });

    it('fetches posts with campaign filter', async () => {
        const mockPosts = {
            items: [
                { id: '1', platform: 'X', content: 'Post 1', status: 'APPROVED', campaign_id: 'camp-1', created_at: '', updated_at: '' },
            ],
            total: 1,
            skip: 0,
            limit: 20,
        };
        mockApi.get.mockResolvedValueOnce({ data: mockPosts });

        const { result } = renderHook(() => usePosts(undefined, 'camp-1'), { wrapper: createWrapper() });

        await waitFor(() => {
            expect(result.current.data).toEqual(mockPosts);
        });
        expect(mockApi.get).toHaveBeenCalledWith('/api/v1/posts?campaign_id=camp-1&skip=0&limit=20');
    });
});
