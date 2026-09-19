import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useGoals, useUpdateGoalsAudience } from '../useGoals';

vi.mock('../../lib/api', () => ({
    api: {
        get: vi.fn(),
        patch: vi.fn(),
    },
}));

const wrapper =
    (client: QueryClient) =>
    ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

describe('useGoals', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fetches goals payload', async () => {
        const { api } = await import('../../lib/api');
        vi.mocked(api.get).mockResolvedValue({
            data: { audience: 'mei_loja_liberal', goals: [], completed_count: 0, total_count: 0 },
        });
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const { result } = renderHook(() => useGoals(), { wrapper: wrapper(client) });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.audience).toBe('mei_loja_liberal');
    });

    it('updates audience via mutation', async () => {
        const { api } = await import('../../lib/api');
        const payload = {
            audience: 'faceless',
            goals: [],
            completed_count: 0,
            total_count: 0,
            primary_objective: null,
        };
        vi.mocked(api.patch).mockResolvedValue({ data: payload });
        const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
        const { result } = renderHook(() => useUpdateGoalsAudience(), { wrapper: wrapper(client) });
        result.current.mutate('faceless');
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(client.getQueryData(['goals'])).toEqual(payload);
    });
});
