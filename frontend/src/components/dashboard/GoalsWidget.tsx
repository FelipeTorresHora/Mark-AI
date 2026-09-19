import { CheckCircle2, Circle, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AUDIENCE_OPTIONS } from '../../data/goalsCopy';
import { useGoals, useUpdateGoalsAudience } from '../../hooks/useGoals';
import type { AudienceType } from '../../data/goalsCopy';
import { cn } from '../../lib/utils';
import { Card } from '../common/Card';

function GoalRow({
    title,
    description,
    completed,
    current,
    target,
    progressPercent,
}: {
    title: string;
    description: string;
    completed: boolean;
    current: number;
    target: number;
    progressPercent: number;
}) {
    return (
        <li className="flex gap-3 py-3 border-b border-[rgba(14,15,12,0.08)] last:border-0 dark:border-white/10">
            <div className="mt-0.5 shrink-0">
                {completed ? (
                    <CheckCircle2 className="text-[#054d28] dark:text-[#9fe870]" size={20} aria-hidden />
                ) : (
                    <Circle className="app-text-soft" size={20} aria-hidden />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold app-text text-sm leading-snug">{title}</p>
                <p className="text-xs app-text-muted mt-0.5 leading-relaxed">{description}</p>
                {!completed && target > 1 && (
                    <div className="mt-2">
                        <div className="h-1.5 rounded-full bg-[#e8ebe6] dark:bg-white/10 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-[#9fe870] transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <p className="text-[11px] app-text-soft mt-1 tabular-nums">
                            {current} de {target}
                        </p>
                    </div>
                )}
            </div>
        </li>
    );
}

export function GoalsWidget() {
    const navigate = useNavigate();
    const { data, isLoading, isError } = useGoals();
    const updateAudience = useUpdateGoalsAudience();

    const featuredGoals = data?.goals.filter((g) => g.featured) ?? [];
    const completedFeatured = featuredGoals.filter((g) => g.completed).length;

    return (
        <Card className="p-6 mb-6 border border-[rgba(14,15,12,0.12)] dark:border-white/10 rounded-[30px]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
                <div className="flex items-start gap-3">
                    <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(159, 232, 112, 0.35)' }}
                    >
                        <Target className="text-[#163300] dark:text-[#9fe870]" size={22} aria-hidden />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold app-text tracking-tight">Suas metas</h2>
                        <p className="text-sm app-text-muted mt-0.5">
                            Pequenos passos para manter o hábito de publicar
                        </p>
                    </div>
                </div>
                {data && (
                    <div className="text-right">
                        <p className="text-2xl font-extrabold app-text tabular-nums">
                            {data.completed_count}
                            <span className="text-base font-semibold app-text-soft">/{data.total_count}</span>
                        </p>
                        <p className="text-xs app-text-muted">concluídas</p>
                    </div>
                )}
            </div>

            <label htmlFor="goals-audience" className="block text-xs font-semibold app-text-secondary mb-1.5">
                Seu perfil
            </label>
            <select
                id="goals-audience"
                className="app-input text-sm mb-4 max-w-md"
                disabled={isLoading || updateAudience.isPending}
                value={data?.audience ?? 'mei_loja_liberal'}
                onChange={(e) => updateAudience.mutate(e.target.value as AudienceType)}
            >
                {AUDIENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>

            {isLoading && (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-14 app-panel-subtle rounded-2xl animate-pulse" />
                    ))}
                </div>
            )}

            {isError && (
                <p className="text-sm text-rose-600 dark:text-rose-400">
                    Não foi possível carregar suas metas. Tente atualizar a página.
                </p>
            )}

            {data && !isLoading && (
                <>
                    <p className="text-xs app-text-soft mb-2">
                        Foco agora: {completedFeatured}/{featuredGoals.length} metas em destaque
                    </p>
                    <ul>
                        {featuredGoals.map((goal) => (
                            <GoalRow
                                key={goal.key}
                                title={goal.title}
                                description={goal.description}
                                completed={goal.completed}
                                current={goal.current}
                                target={goal.target}
                                progressPercent={goal.progress_percent}
                            />
                        ))}
                    </ul>
                    <details className="mt-3 group">
                        <summary
                            className={cn(
                                'text-sm font-semibold cursor-pointer list-none',
                                'text-[#163300] dark:text-[#9fe870] hover:opacity-80',
                            )}
                        >
                            Ver todas as metas ({data.total_count})
                        </summary>
                        <ul className="mt-2 pl-1">
                            {data.goals
                                .filter((g) => !g.featured)
                                .map((goal) => (
                                    <GoalRow
                                        key={goal.key}
                                        title={goal.title}
                                        description={goal.description}
                                        completed={goal.completed}
                                        current={goal.current}
                                        target={goal.target}
                                        progressPercent={goal.progress_percent}
                                    />
                                ))}
                        </ul>
                    </details>
                    {data.goals.some((g) => g.key === 'connect_account' && !g.completed) && (
                        <button
                            type="button"
                            onClick={() => navigate('/empresa')}
                            className="mt-4 text-sm font-semibold text-[#163300] dark:text-[#9fe870] hover:underline"
                        >
                            Conectar conta em Empresa →
                        </button>
                    )}
                </>
            )}
        </Card>
    );
}
