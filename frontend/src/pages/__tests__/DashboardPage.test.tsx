import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../DashboardPage';
import * as apiModule from '../../lib/api';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => navigateMock,
    };
});

vi.mock('../../lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const mockApi = apiModule.api as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
};

function mockDashboardRequests({
    campaigns = { items: [], total: 0, skip: 0, limit: 10 },
    profile = {
        name: 'Acme',
        niche: 'Marketing',
        tone: 'Direto',
        target_audience: 'Founders',
        unique_value: 'Automacao',
    },
}: {
    campaigns?: { items: unknown[]; total: number; skip: number; limit: number };
    profile?: Record<string, string>;
}) {
    mockApi.get.mockImplementation((url: string) => {
        if (url.startsWith('/api/v1/campaigns')) {
            return Promise.resolve({ data: campaigns });
        }
        if (url === '/api/v1/brand-profile') {
            return Promise.resolve({ data: profile });
        }
        return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
}

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    {children}
                </MemoryRouter>
            </QueryClientProvider>
        );
    };
}

describe('DashboardPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows loading state initially', () => {
        mockApi.get.mockReturnValue(new Promise(() => {}));
        render(<DashboardPage />, { wrapper: createWrapper() });
        expect(screen.getByText('Campanhas')).toBeTruthy();
    });

    it('shows empty state when no campaigns', async () => {
        mockDashboardRequests({});
        render(<DashboardPage />, { wrapper: createWrapper() });
        await waitFor(() => {
            expect(screen.getByText('Nenhuma campanha ainda')).toBeTruthy();
        });
    });

    it('renders campaigns list', async () => {
        mockDashboardRequests({
            campaigns: {
                items: [
                    { id: '1', topic: 'Campanha de verão', status: 'DONE', post_count: 2, created_at: '2025-01-01T00:00:00Z' },
                    { id: '2', topic: 'Lançamento produto', status: 'GENERATING', post_count: 1, created_at: '2025-02-15T00:00:00Z' },
                ],
                total: 2,
                skip: 0,
                limit: 10,
            },
        });

        render(<DashboardPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Campanha de verão')).toBeTruthy();
            expect(screen.getByText('Lançamento produto')).toBeTruthy();
        });
    });

    it('navigates to objective flow for new campaign', async () => {
        mockDashboardRequests({});
        render(<DashboardPage />, { wrapper: createWrapper() });

        fireEvent.click(screen.getByText('Definir objetivo'));

        expect(navigateMock).toHaveBeenCalledWith('/objetivo');
    });

    it('deletes campaign from the list with confirmation', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        mockDashboardRequests({
            campaigns: {
                items: [
                    { id: '1', topic: 'Campanha para excluir', status: 'DONE', post_count: 2, created_at: '2025-01-01T00:00:00Z' },
                ],
                total: 1,
                skip: 0,
                limit: 10,
            },
        });
        mockApi.delete.mockResolvedValueOnce({});

        render(<DashboardPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Campanha para excluir')).toBeTruthy();
        });

        fireEvent.click(screen.getByLabelText('Excluir campanha Campanha para excluir'));

        await waitFor(() => {
            expect(confirmSpy).toHaveBeenCalled();
            expect(mockApi.delete).toHaveBeenCalledWith('/api/v1/campaigns/1');
        });
    });
});
