import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle2, Pencil, Sparkles, Target, Users, X } from 'lucide-react';
import { api } from '../lib/api';
import { isNotFoundError } from '../lib/utils';
import { toast } from '../lib/toast';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { BrandContextSchema, type BrandContextFormData } from '../lib/schemas';
import { useDisconnectSocial, useSocialAccounts, useStartSocialConnect } from '../hooks/useSocialAccounts';
import type { SocialAccount } from '../types';

interface BrandProfile {
    name: string;
    niche: string;
    tone: string;
    target_audience: string;
    unique_value: string;
}

function SocialAccountsSection() {
    const { data: accounts = [], isLoading } = useSocialAccounts();
    const disconnect = useDisconnectSocial();
    const startConnect = useStartSocialConnect();

    const isConnected = (platform: string) =>
        accounts.some((account: SocialAccount) => account.platform === platform);

    const handleConnect = async (platform: string) => {
        try {
            const { authorization_url } = await startConnect.mutateAsync(platform);
            window.location.assign(authorization_url);
        } catch {
            toast.error('Erro ao iniciar conexão.');
        }
    };

    const platforms = [
        {
            id: 'X',
            label: 'X (Twitter)',
            description: 'Publique posts aprovados diretamente no X.',
        },
        {
            id: 'LINKEDIN',
            label: 'LinkedIn',
            description: 'Distribua seus posts finais no LinkedIn sem sair da plataforma.',
        },
    ];

    return (
        <Card>
            <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold app-text">Contas sociais</h2>
                    <p className="text-sm app-text-muted mt-1">
                        Conecte os canais em que seus posts poderão ser publicados.
                    </p>
                </div>
                <span className="app-chip app-chip-neutral">
                    {accounts.length} conectada{accounts.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div className="space-y-3">
                {platforms.map(({ id, label, description }) => {
                    const connected = isConnected(id);

                    return (
                        <div
                            key={id}
                            className="flex items-center justify-between gap-4 rounded-2xl app-panel-subtle px-4 py-4"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    {connected ? (
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border app-divider-strong shrink-0" />
                                    )}
                                    <p className="font-semibold app-text-secondary">{label}</p>
                                </div>
                                <p className="text-sm app-text-muted mt-1">{description}</p>
                            </div>

                            {connected ? (
                                <Button
                                    variant="outline"
                                    onClick={() => disconnect.mutate(id)}
                                    disabled={disconnect.isPending}
                                    className="shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                >
                                    Desconectar
                                </Button>
                            ) : (
                                <Button
                                    variant="secondary"
                                    onClick={() => handleConnect(id)}
                                    disabled={startConnect.isPending || isLoading}
                                    className="shrink-0"
                                >
                                    Conectar
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}

export function CompanyPage() {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);

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

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<BrandContextFormData>({
        resolver: zodResolver(BrandContextSchema),
        defaultValues: {
            name: '',
            niche: '',
            tone: 'Profissional',
            targetAudience: '',
            uniqueValue: '',
        },
    });

    useEffect(() => {
        if (!profile) return;
        reset({
            name: profile.name,
            niche: profile.niche,
            tone: profile.tone as BrandContextFormData['tone'],
            targetAudience: profile.target_audience,
            uniqueValue: profile.unique_value,
        });
    }, [profile, reset]);

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
            toast.success('Dados da empresa atualizados!');
            queryClient.invalidateQueries({ queryKey: ['brand-profile'] });
            setIsEditing(false);
        },
        onError: () => {
            toast.error('Erro ao atualizar dados da empresa.');
        },
    });

    const openEditor = () => {
        reset({
            name: profile?.name ?? '',
            niche: profile?.niche ?? '',
            tone: (profile?.tone as BrandContextFormData['tone']) ?? 'Profissional',
            targetAudience: profile?.target_audience ?? '',
            uniqueValue: profile?.unique_value ?? '',
        });
        setIsEditing(true);
    };

    return (
        <div className="w-full max-w-5xl mx-auto py-8 space-y-6">
            <Card className="overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-semibold mb-4">
                            <Building2 size={14} />
                            Base da geração de posts
                        </div>
                        <h1 className="text-3xl font-extrabold app-text">Empresa</h1>
                        <p className="app-text-muted mt-2 max-w-2xl">
                            Preencha os dados da sua empresa para orientar o CMO IA e servir de base na criação dos posts.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                        <div className="rounded-2xl app-panel-subtle px-4 py-3">
                            <div className="flex items-center gap-2 app-text-secondary font-semibold text-sm">
                                <Target size={15} />
                                Posicionamento
                            </div>
                            <p className="text-xs app-text-muted mt-1">Nicho e proposta de valor</p>
                        </div>
                        <div className="rounded-2xl app-panel-subtle px-4 py-3">
                            <div className="flex items-center gap-2 app-text-secondary font-semibold text-sm">
                                <Users size={15} />
                                Público
                            </div>
                            <p className="text-xs app-text-muted mt-1">Quem a marca quer atingir</p>
                        </div>
                        <div className="rounded-2xl app-panel-subtle px-4 py-3">
                            <div className="flex items-center gap-2 app-text-secondary font-semibold text-sm">
                                <Sparkles size={15} />
                                Tom
                            </div>
                            <p className="text-xs app-text-muted mt-1">Como a marca se comunica</p>
                        </div>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold app-text">Dados da empresa</h2>
                        <p className="text-sm app-text-muted mt-1">
                            Essas informações são usadas como contexto base sempre que novos posts forem gerados.
                        </p>
                    </div>

                    {!isLoading && profile && !isEditing && (
                        <Button variant="outline" onClick={openEditor} className="flex items-center gap-2 shrink-0">
                            <Pencil size={16} />
                            Editar
                        </Button>
                    )}
                </div>

                {isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((item) => (
                            <div key={item} className="h-24 rounded-2xl app-panel-subtle animate-pulse" />
                        ))}
                    </div>
                )}

                {!isLoading && !profile && !isEditing && (
                    <div className="rounded-3xl border border-dashed app-divider-strong app-panel-subtle p-8 text-center">
                        <Building2 size={36} className="mx-auto app-text-soft mb-4" />
                        <h3 className="text-xl font-bold app-text-secondary">Nenhum perfil configurado ainda</h3>
                        <p className="app-text-muted mt-2 max-w-xl mx-auto">
                            Cadastre os dados da sua empresa para que o CMO IA entenda sua marca e gere posts alinhados ao seu posicionamento.
                        </p>
                        <Button variant="primary" onClick={openEditor} className="mt-6">
                            Configurar empresa
                        </Button>
                    </div>
                )}

                {!isLoading && profile && !isEditing && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-2xl app-panel-subtle px-5 py-4">
                            <p className="text-xs uppercase tracking-[0.18em] app-text-soft">Nome</p>
                            <p className="text-lg font-semibold app-text mt-2">{profile.name}</p>
                        </div>
                        <div className="rounded-2xl app-panel-subtle px-5 py-4">
                            <p className="text-xs uppercase tracking-[0.18em] app-text-soft">Nicho</p>
                            <p className="text-lg font-semibold app-text mt-2">{profile.niche}</p>
                        </div>
                        <div className="rounded-2xl app-panel-subtle px-5 py-4">
                            <p className="text-xs uppercase tracking-[0.18em] app-text-soft">Tom de voz</p>
                            <p className="text-lg font-semibold app-text mt-2">{profile.tone}</p>
                        </div>
                        <div className="rounded-2xl app-panel-subtle px-5 py-4">
                            <p className="text-xs uppercase tracking-[0.18em] app-text-soft">Público-alvo</p>
                            <p className="text-sm leading-6 app-text-secondary mt-2">{profile.target_audience}</p>
                        </div>
                        <div className="rounded-2xl app-panel-subtle px-5 py-4 md:col-span-2">
                            <p className="text-xs uppercase tracking-[0.18em] app-text-soft">Proposta de valor</p>
                            <p className="text-sm leading-6 app-text-secondary mt-2">{profile.unique_value}</p>
                        </div>
                    </div>
                )}

                {isEditing && (
                    <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-5">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-lg font-bold app-text">
                                {profile ? 'Editar empresa' : 'Cadastrar empresa'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                aria-label="Fechar edição"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold app-text-secondary mb-2">Nome da empresa</label>
                                <input
                                    {...register('name')}
                                    className="app-input"
                                    placeholder="Ex: MarkAI"
                                />
                                {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold app-text-secondary mb-2">Nicho</label>
                                <input
                                    {...register('niche')}
                                    className="app-input"
                                    placeholder="Ex: Automação de marketing para PMEs"
                                />
                                {errors.niche && <p className="text-xs text-rose-500 mt-1">{errors.niche.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold app-text-secondary mb-2">Tom de voz</label>
                                <select
                                    {...register('tone')}
                                    className="app-input"
                                >
                                    <option value="Profissional">Profissional</option>
                                    <option value="Autêntico">Autêntico</option>
                                    <option value="Descolado">Descolado</option>
                                    <option value="Inspirador">Inspirador</option>
                                </select>
                                {errors.tone && <p className="text-xs text-rose-500 mt-1">{errors.tone.message}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold app-text-secondary mb-2">Público-alvo</label>
                            <textarea
                                {...register('targetAudience')}
                                rows={4}
                                className="app-input resize-none"
                                placeholder="Ex: gestores de pequenas empresas que precisam produzir conteúdo com consistência, sem montar uma equipe grande."
                            />
                            {errors.targetAudience && <p className="text-xs text-rose-500 mt-1">{errors.targetAudience.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold app-text-secondary mb-2">Proposta de valor</label>
                            <textarea
                                {...register('uniqueValue')}
                                rows={4}
                                className="app-input resize-none"
                                placeholder="Ex: Ajudamos empresas a transformar estratégia em posts prontos para publicar, com contexto da marca e automação do fluxo."
                            />
                            {errors.uniqueValue && <p className="text-xs text-rose-500 mt-1">{errors.uniqueValue.message}</p>}
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
                                {saveMutation.isPending ? 'Salvando...' : 'Salvar empresa'}
                            </Button>
                        </div>
                    </form>
                )}
            </Card>

            <SocialAccountsSection />
        </div>
    );
}
