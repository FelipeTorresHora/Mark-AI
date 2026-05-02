import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock } from 'lucide-react';
import { type Post } from '../../types';
import { useEditPost } from '../../hooks/useEditPost';
import { useCancelXPost } from '../../hooks/useXPosts';
import { XPreview } from '../previews/XPreview';
import { LinkedInPreview } from '../previews/LinkedInPreview';
import { Button } from '../common/Button';
import { cn } from '../../lib/utils';

interface EditPostModalProps {
    post: Post | null;
    onClose: () => void;
    initialMode?: 'edit' | 'schedule';
}

function toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditPostModal({ post, onClose, initialMode = 'edit' }: EditPostModalProps) {
    const [content, setContent] = useState(() => post?.content ?? '');
    const [scheduleEnabled, setScheduleEnabled] = useState(() => initialMode === 'schedule' || !!post?.scheduled_at);
    const [scheduledAt, setScheduledAt] = useState(() => (post?.scheduled_at ? toDatetimeLocal(post.scheduled_at) : ''));
    const { editPost, isEditing } = useEditPost();
    const cancelXPost = useCancelXPost();

    async function handleSave() {
        if (!post) return;
        await editPost({
            id: post.id,
            content,
            scheduled_at: scheduleEnabled && scheduledAt
                ? new Date(scheduledAt).toISOString()
                : null,
        });
        onClose();
    }

    const charCount = content.length;
    const isX = post?.platform === 'X';
    const isOverLimit = isX && charCount > 280;
    const scheduleIsPast = scheduleEnabled && scheduledAt && new Date(scheduledAt).getTime() <= Date.now();
    const canCancelSchedule = isX && !!post?.scheduled_at && ['pending', 'failed'].includes(post.publish_status ?? 'pending');

    return (
        <AnimatePresence>
            {post && (
                <>
                    {/* Overlay */}
                    <motion.div
                        key={post.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 z-40"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Drawer */}
                    <motion.div
                        key={`${post.id}-drawer`}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full max-w-2xl app-panel shadow-2xl z-50 flex flex-col"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Editar post"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b app-divider">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold app-text">Editar Post</h2>
                                <span className={cn(
                                    'text-xs font-bold px-2.5 py-0.5 rounded-full',
                                    isX
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-[#0a66c2] text-white'
                                )}>
                                    {isX ? 'Twitter / X' : 'LinkedIn'}
                                </span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg app-text-soft hover:text-slate-700 dark:hover:text-slate-300 hover:bg-[var(--app-hover)] dark:hover:bg-slate-700 transition-colors"
                                aria-label="Fechar modal"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex flex-1 overflow-hidden">
                            {/* Left: Editor */}
                            <div className="flex-1 flex flex-col p-6 overflow-y-auto border-r app-divider">
                                <label className="text-xs font-semibold app-text-muted uppercase tracking-wide mb-2">
                                    Conteúdo
                                </label>
                                <textarea
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    className="app-input flex-1 min-h-[200px] resize-none text-sm"
                                    placeholder="Escreva o conteúdo do post..."
                                />
                                <div className="flex justify-end mt-1.5">
                                    {isX && (
                                        <span className={cn('text-xs font-medium', isOverLimit ? 'text-red-500' : 'app-text-soft')}>
                                            {charCount}/280
                                        </span>
                                    )}
                                </div>

                                {/* Scheduling */}
                                <div className="mt-5 pt-5 border-t app-divider">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={15} className="text-violet-600" />
                                            <span className="text-sm font-semibold app-text-secondary">Agendar publicação</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setScheduleEnabled(v => !v)}
                                            className={cn(
                                                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                                                scheduleEnabled ? 'bg-violet-500' : 'bg-slate-200 dark:bg-slate-600'
                                            )}
                                        >
                                            <span className={cn(
                                                'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                                                scheduleEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                                            )} />
                                        </button>
                                    </div>

                                    {scheduleEnabled && (
                                        <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-xl px-3 py-2">
                                            <Clock size={14} className="text-violet-500 shrink-0" />
                                            <input
                                                type="datetime-local"
                                                value={scheduledAt}
                                                onChange={e => setScheduledAt(e.target.value)}
                                                className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 focus:outline-none"
                                            />
                                        </div>
                                    )}
                                    {scheduleIsPast && (
                                        <p className="text-xs text-rose-500 mt-2">Escolha uma data futura para agendar.</p>
                                    )}
                                </div>
                            </div>

                            {/* Right: Live Preview (hidden on small screens) */}
                            <div className="hidden md:flex w-80 flex-col p-6 overflow-y-auto app-panel-subtle">
                                <p className="text-xs font-semibold app-text-muted uppercase tracking-wide mb-3">
                                    Preview ao vivo
                                </p>
                                {isX
                                    ? <XPreview content={content} />
                                    : <LinkedInPreview content={content} />
                                }
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t app-divider app-panel">
                            {canCancelSchedule && (
                                <Button
                                    variant="outline"
                                    onClick={async () => {
                                        if (!post) return;
                                        await cancelXPost.mutateAsync(post.id);
                                        onClose();
                                    }}
                                    disabled={cancelXPost.isPending || isEditing}
                                    className="mr-auto text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
                                >
                                    {cancelXPost.isPending ? 'Cancelando...' : 'Cancelar agendamento'}
                                </Button>
                            )}
                            <Button variant="outline" onClick={onClose} disabled={isEditing}>
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSave}
                                disabled={isEditing || !content.trim() || isOverLimit || !!scheduleIsPast}
                            >
                                {isEditing ? 'Salvando...' : 'Salvar alterações'}
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
