import { ArrowRight } from 'lucide-react';
import type { PostTemplate } from '../../data/postTemplates';
import { PlatformBadge } from './PlatformBadge';
import { placeholderLabel, templateTeaser } from './templateUtils';
import { cn } from '../../lib/utils';

interface TemplateCardProps {
    template: PostTemplate;
    onSelect: (id: string) => void;
    className?: string;
}

export function TemplateCard({ template, onSelect, className }: TemplateCardProps) {
    const filledCount = template.placeholders.length;

    return (
        <button
            type="button"
            onClick={() => onSelect(template.id)}
            className={cn(
                'group text-left flex flex-col app-panel rounded-[30px] p-5 w-full',
                'ring-1 ring-[rgba(14,15,12,0.12)] hover:ring-[#9fe870] dark:hover:ring-primary-500/50',
                'transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400',
                className,
            )}
        >
            <div className="flex items-start justify-between gap-2 mb-3">
                <PlatformBadge platform={template.platform} />
                {filledCount > 0 && (
                    <span className="text-[11px] font-semibold app-text-soft shrink-0">
                        {filledCount} {filledCount === 1 ? 'campo' : 'campos'}
                    </span>
                )}
            </div>

            <h3 className="font-semibold app-text text-[1.1rem] leading-snug tracking-tight mb-1.5">
                {template.title}
            </h3>
            <p className="text-sm app-text-secondary leading-relaxed mb-3">
                {template.previewText}
            </p>

            <div className="rounded-2xl bg-[rgba(22,51,0,0.04)] dark:bg-white/5 px-3 py-2.5 mb-4 flex-1">
                <p className="text-xs app-text-muted leading-relaxed line-clamp-3 font-medium">
                    {templateTeaser(template.bodyTemplate)}
                </p>
            </div>

            {template.placeholders.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {template.placeholders.slice(0, 3).map((p) => (
                        <span
                            key={p}
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#e2f6d5]/80 dark:bg-primary-900/25 text-[#163300] dark:text-primary-300"
                        >
                            {placeholderLabel(p)}
                        </span>
                    ))}
                    {template.placeholders.length > 3 && (
                        <span className="text-[10px] app-text-soft self-center font-semibold">
                            +{template.placeholders.length - 3}
                        </span>
                    )}
                </div>
            )}

            <span
                className={cn(
                    'inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-sm font-semibold',
                    'bg-primary-400 text-primary-900',
                    'group-hover:scale-[1.02] transition-transform duration-150',
                )}
            >
                Personalizar
                <ArrowRight size={16} className="opacity-80" />
            </span>
        </button>
    );
}
