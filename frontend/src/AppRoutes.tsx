/* eslint-disable react-refresh/only-export-components */
import { useEffect } from 'react';
import { createBrowserRouter, Outlet, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import { useAppStore } from './store/useAppStore';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { GenerationPage } from './pages/GenerationPage';
import { ReviewPage } from './pages/ReviewPage';
import { PostsPage } from './pages/PostsPage';
import { CalendarPage } from './pages/CalendarPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { CmoPage } from './pages/CmoPage';
import { CompanyPage } from './pages/CompanyPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { LandingPage } from './pages/LandingPage';

/** Layout protegido: autenticação + sidebar. */
function ProtectedLayout() {
    return (
        <ProtectedRoute>
            <MainLayout>
                <Outlet />
            </MainLayout>
        </ProtectedRoute>
    );
}

/** Rotas com layout protegido (pathless — só wrapper). */
const protectedRoutes = [
    { path: '/campanhas', element: <DashboardPage /> },
    { path: '/cmo', element: <CmoPage /> },
    { path: '/empresa', element: <CompanyPage /> },
    { path: '/configuracoes', element: <Navigate to="/empresa" replace /> },
    { path: '/campanhas/:campaignId/gerando', element: <GenerationPage /> },
    { path: '/campanhas/:campaignId', element: <ReviewPage /> },
    { path: '/posts', element: <PostsPage /> },
    { path: '/calendario', element: <CalendarPage /> },
    { path: '/templates', element: <TemplatesPage /> },
];

export const router = createBrowserRouter([
    // Landing page pública
    { path: '/', element: <LandingPage /> },

    // Rotas públicas
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> },
    { path: '/oauth/callback/x', element: <OAuthCallbackPage platform="x" /> },
    { path: '/oauth/callback/linkedin', element: <OAuthCallbackPage platform="linkedin" /> },

    // Rotas protegidas (ProtectedLayout como wrapper pathless)
    {
        element: <ProtectedLayout />,
        children: protectedRoutes,
    },

    // Catch-all → redireciona para campanhas
    { path: '*', element: <Navigate to="/campanhas" replace /> },
]);

/** Wrapper da aplicação: theme, QueryClient, Toaster, silentRefresh. */
export function AppProvider({ children }: { children: React.ReactNode }) {
    const theme = useAppStore((s) => s.theme);

    // Restore session from HttpOnly cookie on every page load
    useEffect(() => {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        import('axios').then(({ default: axios }) => {
            axios
                .post(`${baseUrl}/api/v1/auth/refresh`, {}, { withCredentials: true })
                .then((res) => {
                    const token: string = res.data.access_token;
                    return axios
                        .get(`${baseUrl}/api/v1/auth/me`, {
                            headers: { Authorization: `Bearer ${token}` },
                        })
                        .then((meRes) => {
                            useAppStore.getState().setAuth(
                                { id: meRes.data.id, email: meRes.data.email },
                                token,
                            );
                        });
                })
                .catch(() => {
                    useAppStore.getState().clearAuth();
                });
        });
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <Toaster position="top-right" richColors theme={theme === 'dark' ? 'dark' : 'light'} />
            {children}
        </QueryClientProvider>
    );
}
