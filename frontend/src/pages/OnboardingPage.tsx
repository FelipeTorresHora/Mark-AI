import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import {
    AUDIENCE_OPTIONS,
    completeOnboarding,
    flushPendingAudienceForUser,
    getGoalsForAudience,
    getOnboardingState,
    productAudienceToApi,
    resolveOnboardingAudience,
    saveOnboardingAudience,
    setOAuthReturnToOnboarding,
    setPendingAudience,
    type OnboardingStep,
    type ProductAudience,
} from '../lib/onboarding';
import { SocialConnectList } from '../components/social/SocialConnectList';
import { OnboardingObjectiveStep } from '../components/onboarding/OnboardingObjectiveStep';
import { useHasConnectedSocialAccount } from '../hooks/useHasConnectedSocialAccount';
import { useGoals, useUpdateGoalsAudience, useUpdatePrimaryObjective } from '../hooks/useGoals';
import { toast } from '../lib/toast';
import { cn } from '../lib/utils';

const STEPS: { id: OnboardingStep; label: string }[] = [
    { id: 'audience', label: 'Público' },
    { id: 'accounts', label: 'Contas' },
    { id: 'goals', label: 'Metas' },
    { id: 'objective', label: 'Meta da marca' },
];

function parseStep(value: string | null): OnboardingStep {
    if (value === 'accounts' || value === 'goals' || value === 'objective') return value;
    return 'audience';
}

export function OnboardingPage() {
    const userId = useAppStore((s) => s.user?.id);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const stored = getOnboardingState(userId);
    const [audience, setAudience] = useState<ProductAudience | null>(() =>
        resolveOnboardingAudience(userId, null),
    );
    const step = parseStep(searchParams.get('step'));
    const hasConnectedAccount = useHasConnectedSocialAccount();
    const { mutate: syncAudienceToBackend } = useUpdateGoalsAudience();
    const { data: goalsData } = useGoals();
    const savePrimaryObjective = useUpdatePrimaryObjective();
    const activeAudience = resolveOnboardingAudience(userId, audience);
    const hydratedForUserRef = useRef<string | null>(null);

    useEffect(() => {
        if (!userId || hydratedForUserRef.current === userId) return;
        hydratedForUserRef.current = userId;
        const flushed = flushPendingAudienceForUser(userId);
        if (flushed) {
            syncAudienceToBackend(productAudienceToApi(flushed));
        }
    }, [userId, syncAudienceToBackend]);

    const stepIndex = STEPS.findIndex((s) => s.id === step);

    const goals = useMemo(() => {
        if (!activeAudience) return [];
        return getGoalsForAudience(activeAudience, hasConnectedAccount);
    }, [activeAudience, hasConnectedAccount]);

    const hasPrimaryObjective = Boolean(goalsData?.primary_objective?.trim());

    function goToStep(next: OnboardingStep) {
        setSearchParams({ step: next }, { replace: true });
    }

    function handleSelectAudience(id: ProductAudience) {
        setAudience(id);
        setPendingAudience(id);
        if (userId) {
            saveOnboardingAudience(userId, id);
            syncAudienceToBackend(productAudienceToApi(id));
        }
        goToStep('accounts');
    }

    async function handleSaveObjective(objective: string) {
        if (!userId) return;
        try {
            await savePrimaryObjective.mutateAsync(objective);
        } catch {
            toast.error('Não foi possível salvar sua meta da marca. Tente novamente.');
            return;
        }
        completeOnboarding(userId);
        navigate('/objetivo', { replace: true });
    }

    if (stored.completed) {
        return <Navigate to="/campanhas" replace />;
    }

    return (
        <div className="min-h-screen app-shell flex flex-col transition-colors duration-300">
            <header className="px-6 py-8 max-w-3xl mx-auto w-full">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] app-text-soft mb-2">Boas-vindas ao Mark</p>
                <h1
                    className="font-black app-text tracking-tight max-w-2xl"
                    style={{ fontSize: 'clamp(2.5rem, 6vw, 3.75rem)', lineHeight: 0.85 }}
                >
                    Vamos configurar sua presença digital
                </h1>
                <p className="app-text-secondary font-semibold mt-4 text-base max-w-xl">
                    Escolha seu perfil, conecte as contas que já tem, veja as metas de hábito e defina a meta da marca.
                    O objetivo de cada campanha vem depois, na geração.
                </p>

                <ol className="flex flex-wrap gap-2 mt-8" aria-label="Progresso do onboarding">
                    {STEPS.map((s, index) => {
                        const isActive = index === stepIndex;
                        const isDone = index < stepIndex;
                        return (
                            <li
                                key={s.id}
                                className={cn(
                                    'px-4 py-2 rounded-full text-xs font-semibold border transition-all',
                                    isActive && 'bg-primary-100 border-primary-300 text-primary-900 dark:bg-primary-900/30 dark:border-primary-700',
                                    isDone && !isActive && 'border-emerald-300 text-emerald-700 dark:text-emerald-400',
                                    !isActive && !isDone && 'app-panel-subtle app-text-soft border-transparent',
                                )}
                            >
                                {isDone ? '✓ ' : ''}
                                {s.label}
                            </li>
                        );
                    })}
                </ol>
            </header>

            <main className="flex-1 px-6 pb-12 max-w-3xl mx-auto w-full">
                {step === 'audience' && (
                    <section aria-labelledby="audience-heading">
                        <h2 id="audience-heading" className="text-xl font-black app-text mb-2" style={{ lineHeight: 1.1 }}>
                            Qual perfil combina com você?
                        </h2>
                        <p className="text-sm app-text-muted mb-6">Isso ajusta tom, metas e sugestões de conteúdo.</p>
                        <div className="grid gap-4 sm:grid-cols-1">
                            {AUDIENCE_OPTIONS.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleSelectAudience(option.id)}
                                    className={cn(
                                        'text-left p-6 rounded-[30px] border app-divider app-panel hover:border-primary-300 dark:hover:border-primary-700 transition-all hover:-translate-y-0.5 hover:scale-[1.01]',
                                        activeAudience === option.id && 'border-primary-400 ring-1 ring-primary-300',
                                    )}
                                >
                                    <p className="text-lg font-black app-text" style={{ lineHeight: 1.1 }}>
                                        {option.title}
                                    </p>
                                    <p className="text-sm app-text-secondary mt-2 leading-relaxed">{option.description}</p>
                                    <p className="text-xs font-semibold text-primary-700 dark:text-primary-400 mt-3">
                                        Tom: {option.tone}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {step === 'accounts' && (
                    <section aria-labelledby="accounts-heading">
                        <h2 id="accounts-heading" className="text-xl font-black app-text mb-2" style={{ lineHeight: 1.1 }}>
                            Conecte as contas que você já tem
                        </h2>
                        <p className="text-sm app-text-muted mb-6">
                            OAuth seguro — o Mark só publica o que você aprovar. Você pode conectar depois, se preferir.
                        </p>
                        <SocialConnectList variant="onboarding" onBeforeConnect={setOAuthReturnToOnboarding} />
                        <div className="flex flex-wrap gap-3 mt-8">
                            <button
                                type="button"
                                onClick={() => goToStep('audience')}
                                className="py-2.5 px-5 rounded-full text-sm font-semibold app-text-secondary hover:bg-primary-50 dark:hover:bg-white/5 transition-all"
                            >
                                Voltar
                            </button>
                            <button
                                type="button"
                                onClick={() => goToStep('goals')}
                                className="py-2.5 px-6 bg-primary-400 hover:scale-105 active:scale-95 text-primary-900 font-semibold rounded-full text-sm transition-all duration-150 flex items-center gap-2 ml-auto"
                            >
                                Continuar
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </section>
                )}

                {step === 'goals' && activeAudience && (
                    <section aria-labelledby="goals-heading">
                        <h2 id="goals-heading" className="text-xl font-black app-text mb-2" style={{ lineHeight: 1.1 }}>
                            Suas primeiras metas
                        </h2>
                        <p className="text-sm app-text-muted mb-6">
                            Metas de hábito para{' '}
                            <span className="font-semibold app-text-secondary">
                                {AUDIENCE_OPTIONS.find((a) => a.id === activeAudience)?.title}
                            </span>
                            . O objetivo de cada campanha fica na geração, separado da meta da marca.
                        </p>
                        <ul className="space-y-3 mb-8">
                            {goals.map((goal, index) => {
                                const done =
                                    (goal.id === 'connect' && hasConnectedAccount) ||
                                    (goal.id === 'objective' && hasPrimaryObjective);
                                return (
                                    <li
                                        key={goal.id}
                                        className="flex items-start gap-4 p-5 rounded-[24px] app-panel border app-divider"
                                    >
                                        <span
                                            className={cn(
                                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black',
                                                done
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                    : 'bg-primary-100 text-primary-900 dark:bg-primary-900/40',
                                            )}
                                        >
                                            {done ? <CheckCircle2 size={18} /> : index + 1}
                                        </span>
                                        <div>
                                            <p className="font-semibold app-text">{goal.label}</p>
                                            {goal.hint && (
                                                <p className="text-xs app-text-muted mt-1">{goal.hint}</p>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => goToStep('accounts')}
                                className="py-2.5 px-5 rounded-full text-sm font-semibold app-text-secondary hover:bg-primary-50 dark:hover:bg-white/5 transition-all"
                            >
                                Voltar
                            </button>
                            <button
                                type="button"
                                onClick={() => goToStep('objective')}
                                className="py-2.5 px-6 bg-primary-400 hover:scale-105 active:scale-95 text-primary-900 font-semibold rounded-full text-sm transition-all duration-150 flex items-center gap-2 ml-auto"
                            >
                                Definir meta da marca
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </section>
                )}

                {step === 'objective' && activeAudience && (
                    <OnboardingObjectiveStep
                        audience={activeAudience}
                        initialValue={goalsData?.primary_objective ?? ''}
                        isSaving={savePrimaryObjective.isPending}
                        onBack={() => goToStep('goals')}
                        onSave={handleSaveObjective}
                    />
                )}

                {step !== 'audience' && !activeAudience && (
                    <p className="text-sm app-text-muted">
                        Escolha um público primeiro.{' '}
                        <button type="button" className="text-primary-600 underline" onClick={() => goToStep('audience')}>
                            Voltar ao início
                        </button>
                    </p>
                )}
            </main>
        </div>
    );
}
