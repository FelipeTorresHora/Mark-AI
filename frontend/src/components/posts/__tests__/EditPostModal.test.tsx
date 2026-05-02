import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { EditPostModal } from '../EditPostModal';

vi.mock('../../../lib/toast', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
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

describe('EditPostModal', () => {
    const mockPost = {
        id: 'post-1',
        platform: 'X' as const,
        content: 'Original content',
        status: 'UNDER_REVIEW' as const,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does not render when post is null', () => {
        render(<EditPostModal post={null} onClose={vi.fn()} />, { wrapper: createWrapper() });
        expect(screen.queryByText('Editar Post')).toBeNull();
    });

    it('renders modal with post content', () => {
        render(<EditPostModal post={mockPost} onClose={vi.fn()} />, { wrapper: createWrapper() });
        expect(screen.getByText('Editar Post')).toBeTruthy();
        expect(screen.getByDisplayValue('Original content')).toBeTruthy();
    });

    it('calls onClose when cancel is clicked', () => {
        const onClose = vi.fn();
        render(<EditPostModal post={mockPost} onClose={onClose} />, { wrapper: createWrapper() });
        fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
        expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn();
        render(<EditPostModal post={mockPost} onClose={onClose} />, { wrapper: createWrapper() });
        fireEvent.click(screen.getByRole('button', { name: /fechar modal/i }));
        expect(onClose).toHaveBeenCalled();
    });

    it('shows character count for X platform', () => {
        render(<EditPostModal post={mockPost} onClose={vi.fn()} />, { wrapper: createWrapper() });
        expect(screen.getAllByText('16/280')).toHaveLength(2);
    });
});
