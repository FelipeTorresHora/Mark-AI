import { useState, useMemo } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    parseISO,
    getHours,
    getMinutes,
    isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Twitter, Linkedin, CalendarDays, LayoutGrid } from 'lucide-react';
import { usePosts } from '../hooks/usePosts';
import { type Post } from '../types';
import { EditPostModal } from '../components/posts/EditPostModal';
import { cn } from '../lib/utils';

// ─── helpers ────────────────────────────────────────────────────────────────

const PLATFORM_STYLES = {
    X: {
        dot: 'bg-slate-800 dark:bg-slate-200',
        chip: 'bg-slate-900 text-white dark:bg-slate-700 dark:text-slate-100',
        icon: Twitter,
    },
    LINKEDIN: {
        dot: 'bg-[#0a66c2]',
        chip: 'bg-[#0a66c2] text-white',
        icon: Linkedin,
    },
} as const;

const STATUS_RING: Partial<Record<Post['status'], string>> = {
    APPROVED: 'ring-1 ring-emerald-400/60',
    FINAL: 'ring-1 ring-emerald-500',
    PUBLISHED: 'ring-1 ring-blue-400/60',
    UNDER_REVIEW: 'ring-1 ring-amber-400/60',
    REJECTED: 'opacity-40',
};

function postsForDay(posts: Post[], day: Date): Post[] {
    return posts.filter((p) => {
        if (!p.scheduled_at) return false;
        return isSameDay(parseISO(p.scheduled_at), day);
    });
}

// ─── PostChip ───────────────────────────────────────────────────────────────

function PostChip({
    post,
    onClick,
    compact = false,
}: {
    post: Post;
    onClick: () => void;
    compact?: boolean;
}) {
    const style = PLATFORM_STYLES[post.platform];
    const Icon = style.icon;
    const ring = STATUS_RING[post.status] ?? '';

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            title={post.content ?? post.platform}
            className={cn(
                'flex items-center gap-1 rounded-md text-xs font-medium truncate transition-all hover:scale-[1.03] active:scale-[0.97]',
                style.chip,
                ring,
                compact ? 'px-1.5 py-0.5 max-w-full' : 'px-2 py-1 max-w-full',
            )}
        >
            <Icon size={compact ? 9 : 11} className="shrink-0" />
            {!compact && (
                <span className="truncate max-w-[110px]">
                    {post.content?.slice(0, 30) ?? post.platform}
                </span>
            )}
        </button>
    );
}

// ─── MonthView ───────────────────────────────────────────────────────────────

function MonthView({
    referenceDate,
    posts,
    onPostClick,
}: {
    referenceDate: Date;
    posts: Post[];
    onPostClick: (post: Post) => void;
}) {
    const monthStart = startOfMonth(referenceDate);
    const monthEnd = endOfMonth(referenceDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

    const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Weekday header */}
            <div className="grid grid-cols-7 border-b app-divider">
                {WEEKDAYS.map((wd) => (
                    <div
                        key={wd}
                        className="py-2 text-center text-xs font-semibold app-text-soft uppercase tracking-wider"
                    >
                        {wd}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 flex-1 min-h-0" style={{ gridAutoRows: '1fr' }}>
                {days.map((day) => {
                    const dayPosts = postsForDay(posts, day);
                    const isCurrentMonth = isSameMonth(day, referenceDate);
                    const today = isToday(day);
                    const MAX_VISIBLE = 3;

                    return (
                        <div
                            key={day.toISOString()}
                            className={cn(
                                'border-b border-r app-divider p-1.5 flex flex-col gap-1 min-h-[100px] transition-colors',
                                !isCurrentMonth && 'bg-[rgba(14,15,12,0.03)] dark:bg-slate-800/30',
                                today && 'bg-primary-50/40 dark:bg-primary-900/10',
                            )}
                        >
                            {/* Day number */}
                            <div className="flex justify-end">
                                <span
                                    className={cn(
                                        'w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold leading-none',
                                        today
                                            ? 'bg-primary-600 text-white'
                                            : isCurrentMonth
                                            ? 'app-text-secondary'
                                            : 'text-slate-300 dark:text-slate-600',
                                    )}
                                >
                                    {format(day, 'd')}
                                </span>
                            </div>

                            {/* Post chips */}
                            <div className="flex flex-col gap-0.5 overflow-hidden">
                                {dayPosts.slice(0, MAX_VISIBLE).map((post) => (
                                    <PostChip
                                        key={post.id}
                                        post={post}
                                        onClick={() => onPostClick(post)}
                                        compact={false}
                                    />
                                ))}
                                {dayPosts.length > MAX_VISIBLE && (
                                    <span className="text-[10px] font-medium app-text-soft pl-1">
                                        +{dayPosts.length - MAX_VISIBLE} mais
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── WeekView ────────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function WeekView({
    referenceDate,
    posts,
    onPostClick,
}: {
    referenceDate: Date;
    posts: Post[];
    onPostClick: (post: Post) => void;
}) {
    const weekStart = startOfWeek(referenceDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Group posts by day+hour
    const postMap = useMemo(() => {
        const map: Record<string, Post[]> = {};
        posts.forEach((p) => {
            if (!p.scheduled_at) return;
            const d = parseISO(p.scheduled_at);
            const key = `${format(d, 'yyyy-MM-dd')}_${getHours(d)}`;
            if (!map[key]) map[key] = [];
            map[key].push(p);
        });
        return map;
    }, [posts]);

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
            {/* Header row */}
            <div className="grid border-b app-divider shrink-0" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
                <div className="py-2" />
                {days.map((day) => {
                    const today = isToday(day);
                    return (
                        <div key={day.toISOString()} className="py-2 text-center border-l app-divider">
                            <p className={cn('text-xs font-semibold uppercase tracking-wider', today ? 'text-primary-600 dark:text-primary-400' : 'app-text-soft')}>
                                {format(day, 'EEE', { locale: ptBR })}
                            </p>
                            <p className={cn(
                                'text-sm font-bold mx-auto w-8 h-8 flex items-center justify-center rounded-full',
                                today ? 'bg-primary-600 text-white' : 'app-text-secondary',
                            )}>
                                {format(day, 'd')}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="grid" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
                    {HOURS.map((hour) => (
                        <>
                            {/* Hour label */}
                            <div
                                key={`label-${hour}`}
                                className="border-b app-divider h-14 flex items-start justify-end pr-2 pt-1"
                            >
                                <span className="text-[10px] font-medium app-text-soft tabular-nums">
                                    {String(hour).padStart(2, '0')}:00
                                </span>
                            </div>

                            {/* Day cells */}
                            {days.map((day) => {
                                const key = `${format(day, 'yyyy-MM-dd')}_${hour}`;
                                const cellPosts = postMap[key] ?? [];
                                const today = isToday(day);

                                return (
                                    <div
                                        key={`${day.toISOString()}-${hour}`}
                                        className={cn(
                                            'border-b border-l app-divider h-14 p-0.5 flex flex-col gap-0.5 overflow-hidden',
                                            today && 'bg-primary-50/20 dark:bg-primary-900/5',
                                        )}
                                    >
                                        {cellPosts.map((post) => {
                                            const d = parseISO(post.scheduled_at!);
                                            const mins = getMinutes(d);
                                            return (
                                                <div key={post.id} className="flex items-start gap-1">
                                                    <span className="text-[9px] app-text-soft tabular-nums shrink-0 pt-0.5">
                                                        {String(hour).padStart(2, '0')}:{String(mins).padStart(2, '0')}
                                                    </span>
                                                    <PostChip
                                                        post={post}
                                                        onClick={() => onPostClick(post)}
                                                        compact={true}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── CalendarPage ─────────────────────────────────────────────────────────────

type CalendarView = 'month' | 'week';

export function CalendarPage() {
    const [view, setView] = useState<CalendarView>('month');
    const [referenceDate, setReferenceDate] = useState<Date>(new Date());
    const [editingPost, setEditingPost] = useState<Post | null>(null);

    const { data: postData, isLoading } = usePosts();

    // Only posts with scheduled_at
    const scheduledPosts = useMemo(
        () => (postData?.items ?? []).filter((p): p is Post & { scheduled_at: string } => !!p.scheduled_at),
        [postData?.items],
    );

    function navigate(direction: 1 | -1) {
        if (view === 'month') {
            setReferenceDate((d) => (direction === 1 ? addMonths(d, 1) : subMonths(d, 1)));
        } else {
            setReferenceDate((d) => (direction === 1 ? addWeeks(d, 1) : subWeeks(d, 1)));
        }
    }

    function goToToday() {
        setReferenceDate(new Date());
    }

    const headerLabel =
        view === 'month'
            ? format(referenceDate, 'MMMM yyyy', { locale: ptBR })
            : (() => {
                  const ws = startOfWeek(referenceDate, { weekStartsOn: 0 });
                  const we = endOfWeek(referenceDate, { weekStartsOn: 0 });
                  if (format(ws, 'MMM', { locale: ptBR }) === format(we, 'MMM', { locale: ptBR })) {
                      return `${format(ws, 'd')} – ${format(we, 'd MMM yyyy', { locale: ptBR })}`;
                  }
                  return `${format(ws, 'd MMM', { locale: ptBR })} – ${format(we, 'd MMM yyyy', { locale: ptBR })}`;
              })();

    return (
        <div className="flex flex-col h-full py-6 px-4 max-w-7xl mx-auto w-full">
            {/* Page header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-extrabold app-text">Calendário</h1>
                    <p className="app-text-muted mt-0.5 text-sm">Visualize e gerencie posts agendados.</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className="flex app-segment rounded-xl p-1 gap-1">
                        <button
                            onClick={() => setView('month')}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all app-segment-item',
                                view === 'month'
                                    ? 'app-segment-item-active'
                                    : '',
                            )}
                        >
                            <LayoutGrid size={15} />
                            Mês
                        </button>
                        <button
                            onClick={() => setView('week')}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all app-segment-item',
                                view === 'week'
                                    ? 'app-segment-item-active'
                                    : '',
                            )}
                        >
                            <CalendarDays size={15} />
                            Semana
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar toolbar */}
            <div className="flex items-center gap-3 mb-3 shrink-0">
                <button
                    onClick={goToToday}
                    className="px-3 py-1.5 rounded-lg border app-divider text-sm font-medium app-panel app-text-secondary hover:border-primary-400 hover:text-primary-700 dark:hover:border-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                    Hoje
                </button>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-1.5 rounded-lg hover:bg-[var(--app-hover)] dark:hover:bg-slate-700 app-text-muted hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        onClick={() => navigate(1)}
                        className="p-1.5 rounded-lg hover:bg-[var(--app-hover)] dark:hover:bg-slate-700 app-text-muted hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                <h2 className="text-base font-bold app-text capitalize">
                    {headerLabel}
                </h2>

                {/* Legend */}
                <div className="ml-auto flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-xs app-text-muted">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-slate-400 shrink-0" />
                        X / Twitter
                    </span>
                    <span className="flex items-center gap-1.5 text-xs app-text-muted">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#0a66c2] shrink-0" />
                        LinkedIn
                    </span>
                </div>
            </div>

            {/* Calendar body */}
            <div className={cn(
                'flex-1 min-h-0 rounded-[28px] app-panel overflow-hidden shadow-sm',
                view === 'week' && 'flex flex-col',
            )}>
                {isLoading ? (
                    <div className="flex items-center justify-center h-64 app-text-soft text-sm">
                        Carregando posts...
                    </div>
                ) : view === 'month' ? (
                    <MonthView
                        referenceDate={referenceDate}
                        posts={scheduledPosts}
                        onPostClick={setEditingPost}
                    />
                ) : (
                    <WeekView
                        referenceDate={referenceDate}
                        posts={scheduledPosts}
                        onPostClick={setEditingPost}
                    />
                )}
            </div>

            {/* Scheduled count */}
            {!isLoading && (
                <p className="text-xs app-text-soft mt-2 shrink-0 text-right">
                    {scheduledPosts.length} post{scheduledPosts.length !== 1 ? 's' : ''} agendado{scheduledPosts.length !== 1 ? 's' : ''}
                </p>
            )}

            <EditPostModal key={editingPost?.id ?? 'empty-calendar-post'} post={editingPost} onClose={() => setEditingPost(null)} />
        </div>
    );
}
