import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import * as apiModule from '../../lib/api';

vi.mock('../../lib/api', () => ({
    api: { post: vi.fn(), get: vi.fn(), defaults: { baseURL: 'http://test' } },
}));

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

describe('LoginPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders login form', () => {
        render(<LoginPage />, { wrapper: createWrapper() });
        expect(screen.getByLabelText(/e-mail/i)).toBeTruthy();
        expect(screen.getByLabelText(/senha/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /entrar/i })).toBeTruthy();
    });

    it('shows validation error for invalid email', async () => {
        render(<LoginPage />, { wrapper: createWrapper() });
        const emailInput = screen.getByLabelText(/e-mail/i);
        fireEvent.change(emailInput, { target: { value: 'invalid' } });
        fireEvent.blur(emailInput);
        expect(emailInput).toBeInvalid();
    });

    it('shows error toast on failed login', async () => {
        const mockApi = apiModule.api as unknown as { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
        mockApi.post.mockRejectedValueOnce(new Error('Unauthorized'));
        const { showError } = await import('../../lib/toast');

        render(<LoginPage />, { wrapper: createWrapper() });
        fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'test@test.com' } });
        fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'wrongpass' } });
        fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

        await vi.waitFor(() => {
            expect(showError).toHaveBeenCalledWith('E-mail ou senha incorretos');
        });
    });
});
