import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, X, Zap } from 'lucide-react';
import type { PostTemplate } from '../../data/postTemplates';
import { TemplateLivePreview } from './TemplateLivePreview';
import { fillTemplate, placeholderLabel } from './templateUtils';
import { cn } from '../../lib/utils';

interface Props {
    template: PostTemplate | null;
    onClose: () => void;
}

function TemplateCustomizeForm({
    template,
    onClose,
}: {
    template: PostTemplate;
    onClose: () => void;
}) {
    const navigate = useNavigate();
    const [values, setValues] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        template.placeholders.forEach((p) => {
            initial[p] = '';
        });
        return initial;
    });

    const filledBody = useMemo(
        () => fillTemplate(template.bodyTemplate, values),
        [template.bodyTemplate, values],
    );

    const pendingPlaceholders = useMemo(
        () => template.placeholders.filter((p) => !values[p]?.trim()),
        [template.placeholders, values],
    );

    const filledCount = template.placeholders.length - pendingPlaceholders.length;
    const totalFields = template.placeholders.length;
    const isValid = totalFields === 0 || pendingPlaceholders.length === 0;
    const progressPct =
        totalFields === 0 ? 100 : Math.round((filledCount / totalFields) * 100);

    function handleConfirm() {
        if (!isValid) return;
        navigate('/campanhas', { state: { topic: filledBody } });
        onClose();
    }

    return (
        <>
            <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-[rgba(14,15,12,0.45)] z-40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden
            />

            <motion.div
                key="drawer"
                role="dialog"
                aria-modal="true"
                aria-labelledby="customize-template-title"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-3xl app-panel shadow-[rgba(14,15,12,0.12)_0px_0px_0px_1px]"
            >
                <div className="flex items-start justify-between gap-4 px-6 py-5 border-b app-divider shrink-0">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#054d28] dark:text-primary-400 mb-1">
                            Passo 1 · Personalizar
                        </p>
                        <h2
                            id="customize-template-title"
                            className="text-xl font-bold app-text leading-tight tracking-tight"
                        >
                            {template.title}
                        </h2>
                        {totalFields > 0 && (
                            <p className="text-sm app-text-soft mt-1 font-semibold">
                                {filledCount} de {totalFields} campos preenchidos
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar"
                        className="p-2 rounded-full app-text-soft hover:text-[#0e0f0c] hover:bg-[rgba(14,15,12,0.06)] transition-all hover:scale-105 active:scale-95 shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>

                {totalFields > 0 && (
                    <div className="px-6 pt-3 shrink-0">
                        <div className="h-1.5 rounded-full bg-[rgba(22,51,0,0.08)] overflow-hidden">
                            <div
                                className="h-full rounded-full bg-primary-400 transition-all duration-300"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
                        {template.placeholders.length === 0 ? (
                            <p className="text-sm app-text-secondary font-medium leading-relaxed">
                                Este template não tem campos editáveis. Confira o preview ao lado e siga para
                                campanhas.
                            </p>
                        ) : (
                            <>
                                <p className="text-sm app-text-muted font-semibold">
                                    Preencha os campos — o preview atualiza na hora.
                                </p>
                                {template.placeholders.map((key) => {
                                    const done = !!values[key]?.trim();
                                    return (
                                        <div key={key}>
                                            <label
                                                htmlFor={`tpl-field-${key}`}
                                                className="flex items-center gap-2 text-xs font-semibold app-text-secondary mb-1.5"
                                            >
                                                {placeholderLabel(key)}
                                                {done && (
                                                    <span className="text-[10px] font-bold text-[#054d28] dark:text-primary-400">
                                                        OK
                                                    </span>
                                                )}
                                            </label>
                                            <input
                                                id={`tpl-field-${key}`}
                                                type="text"
                                                value={values[key] ?? ''}
                                                onChange={(e) =>
                                                    setValues((prev) => ({
                                                        ...prev,
                                                        [key]: e.target.value,
                                                    }))
                                                }
                                                placeholder={`Ex: ${placeholderLabel(key).toLowerCase()}`}
                                                className={cn(
                                                    'w-full app-input rounded-[10px] px-3 py-2.5 text-sm font-medium',
                                                    done && 'ring-1 ring-[#9fe870] dark:ring-primary-500/50',
                                                )}
                                            />
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>

                    <div className="lg:w-[min(100%,22rem)] shrink-0 border-t lg:border-t-0 lg:border-l app-divider px-6 py-5 overflow-y-auto bg-[rgba(22,51,0,0.02)] dark:bg-white/[0.02]">
                        <TemplateLivePreview
                            template={template}
                            filledBody={filledBody}
                            pendingPlaceholders={pendingPlaceholders}
                        />
                    </div>
                </div>

                <div className="px-6 py-4 border-t app-divider flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                    <p className="text-xs app-text-soft font-semibold hidden sm:block">
                        Passo 2 · Abrir em Campanhas com o texto pronto
                    </p>
                    <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-4 py-2.5 rounded-full text-sm font-semibold bg-[rgba(22,51,0,0.08)] app-text hover:scale-105 active:scale-95 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={!isValid}
                            className={cn(
                                'flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all',
                                isValid
                                    ? 'bg-primary-400 text-primary-900 hover:scale-105 active:scale-95'
                                    : 'bg-[rgba(14,15,12,0.08)] app-text-soft cursor-not-allowed',
                            )}
                        >
                            <Zap size={15} />
                            Usar na campanha
                            <ArrowRight size={15} className="opacity-80" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </>
    );
}

export function TemplateCustomizeModal({ template, onClose }: Props) {
    return (
        <AnimatePresence>
            {template && (
                <TemplateCustomizeForm key={template.id} template={template} onClose={onClose} />
            )}
        </AnimatePresence>
    );
}
