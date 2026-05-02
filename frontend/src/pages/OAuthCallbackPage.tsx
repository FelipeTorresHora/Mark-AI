import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { showSuccess, showError } from '../lib/toast';

interface OAuthCallbackPageProps {
    platform: 'x' | 'linkedin';
}

export function OAuthCallbackPage({ platform }: OAuthCallbackPageProps) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();

    useEffect(() => {
        const connected = searchParams.get('connected');
        const error = searchParams.get('error');

        if (connected) {
            const label = connected.toUpperCase() === 'X' ? 'X (Twitter)' : 'LinkedIn';
            showSuccess(`${label} conectado com sucesso!`);
            queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
        }

        if (error) {
            showError(`Erro ao conectar ${platform.toUpperCase()}: ${error}`);
        }

        navigate('/empresa', { replace: true });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
            <Loader2 className="animate-spin text-primary-500" size={36} />
        </div>
    );
}
