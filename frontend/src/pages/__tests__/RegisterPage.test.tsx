import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from '../RegisterPage';

vi.mock('../../lib/toast', () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
}));

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
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

describe('RegisterPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders registration form', () => {
        render(<RegisterPage />, { wrapper: createWrapper() });
        expect(screen.getByLabelText(/e-mail/i)).toBeTruthy();
        expect(screen.getByLabelText(/^senha$/i)).toBeTruthy();
        expect(screen.getByLabelText(/confirmar senha/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /criar conta/i })).toBeTruthy();
    });

    it('shows error when passwords do not match', async () => {
        render(<RegisterPage />, { wrapper: createWrapper() });
        fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: 'different' } });
        fireEvent.submit(screen.getByRole('button', { name: /criar conta/i }));
        await vi.waitFor(() => {
            expect(screen.getByText('As senhas não coincidem')).toBeTruthy();
        });
    });
});
