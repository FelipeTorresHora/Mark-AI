import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CompanyPage } from '../CompanyPage';

vi.mock('../../hooks/useSocialAccounts', () => ({
    useSocialAccounts: () => ({ data: [], isLoading: false }),
    useDisconnectSocial: () => ({ mutate: vi.fn(), isPending: false }),
    useStartSocialConnect: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../../lib/api', () => ({
    api: {
        get: vi.fn(() => Promise.reject({ response: { status: 404 } })),
        put: vi.fn(),
    },
}));

vi.mock('../../lib/utils', async () => {
    const actual = await vi.importActual<typeof import('../../lib/utils')>('../../lib/utils');
    return {
        ...actual,
        isNotFoundError: () => true,
    };
});

function renderPage() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        <QueryClientProvider client={client}>
            <CompanyPage />
        </QueryClientProvider>,
    );
}

describe('CompanyPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('lists Instagram among social accounts to connect for publishing', async () => {
        renderPage();
        expect(await screen.findByText('Instagram')).toBeTruthy();
        expect(screen.getByText(/Business ou Creator/i)).toBeTruthy();
        expect(screen.getAllByText('Conectar').length).toBeGreaterThanOrEqual(3);
    });
});
