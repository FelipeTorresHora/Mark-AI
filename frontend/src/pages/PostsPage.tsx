import { useState, useRef, useCallback, useMemo } from 'react';
import { usePosts } from '../hooks/usePosts';
import { type Post } from '../types';
import { usePostActions } from '../hooks/usePostActions';
import { usePublishXPost, useScheduleXPost, useCancelXPost } from '../hooks/useXPosts';
import { useXIntegrationStatus } from '../hooks/useXIntegration';
import { EditPostModal } from '../components/posts/EditPostModal';
import { Pagination } from '../components/common/Pagination';
import { Button } from '../components/common/Button';
import { cn, formatScheduledAt } from '../lib/utils';
import { CheckCircle, XCircle, Pencil, Calendar, Twitter, Linkedin, FileText, X as XIcon, MoreHorizontal, Send, Clock } from 'lucide-react';
import type { PostStatus, Platform } from '../types';

type StatusFilter = 'ALL' | PostStatus;
type EditMode = 'edit' | 'schedule';

const STATUS_LABELS: Record<StatusFilter, string> = {
    ALL: 'Todos',
    DRAFT: 'Rascunho',
    UNDER_REVIEW: 'Em revisão',
    APPROVED: 'Aprovado',
    REJECTED: 'Rejeitado',
    FINAL: 'Final',
    PUBLISHED: 'Publicado',
};

const STATUS_COLORS: Partial<Record<PostStatus, string>> = {
    DRAFT: 'app-chip app-chip-neutral',
    UNDER_REVIEW: 'app-chip app-chip-warning',
    APPROVED: 'app-chip app-chip-info',
    FINAL: 'app-chip app-chip-success',
    PUBLISHED: 'app-chip app-chip-info',
};

const PUBLISH_STATUS_LABELS = {
    pending: 'Pendente',
    processing: 'Publicando',
    published: 'Publicado',
    failed: 'Falhou',
    canceled: 'Cancelado',
} as const;

function publishStatusClass(status: string) {
    if (status === 'published') return 'app-chip app-chip-info';
    if (status === 'failed') return 'app-chip app-chip-danger';
    if (status === 'processing') return 'app-chip app-chip-warning';
    if (status === 'canceled') return 'app-chip app-chip-neutral';
    return 'app-chip app-chip-success';
}

function PostRowCard({ post, onEdit, onApprove, onReject, onCancel, isApproving, isRejecting, isCanceling }: {
    post: Post;
    onEdit: (post: Post, mode?: EditMode) => void;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onCancel: (id: string) => void;
    isApproving: boolean;
    isRejecting: boolean;
    isCanceling: boolean;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const isPending = post.status !== 'FINAL' && post.status !== 'REJECTED' && post.status !== 'PUBLISHED';
    const canManageFinal = post.status === 'FINAL';
    const isX = post.platform === 'X';
    const publishStatus = post.publish_status ?? 'pending';

    return (
        <div className={cn(
            'flex items-center gap-4 p-4 rounded-[24px] border transition-all',
            post.status === 'FINAL' ? 'app-panel-subtle border-emerald-200 dark:border-emerald-800/60' :
            post.status === 'REJECTED' ? 'app-panel border-rose-100 dark:border-rose-900 opacity-60' :
            'app-panel hover:border-[rgba(14,15,12,0.18)] dark:hover:border-slate-600 hover:-translate-y-0.5'
        )}>
            {/* Platform icon */}
            <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                isX ? 'bg-slate-900' : 'bg-[#0a66c2]'
            )}>
                {isX
                    ? <Twitter size={16} className="text-white" />
                    : <Linkedin size={16} className="text-white" />
                }
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-sm app-text-secondary line-clamp-2">
                    {post.content || <span className="app-text-soft italic">Gerando...</span>}
                </p>
            </div>

            {/* Right cluster */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {post.score !== undefined && post.score !== null && (
                    <span className={cn(
                        'app-chip',
                        post.score >= 80 ? 'app-chip-success' :
                        post.score >= 60 ? 'app-chip-warning' :
                        'app-chip-danger'
                    )}>
                        {post.score}
                    </span>
                )}

                {post.status !== 'FINAL' && (
                    <span
                        aria-label={`status ${STATUS_LABELS[post.status] ?? post.status}`}
                        className={cn(STATUS_COLORS[post.status] ?? 'app-chip app-chip-neutral')}
                    >
                        {STATUS_LABELS[post.status] ?? post.status}
                    </span>
                )}

                {publishStatus !== 'pending' && (
                    <span className={publishStatusClass(publishStatus)}>
                        {PUBLISH_STATUS_LABELS[publishStatus] ?? publishStatus}
                    </span>
                )}

                {post.scheduled_at && (
                    <span className="app-chip text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800">
                        <Calendar size={10} />
                        {formatScheduledAt(post.scheduled_at)}
                    </span>
                )}

                {post.platform === 'X' && post.scheduled_at && ['pending', 'failed'].includes(publishStatus) && (
                    <button
                        type="button"
                        onClick={() => onCancel(post.id)}
                        disabled={isCanceling}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-40"
                        aria-label={`Cancelar agendamento: ${post.content?.slice(0, 30) || 'sem conteúdo'}`}
                        title="Cancelar agendamento"
                    >
                        <XCircle size={14} />
                    </button>
                )}

                {canManageFinal && (
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setMenuOpen((current) => !current)}
                            className="p-1.5 rounded-lg app-text-soft hover:text-slate-700 dark:hover:text-slate-300 app-hover-subtle"
                            aria-label={`Abrir menu do post: ${post.content?.slice(0, 30) || 'sem conteúdo'}`}
                            title="Opções"
                        >
                            <MoreHorizontal size={16} />
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 top-10 z-10 min-w-40 rounded-xl app-panel shadow-lg p-1.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onEdit(post, 'edit');
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg app-text-secondary app-hover-subtle"
                                >
                                    <Pencil size={14} />
                                    Editar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onEdit(post, 'schedule');
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg app-text-secondary app-hover-subtle"
                                >
                                    <Calendar size={14} />
                                    Agendar
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {isPending && (
                    <>
                        <button
                            onClick={() => onEdit(post, 'edit')}
                            className="p-1.5 rounded-lg app-text-soft hover:text-slate-700 dark:hover:text-slate-300 app-hover-subtle"
                            aria-label={`Editar post: ${post.content?.slice(0, 30) || 'sem conteúdo'}`}
                            title="Editar"
                        >
                            <Pencil size={14} />
                        </button>
                        <button
                            onClick={() => onReject(post.id)}
                            disabled={isRejecting || isApproving}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-40"
                            aria-label={`Rejeitar post: ${post.content?.slice(0, 30) || 'sem conteúdo'}`}
                            title="Rejeitar"
                        >
                            <XCircle size={14} />
                        </button>
                        <button
                            onClick={() => onApprove(post.id)}
                            disabled={isApproving || isRejecting}
                            className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors disabled:opacity-40"
                            aria-label={`Aprovar post: ${post.content?.slice(0, 30) || 'sem conteúdo'}`}
                            title="Aprovar"
                        >
                            <CheckCircle size={14} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

function XComposer() {
    const [content, setContent] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const { data: xStatus } = useXIntegrationStatus();
    const publishNow = usePublishXPost();
    const schedulePost = useScheduleXPost();

    const trimmed = content.trim();
    const isOverLimit = content.length > 280;
    const hasSchedule = scheduledAt.length > 0;
    const scheduleIsPast = hasSchedule && new Date(scheduledAt).getTime() <= Date.now();
    const disabled = !trimmed || isOverLimit || !xStatus?.connected || publishNow.isPending || schedulePost.isPending;

    async function submitNow() {
        if (disabled) return;
        await publishNow.mutateAsync({ content: trimmed });
        setContent('');
        setScheduledAt('');
    }

    async function submitSchedule() {
        if (disabled || !hasSchedule || scheduleIsPast) return;
        await schedulePost.mutateAsync({
            content: trimmed,
            scheduled_at: new Date(scheduledAt).toISOString(),
        });
        setContent('');
        setScheduledAt('');
    }

    return (
        <section className="app-panel rounded-[24px] border app-divider p-4 mb-6">
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                        <Twitter size={15} />
                    </span>
                    <div>
                        <h2 className="text-sm font-bold app-text">Criar post para X</h2>
                        <p className="text-xs app-text-soft">
                            {xStatus?.connected ? `Conectado${xStatus.username ? ` como @${xStatus.username}` : ''}` : 'Conecte o X no CMO antes de publicar'}
                        </p>
                    </div>
                </div>
                <span className={cn('text-xs font-medium', isOverLimit ? 'text-rose-500' : 'app-text-soft')}>
                    {content.length}/280
                </span>
            </div>
            <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={4}
                className="app-input resize-none text-sm"
                placeholder="Escreva um post curto para publicar ou agendar no X..."
            />
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                <label className="flex items-center gap-2 text-sm app-text-secondary">
                    <Clock size={14} className="app-text-soft" />
                    <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(event) => setScheduledAt(event.target.value)}
                        className="app-input text-sm px-3 py-1.5"
                    />
                </label>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={submitSchedule}
                        disabled={disabled || !hasSchedule || scheduleIsPast}
                        className="flex items-center gap-2"
                        aria-label="Agendar post no X"
                    >
                        <Calendar size={15} />
                        {schedulePost.isPending ? 'Agendando...' : 'Agendar'}
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={submitNow}
                        disabled={disabled}
                        className="flex items-center gap-2"
                        aria-label="Publicar post no X agora"
                    >
                        <Send size={15} />
                        {publishNow.isPending ? 'Publicando...' : 'Publicar agora'}
                    </Button>
                </div>
            </div>
            {scheduleIsPast && (
                <p className="text-xs text-rose-500 mt-2">Escolha uma data futura para agendar.</p>
            )}
        </section>
    );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                active
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'app-panel text-[var(--app-text-secondary)] hover:border-primary-300 dark:hover:border-primary-700 hover:text-primary-700 dark:hover:text-primary-400'
            )}
        >
            {children}
        </button>
    );
}

function PlatformToggle({ platform, active, onClick }: { platform: Platform; active: boolean; onClick: () => void }) {
    const isX = platform === 'X';
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                active
                    ? isX
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-[#0a66c2] text-white border-[#0a66c2]'
                    : 'app-panel text-[var(--app-text-secondary)] hover:border-[rgba(14,15,12,0.18)] dark:hover:border-slate-600'
            )}
        >
            {isX ? <Twitter size={14} /> : <Linkedin size={14} />}
            {isX ? 'Twitter / X' : 'LinkedIn'}
        </button>
    );
}

export function PostsPage() {
    const [page, setPage] = useState(0);
    const POSTS_PER_PAGE = 20;
    const { data, isLoading } = usePosts(undefined, undefined, page, POSTS_PER_PAGE);
    const posts = data?.items;
    const total = data?.total ?? 0;
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [editMode, setEditMode] = useState<EditMode>('edit');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [platformFilter, setPlatformFilter] = useState<Platform | null>(null);
    const [dateFilter, setDateFilter] = useState('');
    const dateInputRef = useRef<HTMLInputElement>(null);
    const { approvePost, rejectPost, isApproving, isRejecting } = usePostActions();
    const cancelXPost = useCancelXPost();

    const handleApprove = useCallback((id: string) => { approvePost(id); }, [approvePost]);
    const handleReject = useCallback((id: string) => { rejectPost(id); }, [rejectPost]);
    const handleCancel = useCallback((id: string) => { cancelXPost.mutate(id); }, [cancelXPost]);

    const filtered = useMemo(() => posts?.filter(p => {
        if (p.status === 'REJECTED') return false;
        if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
        if (platformFilter !== null && p.platform !== platformFilter) return false;
        if (dateFilter) {
            if (!p.scheduled_at) return false;
            const postDate = new Date(p.scheduled_at).toISOString().slice(0, 10);
            if (postDate !== dateFilter) return false;
        }
        return true;
    }), [posts, statusFilter, platformFilter, dateFilter]);

    const openEditModal = useCallback((post: Post, mode: EditMode = 'edit') => {
        setEditMode(mode);
        setEditingPost(post);
    }, []);

    const togglePlatform = useCallback((p: Platform) =>
        setPlatformFilter(prev => (prev === p ? null : p)), []);

    return (
        <div className="max-w-4xl mx-auto py-8 w-full">
            <div className="mb-6">
                <h1 className="text-2xl font-extrabold app-text">Posts</h1>
                <p className="app-text-muted mt-1 text-sm">Gerencie todos os posts de todas as campanhas.</p>
            </div>

            <XComposer />

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
                    {(['ALL', 'UNDER_REVIEW', 'APPROVED', 'FINAL', 'PUBLISHED'] as StatusFilter[]).map(s => (
                        <FilterPill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                            {STATUS_LABELS[s]}
                        </FilterPill>
                    ))}

                    <div className="w-px bg-[var(--app-border)] self-stretch mx-1" />

                    <PlatformToggle platform="X" active={platformFilter === 'X'} onClick={() => togglePlatform('X')} />
                    <PlatformToggle platform="LINKEDIN" active={platformFilter === 'LINKEDIN'} onClick={() => togglePlatform('LINKEDIN')} />

                    <div className="w-px bg-[var(--app-border)] self-stretch mx-1" />

                    {/* Date filter */}
                    <div className="relative">
                        <button
                            onClick={() => dateInputRef.current?.showPicker()}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                                dateFilter
                                    ? 'bg-violet-600 text-white border-violet-600'
                                    : 'app-panel text-[var(--app-text-secondary)] hover:border-[rgba(14,15,12,0.18)] dark:hover:border-slate-600'
                            )}
                        >
                            <Calendar size={14} />
                            {dateFilter
                                ? new Date(dateFilter + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                                : '📅 Data'}
                        </button>
                        <input
                            ref={dateInputRef}
                            type="date"
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                            className="absolute inset-0 opacity-0 pointer-events-none w-full"
                        />
                    </div>

                    {dateFilter && (
                        <button
                            onClick={() => setDateFilter('')}
                            className="flex items-center gap-1 text-xs app-text-muted hover:text-slate-700 transition-colors"
                            title="Limpar filtro de data"
                        >
                            <XIcon size={13} /> Limpar data
                        </button>
                    )}
            </div>

            {/* List */}
            {isLoading && (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-16 app-panel-subtle rounded-[24px] animate-pulse" />
                    ))}
                </div>
            )}

            {!isLoading && (!filtered || filtered.length === 0) && (
                <div className="flex flex-col items-center py-20 text-center border border-dashed app-divider-strong rounded-[28px] app-panel-subtle">
                    <FileText size={32} className="app-text-soft mb-3" />
                    <p className="app-text-secondary font-medium">Nenhum post encontrado</p>
                    <p className="app-text-soft text-sm mt-1">Ajuste os filtros ou crie uma nova campanha.</p>
                </div>
            )}

            {!isLoading && filtered && filtered.length > 0 && (
                <div className="space-y-2">
                    {filtered.map(post => (
                        <PostRowCard
                            key={post.id}
                            post={post}
                            onEdit={openEditModal}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            onCancel={handleCancel}
                            isApproving={isApproving}
                            isRejecting={isRejecting}
                            isCanceling={cancelXPost.isPending}
                        />
                    ))}
                    <p className="text-xs app-text-soft text-right pt-1">{filtered.length} post{filtered.length !== 1 ? 's' : ''}</p>
                </div>
            )}

            <EditPostModal
                key={`${editingPost?.id ?? 'empty-post'}-${editMode}`}
                post={editingPost}
                initialMode={editMode}
                onClose={() => setEditingPost(null)}
            />
            <Pagination page={page} total={total} limit={POSTS_PER_PAGE} onPageChange={setPage} />
        </div>
    );
}
