import { useRef, useEffect, useState, useCallback } from 'react';
import { useChatBriefing } from '../../hooks/useChatBriefing';
import { ChatMessageBubble } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

const QUICK_STARTS = [
    "Quero criar minha marca do zero",
    "Quero melhorar minha presença digital",
    "Preciso de uma estratégia de conteúdo",
    "Quero conectar minhas redes sociais",
];

export function ChatPanel() {
    const { messages, isTyping, done, sendMessage } = useChatBriefing();
    const [input, setInput] = useState('');
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, scrollToBottom]);

    // Track scroll position to show/hide scroll button
    const handleScroll = useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        setShowScrollBtn(distFromBottom > 120);
    }, []);

    // Auto-resize textarea
    useEffect(() => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 128) + 'px';
        }
    }, [input]);

    const handleSend = useCallback(() => {
        if (!input.trim() || isTyping) return;
        sendMessage(input);
        setInput('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    }, [input, isTyping, sendMessage]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const isEmpty = messages.length === 0;

    return (
        <div className="flex flex-col h-full">
            {/* Scrollable messages viewport */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-scroll scroll-smooth px-4 pt-4"
            >
                {/* Welcome state */}
                {isEmpty && (
                    <div className="mx-auto flex w-full max-w-[44rem] grow flex-col">
                        <div className="flex w-full grow flex-col items-center justify-center">
                            <div className="flex size-full flex-col justify-center px-4">
                                <motion.h1
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="font-semibold text-2xl app-text"
                                >
                                    Olá! Sou o CMO IA 👋
                                </motion.h1>
                                <motion.p
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: 0.07 }}
                                    className="app-text-muted text-xl mt-1"
                                >
                                    Como posso ajudar hoje?
                                </motion.p>
                            </div>
                        </div>

                        {/* Quick-start suggestions */}
                        <div className="@container w-full pb-4">
                            <div className="grid @md:grid-cols-2 gap-2">
                                {QUICK_STARTS.map((s, i) => (
                                    <motion.button
                                        key={s}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: 0.05 * i + 0.1 }}
                                        onClick={() => { setInput(s); setTimeout(() => textareaRef.current?.focus(), 0); }}
                                        className="text-left px-4 py-3 rounded-3xl app-panel text-sm app-text-secondary hover:bg-[var(--app-hover)] transition-colors"
                                    >
                                        {s}
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Messages */}
                {!isEmpty && (
                    <div className="mb-10 flex flex-col gap-y-6 empty:hidden">
                        {messages.map((msg, i) => (
                            <ChatMessageBubble key={i} message={msg} />
                        ))}

                        {isTyping && (
                            <div className="mx-auto w-full max-w-[44rem] px-2">
                                <TypingIndicator />
                            </div>
                        )}

                        {done && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                            <div className="mx-auto w-full max-w-[44rem] px-2">
                                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Perfil da marca completo! Confira nas configurações.
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div ref={messagesEndRef} />

                {/* Sticky composer footer */}
                <div className="sticky bottom-0 mx-auto mt-auto flex w-full max-w-[44rem] flex-col gap-4 pb-4 md:pb-6">
                    {/* Scroll to bottom button */}
                    {showScrollBtn && (
                        <div className="flex justify-center">
                            <button
                                onClick={scrollToBottom}
                                className="rounded-full app-panel p-3 shadow-sm hover:bg-[var(--app-hover)] transition-colors"
                                aria-label="Rolar para o fim"
                            >
                                <ArrowDown size={14} />
                            </button>
                        </div>
                    )}

                    {/* Composer card */}
                    <div className="relative flex w-full flex-col rounded-[20px] app-panel p-2.5 transition-shadow focus-within:border-[var(--app-border-strong)] focus-within:ring-2 focus-within:ring-[var(--app-focus)]">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Digite sua mensagem... (Enter para enviar)"
                            rows={1}
                            disabled={isTyping}
                            className={cn(
                                'max-h-32 min-h-10 w-full resize-none bg-transparent px-1.5 py-1 text-sm app-text outline-none placeholder:text-[var(--app-text-soft)]',
                                isTyping && 'opacity-50 cursor-not-allowed',
                            )}
                        />
                        <div className="flex items-center justify-end pt-1">
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping}
                                className="size-8 rounded-full bg-primary-400 hover:bg-primary-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-primary-900 shrink-0"
                                aria-label="Enviar mensagem"
                            >
                                <ArrowUp size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
