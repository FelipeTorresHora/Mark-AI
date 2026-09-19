/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, Outlet, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';
import { queryClient } from './lib/queryClient';
import { useAppStore } from './store/useAppStore';
import { bootstrapAuthSession, isPublicAppPath } from './lib/authBootstrap';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const GenerationPage = lazy(() => import('./pages/GenerationPage').then((m) => ({ default: m.GenerationPage })));
const ReviewPage = lazy(() => import('./pages/ReviewPage').then((m) => ({ default: m.ReviewPage })));
const PostsPage = lazy(() => import('./pages/PostsPage').then((m) => ({ default: m.PostsPage })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage').then((m) => ({ default: m.TemplatesPage })));
const CmoPage = lazy(() => import('./pages/CmoPage').then((m) => ({ default: m.CmoPage })));
const CompanyPage = lazy(() => import('./pages/CompanyPage').then((m) => ({ default: m.CompanyPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const OAuthCallbackPage = lazy(() =>
    import('./pages/OAuthCallbackPage').then((m) => ({ default: m.OAuthCallbackPage })),
);
const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));

function PageLoader() {
    return (
        <div className="flex items-center justify-center min-h-[40vh]" role="status" aria-live="polite">
            <Loader2 className="animate-spin text-primary-500" size={32} />
            <span className="sr-only">Carregando página...</span>
        </div>
    );
}

function LazyPage({ children }: { children: React.ReactNode }) {
    return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

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
    { path: '/campanhas', element: <LazyPage><DashboardPage /></LazyPage> },
    { path: '/cmo', element: <LazyPage><CmoPage /></LazyPage> },
    { path: '/empresa', element: <LazyPage><CompanyPage /></LazyPage> },
    { path: '/configuracoes', element: <Navigate to="/empresa" replace /> },
    { path: '/campanhas/:campaignId/gerando', element: <LazyPage><GenerationPage /></LazyPage> },
    { path: '/campanhas/:campaignId', element: <LazyPage><ReviewPage /></LazyPage> },
    { path: '/posts', element: <LazyPage><PostsPage /></LazyPage> },
    { path: '/calendario', element: <LazyPage><CalendarPage /></LazyPage> },
    { path: '/templates', element: <LazyPage><TemplatesPage /></LazyPage> },
];

export const router = createBrowserRouter([
    // Landing page pública
    { path: '/', element: <LazyPage><LandingPage /></LazyPage> },

    // Rotas públicas
    { path: '/login', element: <LazyPage><LoginPage /></LazyPage> },
    { path: '/register', element: <LazyPage><RegisterPage /></LazyPage> },
    {
        path: '/oauth/callback/x',
        element: <LazyPage><OAuthCallbackPage platform="x" /></LazyPage>,
    },
    {
        path: '/oauth/callback/linkedin',
        element: <LazyPage><OAuthCallbackPage platform="linkedin" /></LazyPage>,
    },

    // Rotas protegidas (ProtectedLayout como wrapper pathless)
    {
        element: <ProtectedLayout />,
        children: protectedRoutes,
    },

    // Catch-all → redireciona para campanhas
    { path: '*', element: <Navigate to="/campanhas" replace /> },
]);

/** Wrapper da aplicação: theme, QueryClient, Toaster, session bootstrap. */
export function AppProvider({ children }: { children: React.ReactNode }) {
    const theme = useAppStore((s) => s.theme);

    useEffect(() => {
        const path = window.location.pathname;
        if (isPublicAppPath(path)) {
            // Do not block public pages on a refresh call that may hang (cold API, wrong origin).
            useAppStore.getState().finishAuthBootstrap();
            void bootstrapAuthSession();
            return;
        }
        void bootstrapAuthSession();
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <Toaster position="top-right" richColors theme={theme === 'dark' ? 'dark' : 'light'} />
            {children}
        </QueryClientProvider>
    );
}
