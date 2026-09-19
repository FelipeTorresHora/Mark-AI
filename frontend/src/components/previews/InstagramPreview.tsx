import { useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import { cn } from '../../lib/utils';

interface InstagramPreviewProps {
    content: string;
    author?: string;
    editable?: boolean;
    onContentChange?: (value: string) => void;
}

export function InstagramPreview({
    content,
    author = 'markai',
    editable,
    onContentChange,
}: InstagramPreviewProps) {
    const [expanded, setExpanded] = useState(false);
    const shouldTruncate = content.length > 220 && !editable;

    return (
        <div
            className={cn(
                'border rounded-xl bg-white dark:bg-slate-900 dark:border-slate-700 max-w-sm shadow-sm overflow-hidden',
                editable && 'ring-2 ring-primary-300',
            )}
        >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[2px]">
                    <div className="h-full w-full rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold uppercase text-slate-700 dark:text-slate-200">
                        {author?.[0]}
                    </div>
                </div>
                <span className="text-sm font-semibold app-text">{author}</span>
            </div>

            <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                <span className="text-xs app-text-soft px-4 text-center">
                    Prévia visual — imagem definida na publicação
                </span>
            </div>

            <div className="px-3 py-2 flex items-center gap-4 text-slate-800 dark:text-slate-100">
                <Heart size={22} className="stroke-[1.5]" />
                <MessageCircle size={22} className="stroke-[1.5]" />
                <Send size={22} className="stroke-[1.5]" />
                <Bookmark size={22} className="ml-auto stroke-[1.5]" />
            </div>

            <div className="px-3 pb-3">
                {editable ? (
                    <textarea
                        value={content}
                        onChange={(e) => onContentChange?.(e.target.value)}
                        autoFocus
                        className="text-sm app-text w-full resize-none focus:outline-none bg-slate-50 dark:bg-slate-800 rounded-lg p-2 min-h-[100px] border border-slate-200 dark:border-slate-600 focus:border-primary-400 transition-colors leading-relaxed"
                        placeholder="Escreva a legenda..."
                    />
                ) : (
                    <>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            <span className="font-semibold mr-1">{author}</span>
                            {expanded ? content : content.slice(0, 220)}
                            {shouldTruncate && !expanded && <span className="app-text-soft">...</span>}
                        </p>
                        {shouldTruncate && !expanded && (
                            <button
                                type="button"
                                onClick={() => setExpanded(true)}
                                className="text-xs app-text-soft mt-1"
                            >
                                mais
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
