import { type ChatMessage } from '../../types';

interface ChatMessageProps {
    message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageProps) {
    const isUser = message.role === 'user';

    if (isUser) {
        return (
            <div className="mx-auto grid w-full max-w-[44rem] auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 px-2 [&>*]:col-start-2">
                <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-slate-800 break-words dark:bg-slate-800 dark:text-slate-200">
                    {message.content}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-[44rem] px-2 text-sm leading-relaxed text-slate-800 break-words dark:text-slate-200">
            {message.content}
        </div>
    );
}
