import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ObjectivePage } from '../ObjectivePage';
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
    api: { get: vi.fn(), post: vi.fn() },
}));

const mockApi = apiModule.api as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
};

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>{children}</MemoryRouter>
            </QueryClientProvider>
        );
    };
}

describe('ObjectivePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockApi.get.mockResolvedValue({
            data: {
                name: 'Acme',
                niche: 'Marketing digital',
                tone: 'Profissional',
                target_audience: 'MEIs e pequenos negócios',
                unique_value: 'Conteúdo rápido com IA alinhada à marca',
            },
        });
    });

    it('renders objective form and submits generate request', async () => {
        mockApi.post.mockResolvedValueOnce({
            data: { campaign_id: 'camp-1', post_ids: ['1', '2'] },
        });

        render(<ObjectivePage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Qual é o seu objetivo?')).toBeTruthy();
        });

        fireEvent.change(screen.getByLabelText('Objetivo desta rodada'), {
            target: {
                value: 'Quero mais agendamentos na clínica com posts locais e acolhedores.',
            },
        });
        fireEvent.click(screen.getByText('Gerar conteúdo'));

        await waitFor(() => {
            expect(mockApi.post).toHaveBeenCalledWith(
                '/api/v1/generate',
                expect.objectContaining({
                    topic: 'Quero mais agendamentos na clínica com posts locais e acolhedores.',
                }),
            );
            expect(navigateMock).toHaveBeenCalledWith('/campanhas/camp-1/gerando');
        });
    });
});
