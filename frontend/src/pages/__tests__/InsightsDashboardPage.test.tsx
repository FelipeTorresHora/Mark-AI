import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InsightsDashboardPage } from '../InsightsDashboardPage';
import * as apiModule from '../../lib/api';

vi.mock('../../lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

const mockApi = apiModule.api as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
};

const insightsPayload = {
    summary: {
        total_posts: 2,
        impressions: 1500,
        reach: 700,
        engagements: 120,
        clicks: 31,
        likes: 60,
        comments: 15,
        shares: 10,
        quotes: 3,
        bookmarks: 1,
        profile_clicks: 9,
        engagement_rate: 0.08,
    },
    by_platform: {
        X: {
            total_posts: 1,
            impressions: 1000,
            reach: 0,
            engagements: 90,
            clicks: 25,
            likes: 40,
            comments: 10,
            shares: 8,
            quotes: 3,
            bookmarks: 1,
            profile_clicks: 7,
            engagement_rate: 0.09,
        },
        LINKEDIN: {
            total_posts: 1,
            impressions: 500,
            reach: 700,
            engagements: 30,
            clicks: 6,
            likes: 20,
            comments: 5,
            shares: 2,
            quotes: 0,
            bookmarks: 0,
            profile_clicks: 2,
            engagement_rate: 0.06,
        },
    },
    top_posts: [
        {
            post_id: 'post-1',
            platform: 'X',
            platform_post_id: 'tweet-1',
            content: 'Post com melhor performance',
            published_at: '2026-04-20T12:00:00Z',
            captured_at: '2026-04-28T12:00:00Z',
            impressions: 1000,
            reach: 0,
            engagements: 90,
            clicks: 25,
            likes: 40,
            comments: 10,
            shares: 8,
            quotes: 3,
            bookmarks: 1,
            profile_clicks: 7,
            engagement_rate: 0.09,
        },
    ],
    recent_posts: [],
    last_sync_at: '2026-04-28T12:00:00Z',
    sync_warnings: ['Reconecte LinkedIn com permissão de analytics.'],
};

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
}

describe('InsightsDashboardPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders insight KPIs and top posts', async () => {
        mockApi.get.mockResolvedValue({ data: insightsPayload });

        render(<InsightsDashboardPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Dashboard')).toBeTruthy();
            expect(screen.getByText('1.500')).toBeTruthy();
            expect(screen.getByText('120')).toBeTruthy();
            expect(screen.getByText('8,0%')).toBeTruthy();
            expect(screen.getByText('Post com melhor performance')).toBeTruthy();
        });
    });

    it('shows empty state when there are no published post insights', async () => {
        mockApi.get.mockResolvedValue({
            data: {
                ...insightsPayload,
                summary: { ...insightsPayload.summary, total_posts: 0, impressions: 0, engagements: 0, clicks: 0, engagement_rate: 0 },
                top_posts: [],
                recent_posts: [],
                last_sync_at: null,
                sync_warnings: [],
            },
        });

        render(<InsightsDashboardPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Nenhum insight sincronizado ainda')).toBeTruthy();
        });
    });

    it('syncs insights and refreshes dashboard data', async () => {
        mockApi.get.mockResolvedValue({ data: insightsPayload });
        mockApi.post.mockResolvedValue({
            data: {
                scanned_posts: 2,
                updated_posts: 2,
                skipped_posts: 0,
                failed_posts: 0,
                warnings: [],
            },
        });

        render(<InsightsDashboardPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Dashboard')).toBeTruthy();
        });
        fireEvent.click(screen.getByText('Atualizar métricas'));

        await waitFor(() => {
            expect(mockApi.post).toHaveBeenCalledWith('/api/v1/dashboard/insights/sync');
        });
    });

    it('sends filters as query params', async () => {
        mockApi.get.mockResolvedValue({ data: insightsPayload });

        render(<InsightsDashboardPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(mockApi.get).toHaveBeenCalledWith('/api/v1/dashboard/insights?range_days=30&platform=ALL');
        });
        fireEvent.change(screen.getByLabelText('Período'), { target: { value: '7' } });
        fireEvent.change(screen.getByLabelText('Plataforma'), { target: { value: 'X' } });

        await waitFor(() => {
            expect(mockApi.get).toHaveBeenCalledWith('/api/v1/dashboard/insights?range_days=7&platform=X');
        });
    });
});
