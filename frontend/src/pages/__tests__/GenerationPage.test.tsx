import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GenerationPage } from '../GenerationPage';
import { useSSE } from '../../hooks/useSSE';

vi.mock('../../hooks/useSSE', () => ({
    useSSE: vi.fn(),
}));

vi.mock('../../store/useAppStore', () => ({
    useAppStore: (selector: (state: { accessToken: string }) => string) => selector({ accessToken: 'token-123' }),
}));

vi.mock('../../lib/api', () => ({
    api: { defaults: { baseURL: 'http://api.test' } },
}));

describe('GenerationPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders aggregated progress by platform', () => {
        vi.mocked(useSSE).mockReturnValue({
            events: [
                {
                    event: 'writer_done',
                    platform: 'X',
                    data: { post_id: '1', content: 'Post X', variant_index: 2, platform_total: 4 },
                },
            ],
            platformStatus: { X: 'writing', LINKEDIN: 'done' },
            platformProgress: {
                X: { total: 4, started: 3, done: 2, errors: 0 },
                LINKEDIN: { total: 2, started: 2, done: 2, errors: 0 },
            },
            isConnected: true,
            isComplete: false,
            error: null,
        });

        render(
            <MemoryRouter initialEntries={['/campanhas/camp-1/gerando']}>
                <Routes>
                    <Route path="/campanhas/:campaignId/gerando" element={<GenerationPage />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.getByText('2/4 concluídos')).toBeTruthy();
        expect(screen.getByText('2/2 concluídos')).toBeTruthy();
        expect(screen.getByText('[X 2/4] Post gerado com sucesso ✓')).toBeTruthy();
    });
});
