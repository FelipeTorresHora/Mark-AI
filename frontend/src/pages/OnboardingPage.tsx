import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Target } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import {
    AUDIENCE_OPTIONS,
    completeOnboarding,
    getGoalsForAudience,
    getOnboardingState,
    saveOnboardingAudience,
    setOAuthReturnToOnboarding,
    type OnboardingStep,
    type ProductAudience,
} from '../lib/onboarding';
import { SocialConnectList, useHasConnectedSocialAccount } from '../components/social/SocialConnectList';
import { cn } from '../lib/utils';

const STEPS: { id: OnboardingStep; label: string }[] = [
    { id: 'audience', label: 'Público' },
    { id: 'accounts', label: 'Contas' },
    { id: 'goals', label: 'Metas' },
];

function parseStep(value: string | null): OnboardingStep {
    if (value === 'accounts' || value === 'goals') return value;
    return 'audience';
}

export function OnboardingPage() {
    const userId = useAppStore((s) => s.user?.id);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const stored = getOnboardingState(userId);
    const [audience, setAudience] = useState<ProductAudience | null>(stored.audience);
    const step = parseStep(searchParams.get('step'));
    const hasConnectedAccount = useHasConnectedSocialAccount();

    useEffect(() => {
        if (stored.audience && !audience) {
            setAudience(stored.audience);
        }
    }, [stored.audience, audience]);

    const stepIndex = STEPS.findIndex((s) => s.id === step);

    const goals = useMemo(() => {
        if (!audience) return [];
        return getGoalsForAudience(audience, hasConnectedAccount);
    }, [audience, hasConnectedAccount]);

    function goToStep(next: OnboardingStep) {
        setSearchParams({ step: next }, { replace: true });
    }

    function handleSelectAudience(id: ProductAudience) {
        if (!userId) return;
        setAudience(id);
        saveOnboardingAudience(userId, id);
        goToStep('accounts');
    }

    function handleFinishOnboarding() {
        if (!userId) return;
        completeOnboarding(userId);
        navigate('/campanhas', {
            replace: true,
            state: { openObjective: true, audience },
        });
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
                    Em poucos passos você escolhe seu perfil, conecta as contas que já tem e vê as metas iniciais.
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
                                        audience === option.id && 'border-primary-400 ring-1 ring-primary-300',
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
                        <SocialConnectList
                            variant="onboarding"
                            onBeforeConnect={setOAuthReturnToOnboarding}
                        />
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

                {step === 'goals' && audience && (
                    <section aria-labelledby="goals-heading">
                        <h2 id="goals-heading" className="text-xl font-black app-text mb-2" style={{ lineHeight: 1.1 }}>
                            Suas primeiras metas
                        </h2>
                        <p className="text-sm app-text-muted mb-6">
                            Metas sugeridas para{' '}
                            <span className="font-semibold app-text-secondary">
                                {AUDIENCE_OPTIONS.find((a) => a.id === audience)?.title}
                            </span>
                            . Vamos acompanhá-las no dashboard.
                        </p>
                        <ul className="space-y-3 mb-8">
                            {goals.map((goal, index) => {
                                const done = goal.id === 'connect' && hasConnectedAccount;
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
                        <div className="app-panel rounded-[30px] p-6 border border-primary-300/60 dark:border-primary-700/60">
                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-full bg-primary-400 flex items-center justify-center shrink-0">
                                    <Target className="text-primary-900" size={22} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-black app-text" style={{ lineHeight: 1.1 }}>
                                        Próximo passo: definir seu objetivo
                                    </h3>
                                    <p className="text-sm app-text-secondary mt-2 leading-relaxed">
                                        Diga o que quer alcançar — abrir agenda, lançar produto, crescer sem aparecer — e
                                        geramos posts para os canais conectados.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleFinishOnboarding}
                                        className="mt-5 py-3 px-8 bg-primary-400 hover:scale-105 active:scale-95 text-primary-900 font-semibold rounded-full text-sm transition-all duration-150 inline-flex items-center gap-2"
                                    >
                                        Definir meu objetivo
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => goToStep('accounts')}
                            className="mt-6 py-2 text-sm font-semibold app-text-soft hover:underline"
                        >
                            Voltar para contas
                        </button>
                    </section>
                )}

                {step !== 'audience' && !audience && (
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
