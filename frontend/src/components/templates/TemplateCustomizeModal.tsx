import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Zap, Eye } from 'lucide-react';
import type { PostTemplate } from '../../data/postTemplates';
import { cn } from '../../lib/utils';

interface Props {
    template: PostTemplate | null;
    onClose: () => void;
}

function placeholderLabel(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fillTemplate(body: string, values: Record<string, string>): string {
    return body.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? `{{${key}}}`);
}

export function TemplateCustomizeModal({ template, onClose }: Props) {
    const navigate = useNavigate();
    const [values, setValues] = useState<Record<string, string>>({});

    // Reset values when template changes
    useEffect(() => {
        if (template) {
            const initial: Record<string, string> = {};
            template.placeholders.forEach((p) => { initial[p] = ''; });
            setValues(initial);
        }
    }, [template]);

    const filledBody = useMemo(
        () => (template ? fillTemplate(template.bodyTemplate, values) : ''),
        [template, values],
    );

    const isValid = useMemo(
        () => template?.placeholders.every((p) => values[p]?.trim().length > 0) ?? false,
        [template, values],
    );

    function handleConfirm() {
        if (!isValid || !template) return;
        navigate('/campanhas', { state: { topic: filledBody } });
        onClose();
    }

    return (
        <AnimatePresence>
            {template && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Drawer */}
                    <motion.div
                        key="drawer"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                        className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-2xl app-panel shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b app-divider shrink-0">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-0.5">
                                    Personalizar Template
                                </p>
                                <h2 className="text-lg font-bold app-text leading-tight">
                                    {template.title}
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg app-text-soft hover:text-slate-600 dark:hover:text-slate-300 hover:bg-[var(--app-hover)] transition-colors shrink-0"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
                            {/* Left: inputs */}
                            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
                                <p className="text-sm app-text-muted">
                                    Preencha os campos abaixo para personalizar o template.
                                </p>

                                {template.placeholders.map((key) => (
                                    <div key={key}>
                                        <label className="block text-xs font-semibold app-text-muted mb-1.5 uppercase tracking-wide">
                                            {placeholderLabel(key)}
                                        </label>
                                        <input
                                            type="text"
                                            value={values[key] ?? ''}
                                            onChange={(e) =>
                                                setValues((prev) => ({ ...prev, [key]: e.target.value }))
                                            }
                                            placeholder={`ex: ${placeholderLabel(key).toLowerCase()}`}
                                            className={cn(
                                                'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
                                                'bg-[var(--app-panel)] text-[var(--app-text-secondary)]',
                                                'placeholder:text-[var(--app-text-soft)]',
                                                values[key]?.trim()
                                                    ? 'border-emerald-400 dark:border-emerald-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                                                    : 'border-slate-300 dark:border-slate-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
                                            )}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Right: live preview */}
                            <div className="lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l app-divider flex flex-col overflow-hidden">
                                <div className="px-4 py-3 border-b app-divider flex items-center gap-2 shrink-0">
                                    <Eye size={14} className="app-text-soft" />
                                    <span className="text-xs font-semibold app-text-muted uppercase tracking-wide">
                                        Preview
                                    </span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4">
                                    <div className="rounded-xl app-panel-subtle p-4">
                                        <p className="text-sm app-text-secondary whitespace-pre-wrap leading-relaxed">
                                            {filledBody || (
                                                <span className="app-text-soft italic">
                                                    O texto aparece aqui conforme você preenche os campos.
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t app-divider flex items-center justify-between gap-3 shrink-0 app-panel">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm font-medium app-text-secondary hover:bg-[var(--app-hover)] transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!isValid}
                                className={cn(
                                    'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all',
                                    isValid
                                        ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed',
                                )}
                            >
                                <Zap size={15} />
                                Gerar com este Template
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
