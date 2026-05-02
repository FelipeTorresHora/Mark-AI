import { useState, type PropsWithChildren } from 'react';
import { cn } from '../../lib/utils';
import { Globe2 } from 'lucide-react';

interface AvatarProps extends PropsWithChildren {
    className?: string;
}

const AvatarC = ({ children, className }: AvatarProps) => (
    <div className={cn('inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full bg-slate-100', className)}>
        {children}
    </div>
);

const AvatarFallbackC = ({ children, className }: AvatarProps) => (
    <span className={cn('flex h-full w-full items-center justify-center font-medium', className)}>
        {children}
    </span>
);

interface LinkedInPreviewProps {
    content: string;
    author?: string;
    editable?: boolean;
    onContentChange?: (value: string) => void;
}

export function LinkedInPreview({ content, author = 'MarkAI', editable, onContentChange }: LinkedInPreviewProps) {
    const [expanded, setExpanded] = useState(false);
    const shouldTruncate = content.length > 300 && !editable;

    return (
        <div className={cn('border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 max-w-2xl shadow-sm', editable && 'ring-2 ring-primary-300')}>
            <div className="p-4 flex gap-3">
                <AvatarC className="h-12 w-12">
                    <AvatarFallbackC className="bg-[#0a66c2] text-white font-bold text-lg">
                        {author?.[0]}
                    </AvatarFallbackC>
                </AvatarC>
                <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{author}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">500+ conexões <span className="text-[10px]">•</span> 1 min <span className="text-[10px]">•</span> <Globe2 size={12} /></p>
                </div>
            </div>
            <div className="px-4 pb-4">
                {editable ? (
                    <textarea
                        value={content}
                        onChange={e => onContentChange?.(e.target.value)}
                        autoFocus
                        className="text-sm text-slate-800 dark:text-slate-100 w-full resize-none focus:outline-none bg-slate-50 dark:bg-slate-700 dark:border-slate-600 rounded-lg p-2 min-h-[150px] border border-slate-200 focus:border-primary-400 transition-colors leading-relaxed"
                        placeholder="Escreva o conteúdo do post..."
                    />
                ) : (
                    <>
                        <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                            {expanded ? content : content.slice(0, 300)}
                            {shouldTruncate && !expanded && <span className="text-slate-500">...</span>}
                        </p>
                        {shouldTruncate && !expanded && (
                            <button
                                onClick={() => setExpanded(true)}
                                className="text-slate-500 font-semibold hover:text-[#0a66c2] text-sm mt-1 transition-colors"
                            >
                                ver mais
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
