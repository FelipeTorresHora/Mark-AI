import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { accessToken, isAuthLoading } = useAppStore();

    if (isAuthLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50" role="status" aria-live="polite">
                <Loader2 className="animate-spin text-primary-500" size={36} />
                <span className="sr-only">Carregando autenticação...</span>
            </div>
        );
    }

    if (!accessToken) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
