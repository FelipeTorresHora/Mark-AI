import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Sparkles, Zap } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { api } from '../../lib/api';
import { isNotFoundError } from '../../lib/utils';
import { useStartCampaign, type BrandProfileSnapshot } from '../../hooks/useStartCampaign';
import type { PostsPerPlatform } from '../../types';

const OBJECTIVE_EXAMPLES = [
    'Abrir agenda da clínica com posts que gerem confiança local',
    'Lançar uma feature e explicar o valor em linguagem simples',
    'Crescer no LinkedIn sem aparecer em vídeo — só texto e autoridade',
];

const DEFAULT_POSTS_PER_PLATFORM: PostsPerPlatform = { X: 2, LINKEDIN: 2 };

function clampPostCount(value: number) {
    return Math.min(4, Math.max(1, value));
}

export function ObjectiveComposer() {
    const navigate = useNavigate();
    const location = useLocation();
    const [objective, setObjective] = useState('');
    const [postsPerPlatform, setPostsPerPlatform] = useState<PostsPerPlatform>({
        ...DEFAULT_POSTS_PER_PLATFORM,
    });
    const { startCampaign, isStarting } = useStartCampaign();

    useEffect(() => {
        const state = location.state as { topic?: string; objective?: string } | null;
        const preset = state?.objective ?? state?.topic;
        if (preset) setObjective(preset);
    }, [location.state]);

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['brand-profile'],
        queryFn: async (): Promise<BrandProfileSnapshot> => {
            const res = await api.get('/api/v1/brand-profile');
            return res.data;
        },
        retry: (failureCount, err) => !isNotFoundError(err) && failureCount < 2,
    });

    const hasValidPostCounts = Object.values(postsPerPlatform).every((c) => c >= 1 && c <= 4);
    const totalPosts = postsPerPlatform.X + postsPerPlatform.LINKEDIN;
    const canStart =
        objective.trim().length >= 20 && !!profile && hasValidPostCounts && !isStarting;

    function updatePostCount(platform: keyof PostsPerPlatform, value: string) {
        setPostsPerPlatform((current) => ({
            ...current,
            [platform]: clampPostCount(Number(value) || 1),
        }));
    }

    function handleSubmit() {
        if (!profile || !canStart) return;
        startCampaign({
            objective,
            brandContext: profile,
            postsPerPlatform,
        });
    }

    return (
        <div className="w-full max-w-3xl mx-auto">
            <header className="mb-10 text-center md:text-left">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#163300] bg-[#e2f6d5] px-4 py-1.5 rounded-full mb-4">
                    <Sparkles size={16} aria-hidden />
                    Jornada fluida
                </p>
                <h1
                    className="text-4xl md:text-5xl font-black app-text tracking-tight"
                    style={{ lineHeight: 0.9 }}
                >
                    Qual é o seu objetivo?
                </h1>
                <p className="mt-4 text-lg app-text-muted max-w-2xl">
                    Descreva o que quer alcançar. A IA gera posts para os canais conectados; você aprova ou
                    pede refação com instruções claras.
                </p>
            </header>

            {!profileLoading && !profile && (
                <Card className="flex items-start gap-3 p-5 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 mb-6 rounded-[30px]">
                    <AlertCircle size={20} className="text-amber-600 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-semibold text-amber-800 dark:text-amber-300">
                            Perfil da marca não configurado
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                            Configure sua marca em{' '}
                            <button
                                type="button"
                                onClick={() => navigate('/empresa')}
                                className="underline font-medium"
                            >
                                Empresa
                            </button>{' '}
                            antes de gerar conteúdo.
                        </p>
                    </div>
                </Card>
            )}

            {profile && (
                <Card className="p-4 app-panel-subtle mb-6 flex items-center gap-3 rounded-[24px]">
                    <div className="w-10 h-10 rounded-full bg-[#e2f6d5] flex items-center justify-center text-[#163300] font-bold text-sm shrink-0">
                        {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-sm min-w-0">
                        <span className="font-semibold app-text-secondary">{profile.name}</span>
                        <span className="app-text-soft mx-1">·</span>
                        <span className="app-text-muted">{profile.tone}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/empresa')}
                        className="ml-auto text-xs text-primary-600 dark:text-primary-400 hover:underline shrink-0"
                    >
                        Editar marca
                    </button>
                </Card>
            )}

            <Card className="p-6 md:p-8 rounded-[32px] border border-[rgba(14,15,12,0.12)]">
                <label htmlFor="campaign-objective" className="block text-sm font-semibold app-text-secondary mb-3">
                    Objetivo desta rodada
                </label>
                <textarea
                    id="campaign-objective"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    rows={5}
                    className="app-input resize-none text-base"
                    placeholder="Ex.: Quero mais agendamentos na clínica esta semana, mostrando bastidores e depoimentos sem parecer vendedor..."
                    disabled={isStarting}
                />

                <div className="flex flex-wrap gap-2 mt-4">
                    {OBJECTIVE_EXAMPLES.map((example) => (
                        <button
                            key={example}
                            type="button"
                            onClick={() => setObjective(example)}
                            className="text-left text-xs font-semibold px-3 py-2 rounded-full bg-[rgba(22,51,0,0.08)] app-text-secondary hover:scale-[1.02] transition-transform"
                        >
                            {example}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
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
                            disabled={isStarting}
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="posts-linkedin"
                            className="block text-sm font-semibold app-text-secondary mb-2"
                        >
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
                            disabled={isStarting}
                        />
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
                    <span
                        className={`text-xs ${objective.trim().length < 20 ? 'app-text-soft' : 'text-emerald-600 dark:text-emerald-400'}`}
                    >
                        {objective.trim().length}/20 mín. · {totalPosts} posts nesta rodada
                    </span>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={!canStart}
                        className="flex items-center justify-center gap-2 px-10 w-full sm:w-auto"
                    >
                        {isStarting ? 'Iniciando...' : (
                            <>
                                <Zap size={18} aria-hidden />
                                Gerar conteúdo
                            </>
                        )}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
