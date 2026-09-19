import { useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCampaigns, useDeleteCampaign } from '../hooks/useCampaigns';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Pagination } from '../components/common/Pagination';
import { toast } from '../lib/toast';
import { Plus, FileText, CheckCircle, Clock, AlertCircle, Trash2, Target } from 'lucide-react';
import { GoalsWidget } from '../components/dashboard/GoalsWidget';
import { cn } from '../lib/utils';

const STATUS_CONFIG = {
    PENDING: { label: 'Pendente', color: 'app-chip app-chip-neutral', icon: Clock },
    GENERATING: { label: 'Gerando...', color: 'app-chip app-chip-info', icon: Clock },
    AWAITING_REVIEW: { label: 'Em revisão', color: 'app-chip app-chip-warning', icon: Clock },
    DONE: { label: 'Concluída', color: 'app-chip app-chip-success', icon: CheckCircle },
    FAILED: { label: 'Erro', color: 'app-chip app-chip-danger', icon: AlertCircle },
};

export function DashboardPage() {
    const navigate = useNavigate();
    const [page, setPage] = useState(0);
    const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);
    const CAMPAIGNS_PER_PAGE = 10;

    const { data, isLoading } = useCampaigns(page, CAMPAIGNS_PER_PAGE);
    const deleteCampaignMutation = useDeleteCampaign();
    const campaigns = data?.items ?? [];
    const total = data?.total ?? 0;

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
            <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-extrabold app-text tracking-tight">Campanhas</h1>
                    <p className="app-text-muted mt-1">Histórico de conteúdo gerado para sua marca</p>
                </div>
                <Button
                    variant="primary"
                    onClick={() => navigate('/objetivo')}
                    className="flex items-center gap-2 px-6"
                >
                    <Target size={18} aria-hidden /> Nova rodada (Objetivo)
                </Button>
            </div>

            <GoalsWidget />

            {isLoading && (
                <div className="grid grid-cols-1 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 app-panel-subtle rounded-[24px] animate-pulse" />
                    ))}
                </div>
            )}

            {!isLoading && (!campaigns || campaigns.length === 0) && (
                <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed app-divider-strong app-panel-subtle rounded-[32px]">
                    <FileText size={48} className="app-text-soft mb-4" />
                    <h2 className="text-xl font-semibold app-text-secondary mb-2">Nenhuma campanha ainda</h2>
                    <p className="app-text-soft mb-6 max-w-md">
                        Use Objetivo para descrever esta rodada — a IA gera posts e você aprova ou refaz com instruções.
                    </p>
                    <Button
                        variant="primary"
                        onClick={() => navigate('/objetivo')}
                        className="flex items-center gap-2"
                    >
                        <Plus size={16} aria-hidden /> Criar primeira campanha
                    </Button>
                </Card>
            )}

            {!isLoading && campaigns && campaigns.length > 0 && (
                <div className="space-y-3">
                    {campaigns.map((campaign) => {
                        const cfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.PENDING;
                        const StatusIcon = cfg.icon;
                        const isDeleting =
                            deleteCampaignMutation.isPending && deletingCampaignId === campaign.id;

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
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                        {' · '}
                                        {campaign.post_count} post{campaign.post_count !== 1 ? 's' : ''}
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
                                        onClick={(event) =>
                                            handleDeleteCampaign(event, campaign.id, campaign.topic)
                                        }
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
