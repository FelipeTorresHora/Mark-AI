import { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import {
    MIN_PRIMARY_OBJECTIVE_LENGTH,
    PRIMARY_OBJECTIVE_EXAMPLES,
    type ProductAudience,
} from '../../lib/onboarding';
import { cn } from '../../lib/utils';

interface OnboardingObjectiveStepProps {
    audience: ProductAudience;
    initialValue?: string;
    isSaving: boolean;
    onBack: () => void;
    onSave: (objective: string) => void;
}

export function OnboardingObjectiveStep({
    audience,
    initialValue = '',
    isSaving,
    onBack,
    onSave,
}: OnboardingObjectiveStepProps) {
    const [objective, setObjective] = useState(initialValue);
    const trimmed = objective.trim();
    const canSave = trimmed.length >= MIN_PRIMARY_OBJECTIVE_LENGTH && !isSaving;
    const examples = PRIMARY_OBJECTIVE_EXAMPLES[audience];

    return (
        <section aria-labelledby="objective-heading">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#163300] bg-[#e2f6d5] px-3 py-1 rounded-full mb-4">
                <Sparkles size={14} aria-hidden />
                Meta principal
            </p>
            <h2 id="objective-heading" className="text-xl font-black app-text mb-2" style={{ lineHeight: 1.1 }}>
                Qual resultado você quer com o Mark?
            </h2>
            <p className="text-sm app-text-muted mb-6 leading-relaxed">
                Isso é seu <span className="font-semibold app-text-secondary">objetivo de marca</span> — diferente do
                tópico de cada campanha. Usamos essa meta para sugerir conteúdo e marcar o hábito &quot;Definir o
                objetivo&quot;.
            </p>

            <label htmlFor="onboarding-primary-objective" className="block text-sm font-semibold app-text-secondary mb-2">
                Seu objetivo
            </label>
            <textarea
                id="onboarding-primary-objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={5}
                className="app-input resize-none text-base w-full"
                placeholder="Ex.: Abrir agenda da clínica com posts que gerem confiança local..."
                disabled={isSaving}
            />

            <div className="flex flex-wrap gap-2 mt-4">
                {examples.map((example) => (
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

            <p
                className={cn(
                    'text-xs mt-4',
                    trimmed.length < MIN_PRIMARY_OBJECTIVE_LENGTH ? 'app-text-soft' : 'text-emerald-600 dark:text-emerald-400',
                )}
            >
                {trimmed.length}/{MIN_PRIMARY_OBJECTIVE_LENGTH} caracteres mínimos
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={isSaving}
                    className="py-2.5 px-5 rounded-full text-sm font-semibold app-text-secondary hover:bg-primary-50 dark:hover:bg-white/5 transition-all"
                >
                    Voltar
                </button>
                <button
                    type="button"
                    onClick={() => onSave(trimmed)}
                    disabled={!canSave}
                    className="py-2.5 px-6 bg-primary-400 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 text-primary-900 font-semibold rounded-full text-sm transition-all duration-150 flex items-center gap-2 ml-auto"
                >
                    {isSaving ? 'Salvando...' : 'Salvar e continuar'}
                    <ArrowRight size={16} />
                </button>
            </div>
        </section>
    );
}
