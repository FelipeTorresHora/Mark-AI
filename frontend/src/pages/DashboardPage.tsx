import { useEffect, useState, type MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCampaigns, useDeleteCampaign } from '../hooks/useCampaigns';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Pagination } from '../components/common/Pagination';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { Plus, FileText, CheckCircle, Clock, AlertCircle, Zap, Trash2 } from 'lucide-react';
import { cn, isNotFoundError } from '../lib/utils';
import type { PostsPerPlatform } from '../types';

interface BrandProfile {
    name: string;
    niche: string;
    tone: string;
    target_audience: string;
    unique_value: string;
}

const STATUS_CONFIG = {
    PENDING: { label: 'Pendente', color: 'app-chip app-chip-neutral', icon: Clock },
    GENERATING: { label: 'Gerando...', color: 'app-chip app-chip-info', icon: Clock },
    DONE: { label: 'Concluída', color: 'app-chip app-chip-success', icon: CheckCircle },
    FAILED: { label: 'Erro', color: 'app-chip app-chip-danger', icon: AlertCircle },
};

const DEFAULT_POSTS_PER_PLATFORM: PostsPerPlatform = {
    X: 2,
    LINKEDIN: 2,
};

function clampPostCount(value: number) {
    return Math.min(4, Math.max(1, value));
}

export function DashboardPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [page, setPage] = useState(0);
    const [topic, setTopic] = useState<string>(
        (location.state as { topic?: string } | null)?.topic ?? '',
    );
    const [postsPerPlatform, setPostsPerPlatform] = useState<PostsPerPlatform>({ ...DEFAULT_POSTS_PER_PLATFORM });
    const [isComposerOpen, setIsComposerOpen] = useState<boolean>(
        !!(location.state as { topic?: string } | null)?.topic,
    );
    const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);
    const CAMPAIGNS_PER_PAGE = 10;

    const { data, isLoading } = useCampaigns(page, CAMPAIGNS_PER_PAGE);
    const deleteCampaignMutation = useDeleteCampaign();
    const campaigns = data?.items ?? [];
    const total = data?.total ?? 0;
    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['brand-profile'],
        queryFn: async (): Promise<BrandProfile> => {
            const res = await api.get('/api/v1/brand-profile');
            return res.data;
        },
        retry: (failureCount, err) => !isNotFoundError(err) && failureCount < 2,
    });

    useEffect(() => {
        const nextState = location.state as { topic?: string } | null;
        if (!nextState?.topic) return;
        setTopic(nextState.topic);
        setIsComposerOpen(true);
    }, [location.state]);

    const generateMutation = useMutation({
        mutationFn: async () => {
            if (!profile) throw new Error('Perfil de marca não configurado');
            const res = await api.post('/api/v1/generate', {
                topic,
                brand_context: {
                    name: profile.name,
                    niche: profile.niche,
                    tone: profile.tone,
                    target_audience: profile.target_audience,
                    unique_value: profile.unique_value,
                },
                posts_per_platform: postsPerPlatform,
            });
            return res.data;
        },
        onSuccess: (response) => {
            setIsComposerOpen(false);
            setTopic('');
            setPostsPerPlatform({ ...DEFAULT_POSTS_PER_PLATFORM });
            navigate(`/campanhas/${response.campaign_id}/gerando`);
        },
        onError: () => toast.error('Erro ao iniciar geração. Tente novamente.'),
    });

    const hasValidPostCounts = Object.values(postsPerPlatform).every(count => count >= 1 && count <= 4);
    const totalRequestedPosts = postsPerPlatform.X + postsPerPlatform.LINKEDIN;
    const canGenerate = topic.trim().length >= 20 && !!profile && hasValidPostCounts;

    function updatePostCount(platform: keyof PostsPerPlatform, value: string) {
        setPostsPerPlatform((current) => ({
            ...current,
            [platform]: clampPostCount(Number(value) || 1),
        }));
    }

    function handleDeleteCampaign(
        event: MouseEvent<HTMLButtonElement>,
        campaignId: string,
        campaignTopic: string,
    ) {
        event.stopPropagation();
        const confirmed = window.confirm(
            `Excluir a campanha "${campaignTopic}" e todos os posts gerados?`,
        );
        if (!confirmed) return;

        setDeletingCampaignId(campaignId);
        deleteCampaignMutation.mutate(campaignId, {
            onSuccess: () => toast.success('Campanha excluída com sucesso.'),
            onError: () => toast.error('Erro ao excluir campanha. Tente novamente.'),
            onSettled: () => setDeletingCampaignId(null),
        });
    }

    return (
        <div className="max-w-5xl mx-auto py-8 w-full">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold app-text tracking-tight">Campanhas</h1>
                    <p className="app-text-muted mt-1">Histórico de conteúdo gerado para sua marca</p>
                </div>
                <Button
                    variant="primary"
                    onClick={() => setIsComposerOpen((current) => !current)}
                    className="flex items-center gap-2 px-6"
                >
                    <Plus size={18} /> Nova Campanha
                </Button>
            </div>

            {isComposerOpen && (
                <Card className="p-6 mb-6">
                    <div className="flex items-start justify-between gap-4 mb-5">
                        <div>
                            <h2 className="text-2xl font-extrabold app-text">Nova Campanha</h2>
                            <p className="app-text-muted mt-1">
                                Descreva a pauta e escolha quantas variações gerar por rede.
                            </p>
                        </div>
                        <Button variant="outline" onClick={() => setIsComposerOpen(false)}>
                            Fechar
                        </Button>
                    </div>

                    {!profileLoading && !profile && (
                        <Card className="flex items-start gap-3 p-5 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 mb-6 rounded-[24px]">
                            <AlertCircle size={20} className="text-amber-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold text-amber-800 dark:text-amber-300">Perfil da marca não configurado</p>
                                <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                                    Configure sua marca em{' '}
                                    <button onClick={() => navigate('/empresa')} className="underline font-medium">
                                        Empresa
                                    </button>{' '}
                                    antes de gerar conteúdo.
                                </p>
                            </div>
                        </Card>
                    )}

                    {!profileLoading && profile && (
                        <Card className="p-4 app-panel-subtle mb-6 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-sm shrink-0">
                                {profile.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="text-sm">
                                <span className="font-semibold app-text-secondary">{profile.name}</span>
                                <span className="app-text-soft mx-1">·</span>
                                <span className="app-text-muted">{profile.tone}</span>
                                <span className="app-text-soft mx-1">·</span>
                                <span className="app-text-muted">{profile.niche}</span>
                            </div>
                            <button onClick={() => navigate('/empresa')} className="ml-auto text-xs text-primary-600 dark:text-primary-400 hover:underline">
                                Editar
                            </button>
                        </Card>
                    )}

                    <label htmlFor="campaign-topic" className="block text-sm font-semibold app-text-secondary mb-3">
                        Descreva a pauta desta campanha
                    </label>
                    <textarea
                        id="campaign-topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        rows={5}
                        className="app-input resize-none text-sm"
                        placeholder="Ex: Lançamento do nosso novo produto de automação para pequenas empresas. Foco nos benefícios de economia de tempo e redução de erros operacionais..."
                        disabled={generateMutation.isPending}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                        <div>
                            <label htmlFor="posts-x" className="block text-sm font-semibold app-text-secondary mb-2">
                                Variações para X
                            </label>
                            <input
                                id="posts-x"
                                type="number"
                                min={1}
                                max={4}
                                value={postsPerPlatform.X}
                                onChange={(e) => updatePostCount('X', e.target.value)}
                                className="app-input"
                                disabled={generateMutation.isPending}
                            />
                        </div>
                        <div>
                            <label htmlFor="posts-linkedin" className="block text-sm font-semibold app-text-secondary mb-2">
                                Variações para LinkedIn
                            </label>
                            <input
                                id="posts-linkedin"
                                type="number"
                                min={1}
                                max={4}
                                value={postsPerPlatform.LINKEDIN}
                                onChange={(e) => updatePostCount('LINKEDIN', e.target.value)}
                                className="app-input"
                                disabled={generateMutation.isPending}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                        <span className={`text-xs ${topic.length < 20 ? 'app-text-soft' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {topic.length}/20 mín. · {totalRequestedPosts} posts nesta campanha
                        </span>
                        <Button
                            variant="primary"
                            onClick={() => generateMutation.mutate()}
                            disabled={!canGenerate || generateMutation.isPending}
                            className="flex items-center gap-2 px-8"
                        >
                            {generateMutation.isPending ? 'Iniciando...' : (
                                <><Zap size={16} /> Gerar Posts</>
                            )}
                        </Button>
                    </div>
                </Card>
            )}

            {isLoading && (
                <div className="grid grid-cols-1 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 app-panel-subtle rounded-[24px] animate-pulse" />
                    ))}
                </div>
            )}

            {!isLoading && (!campaigns || campaigns.length === 0) && (
                <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed app-divider-strong app-panel-subtle">
                    <FileText size={48} className="app-text-soft mb-4" />
                    <h2 className="text-xl font-semibold app-text-secondary mb-2">Nenhuma campanha ainda</h2>
                    <p className="app-text-soft mb-6">Crie sua primeira campanha e gere posts com IA em segundos.</p>
                    <Button variant="primary" onClick={() => setIsComposerOpen(true)} className="flex items-center gap-2">
                        <Plus size={16} /> Criar primeira campanha
                    </Button>
                </Card>
            )}

            {!isLoading && campaigns && campaigns.length > 0 && (
                <div className="space-y-3">
                    {campaigns.map(campaign => {
                        const cfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.PENDING;
                        const StatusIcon = cfg.icon;
                        const isDeleting = deleteCampaignMutation.isPending && deletingCampaignId === campaign.id;

                        return (
                            <Card
                                key={campaign.id}
                                className="flex items-center justify-between p-5 cursor-pointer hover:-translate-y-0.5 hover:border-primary-200 dark:hover:border-primary-700/40"
                                onClick={() => navigate(`/campanhas/${campaign.id}`)}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold app-text truncate">{campaign.topic}</p>
                                    <p className="text-sm app-text-soft mt-0.5">
                                        {new Date(campaign.created_at).toLocaleDateString('pt-BR', {
                                            day: '2-digit', month: 'short', year: 'numeric',
                                        })}
                                        {' · '}{campaign.post_count} post{campaign.post_count !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 ml-4">
                                    <div className={cn('flex items-center', cfg.color)}>
                                        <StatusIcon size={12} />
                                        {cfg.label}
                                    </div>
                                    <button
                                        type="button"
                                        aria-label={`Excluir campanha ${campaign.topic}`}
                                        onClick={(event) => handleDeleteCampaign(event, campaign.id, campaign.topic)}
                                        disabled={isDeleting}
                                        className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Pagination page={page} total={total} limit={CAMPAIGNS_PER_PAGE} onPageChange={setPage} />
        </div>
    );
}
