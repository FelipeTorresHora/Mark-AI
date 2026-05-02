import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useSocialAccounts, useDisconnectSocial, useStartSocialConnect } from '../../hooks/useSocialAccounts';
import { useDisconnectX, useStartXConnect, useXIntegrationStatus } from '../../hooks/useXIntegration';
import { Button } from '../common/Button';
import { BrandContextSchema, type BrandContextFormData } from '../../lib/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Settings, CheckCircle2, Pencil, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from '../../lib/toast';
import { isNotFoundError } from '../../lib/utils';
import type { SocialAccount } from '../../types';

interface BrandProfile {
    name: string;
    niche: string;
    tone: string;
    target_audience: string;
    unique_value: string;
}

function SocialAccountsCompact() {
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

    return (
        <div className="space-y-2">
            {platforms.map(({ id, label }) => {
                const connected = isConnected(id);
                return (
                    <div key={id} className="flex items-center justify-between px-3 py-2 rounded-lg app-panel-subtle">
                        <div className="flex items-center gap-2">
                            {connected ? (
                                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                            ) : (
                                <div className="w-3.5 h-3.5 rounded-full border app-divider-strong shrink-0" />
                            )}
                            <span className="text-xs font-medium app-text-secondary">{label}</span>
                        </div>
                        {connected ? (
                            <button
                                onClick={() => id === 'X' ? disconnectX.mutate() : disconnect.mutate(id)}
                                disabled={disconnect.isPending || disconnectX.isPending}
                                className="text-[10px] text-rose-500 hover:text-rose-700 font-medium transition-colors"
                            >
                                Desconectar
                            </button>
                        ) : (
                            <button
                                onClick={() => handleConnect(id)}
                                disabled={startConnect.isPending || startXConnect.isPending}
                                className="text-[10px] text-primary-500 hover:text-primary-700 font-medium transition-colors"
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

function BrandProfileCard({ profile }: { profile: BrandProfile | null }) {
    const [editOpen, setEditOpen] = useState(false);
    const queryClient = useQueryClient();

    const { register, handleSubmit, reset, formState: { errors } } = useForm<BrandContextFormData>({
        resolver: zodResolver(BrandContextSchema),
        defaultValues: {
            name: profile?.name || '',
            niche: profile?.niche || '',
            tone: (profile?.tone as BrandContextFormData['tone']) || 'Profissional',
            targetAudience: profile?.target_audience || '',
            uniqueValue: profile?.unique_value || '',
        },
    });

    const saveMutation = useMutation({
        mutationFn: async (data: BrandContextFormData) => {
            await api.put('/api/v1/brand-profile', {
                name: data.name,
                niche: data.niche,
                tone: data.tone,
                target_audience: data.targetAudience,
                unique_value: data.uniqueValue,
            });
        },
        onSuccess: () => {
            toast.success('Perfil da marca atualizado!');
            queryClient.invalidateQueries({ queryKey: ['brand-profile'] });
            setEditOpen(false);
        },
        onError: () => toast.error('Erro ao atualizar perfil.'),
    });

    if (!profile) {
        return (
            <div className="text-center py-6">
                <Settings size={24} className="app-text-soft mx-auto mb-2" />
                <p className="text-xs app-text-soft">Nenhum perfil configurado.</p>
                <p className="text-xs app-text-soft">Converse com o CMO IA para criar.</p>
            </div>
        );
    }

    if (editOpen) {
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold app-text-muted uppercase tracking-wider">Editando</h4>
                    <button onClick={() => setEditOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-600" aria-label="Fechar edição">
                        <X size={14} />
                    </button>
                </div>
                <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-2">
                    <div>
                        <input {...register('name')} className="app-input text-xs px-2 py-1.5" placeholder="Nome" />
                        {errors.name && <p className="text-[10px] text-rose-500">{errors.name.message}</p>}
                    </div>
                    <div>
                        <input {...register('niche')} className="app-input text-xs px-2 py-1.5" placeholder="Nicho" />
                        {errors.niche && <p className="text-[10px] text-rose-500">{errors.niche.message}</p>}
                    </div>
                    <select {...register('tone')} className="app-input text-xs px-2 py-1.5">
                        <option value="Profissional">Profissional</option>
                        <option value="Autêntico">Autêntico</option>
                        <option value="Descolado">Descolado</option>
                        <option value="Inspirador">Inspirador</option>
                    </select>
                    <textarea {...register('targetAudience')} rows={2} className="app-input text-xs px-2 py-1.5 resize-none" placeholder="Público-alvo" />
                    <textarea {...register('uniqueValue')} rows={2} className="app-input text-xs px-2 py-1.5 resize-none" placeholder="Proposta de valor" />
                    <Button type="submit" variant="primary" className="w-full text-xs py-1.5" disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold app-text-muted uppercase tracking-wider">Perfil</h4>
                <button
                    onClick={() => { reset({
                        name: profile.name,
                        niche: profile.niche,
                        tone: (profile.tone as BrandContextFormData['tone']),
                        targetAudience: profile.target_audience,
                        uniqueValue: profile.unique_value,
                    }); setEditOpen(true); }}
                    className="p-1 rounded text-slate-400 hover:text-primary-500 transition-colors"
                    aria-label="Editar perfil"
                >
                    <Pencil size={12} />
                </button>
            </div>
            <dl className="space-y-1.5">
                {[
                    ['Nome', profile.name],
                    ['Nicho', profile.niche],
                    ['Tom', profile.tone],
                    ['Público', profile.target_audience?.slice(0, 40) + (profile.target_audience?.length > 40 ? '...' : '')],
                ].map(([label, value]) => (
                    <div key={label}>
                        <dt className="text-[10px] app-text-soft uppercase">{label}</dt>
                        <dd className="text-xs app-text-secondary font-medium">{value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { data: profile, isLoading } = useQuery({
        queryKey: ['brand-profile'],
        queryFn: async (): Promise<BrandProfile | null> => {
            try {
                const res = await api.get('/api/v1/brand-profile');
                return res.data;
            } catch (err: unknown) {
                if (isNotFoundError(err)) return null;
                throw err;
            }
        },
        retry: false,
    });

    return (
        <>
            {/* Mobile overlay */}
            {open && (
                <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose} />
            )}

            {/* Panel — fixed on mobile, inline on desktop */}
            <aside
                className={cn(
                    'app-panel border-l app-divider transition-all duration-300 shrink-0 overflow-y-auto',
                    // Mobile: fixed slide-in overlay
                    'fixed right-0 top-0 h-full z-40 w-72',
                    open ? 'translate-x-0' : 'translate-x-full',
                    // Desktop: inline panel with width/opacity animation
                    'lg:relative lg:translate-x-0 lg:z-auto lg:h-full',
                    open ? 'lg:w-72 lg:opacity-100' : 'lg:w-0 lg:opacity-0 lg:overflow-hidden',
                )}
            >
                <div className="flex flex-col h-full min-w-72">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b app-divider shrink-0">
                        <h3 className="text-sm font-bold app-text">Configurações</h3>
                        <button
                            onClick={onClose}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            aria-label="Fechar painel"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                        {isLoading ? (
                            <div className="space-y-2">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-4 app-panel-subtle rounded animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <BrandProfileCard profile={profile ?? null} />
                        )}

                        <div className="pt-4 border-t app-divider">
                            <h4 className="text-xs font-semibold app-text-muted uppercase tracking-wider mb-3">Contas Sociais</h4>
                            <SocialAccountsCompact />
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
