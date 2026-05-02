import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { PostsPage } from '../PostsPage';

vi.mock('../../hooks/usePosts', () => ({
    usePosts: vi.fn(),
}));

vi.mock('../../hooks/usePostActions', () => ({
    usePostActions: () => ({
        approvePost: vi.fn(),
        rejectPost: vi.fn(),
        isApproving: false,
        isRejecting: false,
    }),
}));

vi.mock('../../components/posts/EditPostModal', () => ({
    EditPostModal: ({ post, initialMode }: { post: { id: string } | null; initialMode?: string }) => (
        <div data-testid="edit-post-modal">
            {post ? `${post.id}:${initialMode}` : 'closed'}
        </div>
    ),
}));

import { usePosts } from '../../hooks/usePosts';

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

describe('PostsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('hides rejected posts from the global posts page', () => {
        vi.mocked(usePosts).mockReturnValue({
            data: {
                items: [
                    { id: 'post-1', platform: 'X', content: 'Aprovado', status: 'FINAL', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
                    { id: 'post-2', platform: 'X', content: 'Rejeitado', status: 'REJECTED', created_at: '2025-01-02T00:00:00Z', updated_at: '2025-01-02T00:00:00Z' },
                ],
                total: 2,
                skip: 0,
                limit: 20,
            },
            isLoading: false,
        } as never);

        render(<PostsPage />, { wrapper: createWrapper() });

        expect(screen.getByText('1 post')).toBeTruthy();
        expect(screen.queryByText('Rejeitado')).toBeNull();
    });

    it('shows actions menu for final posts and opens schedule mode', () => {
        vi.mocked(usePosts).mockReturnValue({
            data: {
                items: [
                    { id: 'post-1', platform: 'X', content: 'Post final', status: 'FINAL', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
                ],
                total: 1,
                skip: 0,
                limit: 20,
            },
            isLoading: false,
        } as never);

        render(<PostsPage />, { wrapper: createWrapper() });

        fireEvent.click(screen.getByRole('button', { name: /abrir menu do post/i }));
        fireEvent.click(screen.getByRole('button', { name: 'Agendar' }));

        expect(screen.getByTestId('edit-post-modal')).toHaveTextContent('post-1:schedule');
        expect(screen.queryByLabelText(/status final/i)).toBeNull();
    });
});
