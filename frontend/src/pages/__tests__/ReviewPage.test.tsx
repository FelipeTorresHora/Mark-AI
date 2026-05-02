import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReviewPage } from '../ReviewPage';

vi.mock('../../hooks/usePosts', () => ({
    usePosts: vi.fn(),
}));

vi.mock('../../hooks/useCampaigns', () => ({
    useCampaign: vi.fn(),
}));

vi.mock('../../hooks/usePostActions', () => ({
    usePostActions: () => ({
        approvePost: vi.fn(),
        rejectPost: vi.fn(),
        isApproving: false,
        isRejecting: false,
    }),
}));

vi.mock('../../hooks/useSocialAccounts', () => ({
    usePublishPost: () => ({
        mutate: vi.fn(),
        isPending: false,
    }),
}));

vi.mock('../../hooks/useEditPost', () => ({
    useEditPost: () => ({
        editPost: vi.fn(),
        isEditing: false,
    }),
}));

vi.mock('../../components/previews/XPreview', () => ({
    XPreview: ({ content }: { content: string }) => <div>{content}</div>,
}));

vi.mock('../../components/previews/LinkedInPreview', () => ({
    LinkedInPreview: ({ content }: { content: string }) => <div>{content}</div>,
}));

import { usePosts } from '../../hooks/usePosts';
import { useCampaign } from '../../hooks/useCampaigns';

describe('ReviewPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('groups posts by platform', () => {
        vi.mocked(useCampaign).mockReturnValue({
            data: { id: 'camp-1', topic: 'Campanha', brand_context: {}, status: 'DONE', created_at: '', updated_at: '' },
        } as never);
        vi.mocked(usePosts).mockReturnValue({
            data: {
                items: [
                    { id: '1', platform: 'LINKEDIN', content: 'LinkedIn 1', status: 'APPROVED', created_at: '2025-01-02T00:00:00Z', updated_at: '2025-01-02T00:00:00Z' },
                    { id: '2', platform: 'X', content: 'X 1', status: 'APPROVED', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
                    { id: '3', platform: 'X', content: 'X 2', status: 'FINAL', created_at: '2025-01-03T00:00:00Z', updated_at: '2025-01-03T00:00:00Z' },
                ],
            },
            isLoading: false,
        } as never);

        render(
            <MemoryRouter initialEntries={['/campanhas/camp-1']}>
                <Routes>
                    <Route path="/campanhas/:campaignId" element={<ReviewPage />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.getByText('Variantes para Twitter / X')).toBeTruthy();
        expect(screen.getByText('Variantes para LinkedIn')).toBeTruthy();
        expect(screen.getByText('X 1')).toBeTruthy();
        expect(screen.getByText('LinkedIn 1')).toBeTruthy();
    });
});
