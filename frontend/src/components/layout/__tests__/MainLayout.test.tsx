import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MainLayout } from '../MainLayout';

describe('MainLayout', () => {
    it('renders layout and children', () => {
        render(
            <MemoryRouter>
                <MainLayout><div>Conteúdo da Página</div></MainLayout>
            </MemoryRouter>
        );
        expect(screen.getByText('Conteúdo da Página')).toBeTruthy();
        expect(screen.getByText('MarkAI')).toBeTruthy();
    });
});
