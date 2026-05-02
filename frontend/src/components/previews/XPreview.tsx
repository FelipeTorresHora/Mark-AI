import type { PropsWithChildren } from 'react';
import { cn } from '../../lib/utils';

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


interface XPreviewProps {
    content: string;
    author?: string;
    editable?: boolean;
    onContentChange?: (value: string) => void;
}

export function XPreview({ content, author = 'MarkAI', editable, onContentChange }: XPreviewProps) {
    const charCount = content.length;
    const isOver = charCount > 280;

    return (
        <div className={cn('border rounded-2xl p-4 bg-white dark:bg-slate-800 dark:border-slate-700 max-w-xl shadow-sm', editable && 'ring-2 ring-primary-300')}>
            <div className="flex gap-2 mb-3">
                <AvatarC className="h-10 w-10">
                    <AvatarFallbackC className="bg-slate-800 text-white font-bold">{author?.[0]}</AvatarFallbackC>
                </AvatarC>
                <div>
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{author}</p>
                    <p className="text-xs text-slate-500">@markai · agora</p>
                </div>
            </div>
            {editable ? (
                <textarea
                    value={content}
                    onChange={e => onContentChange?.(e.target.value)}
                    autoFocus
                    className="text-sm text-slate-800 dark:text-slate-100 w-full resize-none focus:outline-none bg-slate-50 dark:bg-slate-700 dark:border-slate-600 rounded-lg p-2 mb-3 min-h-[80px] border border-slate-200 focus:border-primary-400 transition-colors"
                    placeholder="Escreva o conteúdo do post..."
                />
            ) : (
                <p className="text-sm whitespace-pre-wrap mb-3 text-slate-800 dark:text-slate-100">{content}</p>
            )}
            <div className="flex justify-between items-center text-xs">
                <span className="text-indigo-500 hover:underline cursor-pointer">Traduzir post</span>
                <span className={cn('font-medium', isOver ? 'text-red-500' : 'text-slate-400')}>
                    {charCount}/280
                </span>
            </div>
        </div>
    );
}
