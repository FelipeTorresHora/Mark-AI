import type { PostTemplate } from '../../data/postTemplates';
import { formatPlatformLabel } from './templateUtils';
import { cn } from '../../lib/utils';

interface TemplateLivePreviewProps {
    template: PostTemplate;
    filledBody: string;
    pendingPlaceholders: readonly string[];
}

function PreviewSegment({ text }: { text: string }) {
    const parts = text.split(/(\{\{\w+\}\})/g);
    return (
        <>
            {parts.map((part, i) => {
                const match = part.match(/^\{\{(\w+)\}\}$/);
                if (match) {
                    return (
                        <mark
                            key={`${match[1]}-${i}`}
                            className="rounded px-1 py-0.5 bg-[#ffd11a]/35 text-[#0e0f0c] font-semibold not-italic"
                        >
                            {`{{${match[1]}}}`}
                        </mark>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </>
    );
}

export function TemplateLivePreview({
    template,
    filledBody,
    pendingPlaceholders,
}: TemplateLivePreviewProps) {
    const display = filledBody.trim();

    return (
        <div className="flex flex-col h-full min-h-[220px]">
            <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider app-text-soft">
                    Preview do post
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#e2f6d5] text-[#163300] dark:bg-primary-900/30 dark:text-primary-300">
                    {formatPlatformLabel(template.platform)}
                </span>
            </div>

            <div
                className={cn(
                    'flex-1 rounded-[24px] p-4 ring-1 ring-[rgba(14,15,12,0.12)]',
                    'bg-white dark:bg-[rgba(255,255,255,0.04)]',
                )}
            >
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[rgba(14,15,12,0.08)]">
                    <div className="w-9 h-9 rounded-full bg-[#e2f6d5] dark:bg-primary-800/40 shrink-0" />
                    <div>
                        <p className="text-xs font-semibold app-text">Sua marca</p>
                        <p className="text-[10px] app-text-soft">Agora · {formatPlatformLabel(template.platform)}</p>
                    </div>
                </div>
                <p className="text-sm app-text-secondary whitespace-pre-wrap leading-relaxed">
                    {display ? (
                        <PreviewSegment text={display} />
                    ) : (
                        <span className="app-text-soft italic font-normal">
                            O texto aparece aqui conforme você preenche os campos à esquerda.
                        </span>
                    )}
                </p>
            </div>

            {pendingPlaceholders.length > 0 && (
                <p className="text-xs app-text-soft mt-3 font-semibold">
                    Faltam {pendingPlaceholders.length}{' '}
                    {pendingPlaceholders.length === 1 ? 'campo' : 'campos'} para continuar.
                </p>
            )}
        </div>
    );
}
