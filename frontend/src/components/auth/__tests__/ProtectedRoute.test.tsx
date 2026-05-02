import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAppStore } from '../../../store/useAppStore';

describe('ProtectedRoute', () => {
    it('redirects to login when not authenticated', () => {
        useAppStore.getState().clearAuth();

        render(
            <MemoryRouter initialEntries={['/protected']}>
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            </MemoryRouter>,
        );

        expect(screen.queryByText('Protected Content')).toBeNull();
    });

    it('renders children when authenticated', () => {
        useAppStore.getState().setAuth({ id: '1', email: 'test@test.com' }, 'token');

        render(
            <MemoryRouter initialEntries={['/protected']}>
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            </MemoryRouter>,
        );

        expect(screen.getByText('Protected Content')).toBeTruthy();
    });

    it('shows loading spinner during auth check', () => {
        useAppStore.getState().clearAuth();
        // Manually set loading state
        useAppStore.setState({ isAuthLoading: true, accessToken: null });

        render(
            <MemoryRouter initialEntries={['/protected']}>
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            </MemoryRouter>,
        );

        // Spinner should be visible
        expect(document.querySelector('.animate-spin')).toBeTruthy();
    });
});
