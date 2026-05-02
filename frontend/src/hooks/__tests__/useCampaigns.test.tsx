import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCampaigns, useCampaign, useDeleteCampaign } from '../useCampaigns';
import * as apiModule from '../../lib/api';

vi.mock('../../lib/api', () => ({
    api: { get: vi.fn(), delete: vi.fn() },
}));

const mockApi = apiModule.api as unknown as {
    get: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
};

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
}

describe('useCampaigns', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fetches campaigns list', async () => {
        const mockCampaigns = {
            items: [
                { id: '1', topic: 'Summer campaign', status: 'DONE', post_count: 2, created_at: '2025-01-01T00:00:00Z' },
            ],
            total: 1,
            skip: 0,
            limit: 20,
        };
        mockApi.get.mockResolvedValueOnce({ data: mockCampaigns });

        const { result } = renderHook(() => useCampaigns(), { wrapper: createWrapper() });

        await waitFor(() => {
            expect(result.current.data).toEqual(mockCampaigns);
        });
        expect(mockApi.get).toHaveBeenCalledWith('/api/v1/campaigns?skip=0&limit=20');
    });

    it('fetches campaign detail', async () => {
        const mockDetail = {
            id: '1',
            topic: 'Summer campaign',
            brand_context: { name: 'Acme', niche: 'Tech', tone: 'Professional' },
            status: 'DONE',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z',
        };
        mockApi.get.mockResolvedValueOnce({ data: mockDetail });

        const { result } = renderHook(() => useCampaign('1'), { wrapper: createWrapper() });

        await waitFor(() => {
            expect(result.current.data).toEqual(mockDetail);
        });
        expect(mockApi.get).toHaveBeenCalledWith('/api/v1/campaigns/1');
    });

    it('does not fetch when campaignId is empty', () => {
        renderHook(() => useCampaign(''), { wrapper: createWrapper() });
        expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('deletes a campaign', async () => {
        mockApi.delete.mockResolvedValueOnce({});

        const { result } = renderHook(() => useDeleteCampaign(), { wrapper: createWrapper() });
        await result.current.mutateAsync('campaign-1');

        await waitFor(() => {
            expect(mockApi.delete).toHaveBeenCalledWith('/api/v1/campaigns/campaign-1');
        });
    });
});
