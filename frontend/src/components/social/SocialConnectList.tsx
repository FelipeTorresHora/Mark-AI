import { CheckCircle2 } from 'lucide-react';
import { useSocialAccounts, useDisconnectSocial, useStartSocialConnect } from '../../hooks/useSocialAccounts';
import { useDisconnectX, useStartXConnect, useXIntegrationStatus } from '../../hooks/useXIntegration';
import { toast } from '../../lib/toast';
import type { SocialAccount } from '../../types';
import { cn } from '../../lib/utils';

interface SocialConnectListProps {
    className?: string;
    variant?: 'compact' | 'onboarding';
    onBeforeConnect?: () => void;
}

export function SocialConnectList({ className, variant = 'compact', onBeforeConnect }: SocialConnectListProps) {
    const { data: accounts = [] } = useSocialAccounts();
    const { data: xStatus } = useXIntegrationStatus();
    const disconnect = useDisconnectSocial();
    const startConnect = useStartSocialConnect();
    const disconnectX = useDisconnectX();
    const startXConnect = useStartXConnect();

    const isConnected = (platform: string) => {
        if (platform === 'X') return !!xStatus?.connected;
        return accounts.some((a: SocialAccount) => a.platform === platform);
    };

    const handleConnect = async (platform: string) => {
        try {
            onBeforeConnect?.();
            if (platform === 'X') {
                const { authorization_url } = await startXConnect.mutateAsync();
                window.location.assign(authorization_url);
                return;
            }
            const { authorization_url } = await startConnect.mutateAsync(platform);
            window.location.assign(authorization_url);
        } catch {
            toast.error('Erro ao iniciar conexão.');
        }
    };

    const platforms = [
        { id: 'X', label: 'X (Twitter)' },
        { id: 'LINKEDIN', label: 'LinkedIn' },
    ];

    const rowClass =
        variant === 'onboarding'
            ? 'flex items-center justify-between px-5 py-4 rounded-[24px] app-panel border app-divider'
            : 'flex items-center justify-between px-3 py-2 rounded-lg app-panel-subtle';

    return (
        <div className={cn('space-y-3', className)}>
            {platforms.map(({ id, label }) => {
                const connected = isConnected(id);
                return (
                    <div key={id} className={rowClass}>
                        <div className="flex items-center gap-3">
                            {connected ? (
                                <CheckCircle2 size={variant === 'onboarding' ? 20 : 14} className="text-emerald-500 shrink-0" />
                            ) : (
                                <div
                                    className={cn(
                                        'rounded-full border app-divider-strong shrink-0',
                                        variant === 'onboarding' ? 'w-5 h-5' : 'w-3.5 h-3.5',
                                    )}
                                />
                            )}
                            <span
                                className={cn(
                                    'font-medium app-text-secondary',
                                    variant === 'onboarding' ? 'text-sm font-semibold' : 'text-xs',
                                )}
                            >
                                {label}
                            </span>
                        </div>
                        {connected ? (
                            <button
                                type="button"
                                onClick={() => (id === 'X' ? disconnectX.mutate() : disconnect.mutate(id))}
                                disabled={disconnect.isPending || disconnectX.isPending}
                                className="text-xs text-rose-500 hover:text-rose-700 font-semibold transition-colors"
                            >
                                Desconectar
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => handleConnect(id)}
                                disabled={startConnect.isPending || startXConnect.isPending}
                                className="py-2 px-4 bg-primary-400 hover:scale-105 active:scale-95 text-primary-900 font-semibold rounded-full text-xs transition-all duration-150"
                            >
                                Conectar
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export function useHasConnectedSocialAccount(): boolean {
    const { data: accounts = [] } = useSocialAccounts();
    const { data: xStatus } = useXIntegrationStatus();
    return !!xStatus?.connected || accounts.length > 0;
}
