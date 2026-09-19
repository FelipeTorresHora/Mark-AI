import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { showSuccess, showError } from '../lib/toast';
import { consumeOAuthReturnPath, isOnboardingComplete } from '../lib/onboarding';
import { useAppStore } from '../store/useAppStore';

interface OAuthCallbackPageProps {
    platform: 'x' | 'linkedin' | 'instagram';
}

const CONNECTED_LABELS: Record<string, string> = {
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    instagram: 'Instagram',
};

export function OAuthCallbackPage({ platform }: OAuthCallbackPageProps) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const isAuthLoading = useAppStore((s) => s.isAuthLoading);
    const userId = useAppStore((s) => s.user?.id);

    useEffect(() => {
        if (isAuthLoading) return;

        const connected = searchParams.get('connected');
        const error = searchParams.get('error');

        if (connected) {
            const label = CONNECTED_LABELS[connected.toLowerCase()] ?? connected;
            showSuccess(`${label} conectado com sucesso!`);
            queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
        }

        if (error) {
            showError(`Erro ao conectar ${platform.toUpperCase()}: ${error}`);
        }

        const oauthReturn = consumeOAuthReturnPath();
        const destination =
            oauthReturn ??
            (userId && !isOnboardingComplete(userId) ? '/onboarding?step=accounts' : '/empresa');

        navigate(destination, { replace: true });
    }, [isAuthLoading, userId, navigate, platform, queryClient, searchParams]);

    return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
            <Loader2 className="animate-spin text-primary-500" size={36} />
        </div>
    );
}
