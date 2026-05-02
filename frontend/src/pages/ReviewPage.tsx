import { useState, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePosts } from '../hooks/usePosts';
import { type Platform, type Post } from '../types';
import { usePostActions } from '../hooks/usePostActions';
import { useCampaign } from '../hooks/useCampaigns';
import { usePublishPost } from '../hooks/useSocialAccounts';
import { useEditPost } from '../hooks/useEditPost';
import { XPreview } from '../components/previews/XPreview';
import { LinkedInPreview } from '../components/previews/LinkedInPreview';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { cn, formatScheduledAt } from '../lib/utils';
import { showError, showSuccess } from '../lib/toast';
import { CheckCircle, XCircle, ArrowLeft, MessageSquare, Pencil, Calendar, Send, Globe, Clock, Save } from 'lucide-react';

function toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ScoreBadge({ score }: { score?: number }) {
    if (score === undefined || score === null) return null;
    const color = score >= 80 ? 'app-chip-success' : score >= 60 ? 'app-chip-warning' : 'app-chip-danger';
    return (
        <span className={cn('app-chip', color)}>
            Score {score}/100
        </span>
    );
}

interface PostCardProps {
    post: Post;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onPublish: (id: string) => void;
    onEditContent: (id: string, content: string) => void;
    onEditSchedule: (id: string, scheduledAt: string | null) => void;
    isApproving: boolean;
    isRejecting: boolean;
    isPublishing: boolean;
    isEditing: boolean;
}

const PostCard = memo(function PostCard({
    post, onApprove, onReject, onPublish, onEditContent, onEditSchedule,
    isApproving, isRejecting, isPublishing, isEditing,
}: PostCardProps) {
    const isFinal = post.status === 'FINAL';
    const isRejectedStatus = post.status === 'REJECTED';
    const isPublished = post.status === 'PUBLISHED';
    const isPending = !isFinal && !isRejectedStatus && !isPublished;
    const canAct = !isRejectedStatus && !isPublished;

    const [isEditMode, setIsEditMode] = useState(false);
    const [editContent, setEditContent] = useState(post.content ?? '');
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [scheduledAt, setScheduledAt] = useState(post.scheduled_at ? toDatetimeLocal(post.scheduled_at) : '');

    async function handleSaveEdit() {
        onEditContent(post.id, editContent);
        setIsEditMode(false);
    }

    async function handleSaveSchedule() {
        onEditSchedule(post.id, scheduledAt ? new Date(scheduledAt).toISOString() : null);
        setScheduleOpen(false);
    }

    const isX = post.platform === 'X';
    const isOverLimit = isX && editContent.length > 280;

    return (
        <div className={cn('rounded-[28px] border p-6 transition-all', {
            'app-panel-subtle border-emerald-300 dark:border-emerald-800/60': isFinal,
            'app-panel border-rose-200 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-900/10 opacity-60': isRejectedStatus,
            'app-panel border-blue-300 dark:border-blue-900 bg-blue-50/20 dark:bg-blue-900/10': isPublished,
            'app-panel': isPending,
        })}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold app-text-secondary">
                        {isX ? 'Twitter / X' : 'LinkedIn'}
                    </span>
                    <ScoreBadge score={post.score} />
                    {isFinal && <span className="app-chip app-chip-success"><CheckCircle size={10} /> Aprovado</span>}
                    {isRejectedStatus && <span className="app-chip app-chip-danger"><XCircle size={10} /> Rejeitado</span>}
                    {isPublished && <span className="app-chip app-chip-info"><Globe size={10} /> Publicado</span>}
                    {post.scheduled_at && (
                        <span className="app-chip text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800">
                            <Calendar size={10} />
                            {formatScheduledAt(post.scheduled_at)}
                        </span>
                    )}
                </div>
            </div>

            {post.feedback && (
                <div className="flex items-start gap-2 app-chip-info rounded-[18px] p-3 mb-4 text-sm">
                    <MessageSquare size={14} className="shrink-0 mt-0.5 text-blue-500" />
                    <p><span className="font-semibold">Feedback IA:</span> {post.feedback}</p>
                </div>
            )}

            <div className="mb-5">
                {isX ? (
                    <XPreview
                        content={isEditMode ? editContent : (post.content || '')}
                        editable={isEditMode}
                        onContentChange={setEditContent}
                    />
                ) : (
                    <LinkedInPreview
                        content={isEditMode ? editContent : (post.content || '')}
                        editable={isEditMode}
                        onContentChange={setEditContent}
                    />
                )}
            </div>

            {/* Schedule panel */}
            {scheduleOpen && isPending && (
                <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-xl px-3 py-2 mb-4">
                    <Clock size={14} className="text-violet-500 shrink-0" />
                    <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={e => setScheduledAt(e.target.value)}
                        className="flex-1 bg-transparent text-sm app-text-secondary focus:outline-none"
                    />
                    <button
                        onClick={handleSaveSchedule}
                        disabled={isEditing}
                        className="flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-400 hover:text-violet-900 disabled:opacity-50 transition-colors px-2 py-1 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/40"
                    >
                        <Save size={13} /> {isEditing ? 'Salvando...' : 'Confirmar'}
                    </button>
                </div>
            )}

            {canAct && (
                <div className="flex gap-3 justify-end flex-wrap">
                    {isEditMode ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setIsEditMode(false)}
                                disabled={isEditing}
                                className="flex items-center gap-2"
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSaveEdit}
                                disabled={isEditing || !editContent.trim() || isOverLimit}
                                className="flex items-center gap-2"
                            >
                                <Save size={16} /> {isEditing ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </>
                    ) : (
                        <>
                            {isPending && (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => setScheduleOpen(v => !v)}
                                        onMouseDown={() => setScheduledAt(post.scheduled_at ? toDatetimeLocal(post.scheduled_at) : '')}
                                        disabled={isApproving || isRejecting || isPublishing}
                                        className={cn(
                                            'flex items-center gap-2',
                                            scheduleOpen
                                                ? 'text-violet-700 border-violet-300 bg-violet-50'
                                                : 'app-text-secondary border-[rgba(14,15,12,0.16)] dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        )}
                                    >
                                        <Calendar size={16} /> Agendar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setEditContent(post.content ?? '');
                                            setIsEditMode(true);
                                        }}
                                        disabled={isApproving || isRejecting || isPublishing}
                                        className="flex items-center gap-2 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                                    >
                                        <Pencil size={16} /> Editar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => onReject(post.id)}
                                        disabled={isRejecting || isApproving || isPublishing}
                                        className="flex items-center gap-2 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                    >
                                        <XCircle size={16} /> Rejeitar
                                    </Button>
                                </>
                            )}
                            {post.status === 'FINAL' && (
                                <Button
                                    variant="outline"
                                    onClick={() => onPublish(post.id)}
                                    disabled={isPublishing || isApproving || isRejecting}
                                        className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/30"
                                    >
                                    <Send size={16} /> {isPublishing ? 'Publicando...' : 'Publicar'}
                                </Button>
                            )}
                            {post.status !== 'FINAL' && (
                                <Button
                                    variant="primary"
                                    onClick={() => onApprove(post.id)}
                                    disabled={isApproving || isRejecting}
                                    className="flex items-center gap-2"
                                >
                                    <CheckCircle size={16} /> {isApproving ? 'Aprovando...' : 'Aprovar'}
                                </Button>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
});

export const ReviewPage = () => {
    const { campaignId } = useParams<{ campaignId: string }>();
    const navigate = useNavigate();

    const { data: postData, isLoading } = usePosts(undefined, campaignId);
    const posts = postData?.items;
    const { data: campaign } = useCampaign(campaignId!);
    const { approvePost, rejectPost, isApproving, isRejecting } = usePostActions();
    const publishPostMutation = usePublishPost();
    const { editPost, isEditing } = useEditPost();

    const handleApprove = useCallback((id: string) => { approvePost(id); }, [approvePost]);
    const handleReject = useCallback((id: string) => { rejectPost(id); }, [rejectPost]);
    const handlePublish = useCallback((id: string) => {
        publishPostMutation.mutate(id, {
            onSuccess: () => showSuccess('Post publicado com sucesso!'),
            onError: (err: unknown) => {
                const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Erro ao publicar post';
                showError(msg);
            },
        });
    }, [publishPostMutation]);
    const handleEditContent = useCallback((id: string, content: string) => {
        editPost({ id, content });
    }, [editPost]);
    const handleEditSchedule = useCallback((id: string, scheduledAt: string | null) => {
        editPost({ id, scheduled_at: scheduledAt });
    }, [editPost]);

    const approvedCount = posts?.filter(p => p.status === 'FINAL').length ?? 0;
    const total = posts?.length ?? 0;
    const groupedPosts: Array<{ platform: Platform; title: string; items: Post[] }> = [
        {
            platform: 'X',
            title: 'Variantes para Twitter / X',
            items: [...(posts?.filter(post => post.platform === 'X') ?? [])]
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        },
        {
            platform: 'LINKEDIN',
            title: 'Variantes para LinkedIn',
            items: [...(posts?.filter(post => post.platform === 'LINKEDIN') ?? [])]
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        },
    ];

    return (
        <div className="max-w-4xl mx-auto py-8 w-full">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <button
                        onClick={() => navigate('/campanhas')}
                        className="flex items-center gap-2 app-text-muted hover:text-slate-700 dark:hover:text-slate-200 text-sm mb-3"
                    >
                        <ArrowLeft size={14} /> Voltar às campanhas
                    </button>
                    <h1 className="text-2xl font-extrabold app-text">Revisão de Posts</h1>
                    {campaign && (
                        <p className="app-text-muted mt-1 text-sm line-clamp-2 max-w-xl">{campaign.topic}</p>
                    )}
                </div>
                <Card className="px-5 py-3 text-center shrink-0">
                    <p className="text-2xl font-extrabold app-text">{approvedCount}/{total}</p>
                    <p className="text-xs app-text-soft">aprovados</p>
                </Card>
            </div>

            {isLoading && (
                <div className="space-y-4">
                    {[1, 2].map(i => <div key={i} className="h-64 app-panel-subtle rounded-[28px] animate-pulse" />)}
                </div>
            )}

            {!isLoading && posts && posts.length === 0 && (
                <Card className="flex flex-col items-center py-16 text-center app-panel-subtle border-dashed app-divider-strong">
                    <p className="app-text-soft">Nenhum post encontrado para esta campanha.</p>
                </Card>
            )}

            {!isLoading && posts && posts.length > 0 && (
                <div className="space-y-6">
                    {groupedPosts
                        .filter(group => group.items.length > 0)
                        .map(group => (
                            <section key={group.platform} className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold app-text">
                                        {group.title}
                                    </h2>
                                    <span className="text-sm app-text-muted">
                                        {group.items.length} post{group.items.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="space-y-6">
                                    {group.items.map(post => (
                                        <PostCard
                                            key={post.id}
                                            post={post}
                                            onApprove={handleApprove}
                                            onReject={handleReject}
                                            onPublish={handlePublish}
                                            onEditContent={handleEditContent}
                                            onEditSchedule={handleEditSchedule}
                                            isApproving={isApproving}
                                            isRejecting={isRejecting}
                                            isPublishing={publishPostMutation.isPending}
                                            isEditing={isEditing}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))}
                </div>
            )}

        </div>
    );
}
