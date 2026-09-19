import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { type ChatMessage } from '../types';

interface ChatBriefingState {
    conversationId: string | null;
    messages: ChatMessage[];
    isTyping: boolean;
    done: boolean;
}

function errorMessage(err: unknown): string {
    if (isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (typeof detail === 'string' && detail.trim()) {
            return detail;
        }
    }
    return 'Erro ao enviar mensagem. Tente novamente.';
}

export function useChatBriefing() {
    const queryClient = useQueryClient();
    const conversationIdRef = useRef<string | null>(null);
    const [state, setState] = useState<ChatBriefingState>({
        conversationId: null,
        messages: [],
        isTyping: false,
        done: false,
    });

    const sendMessage = useCallback(async (message: string) => {
        const trimmed = message.trim();
        if (!trimmed) return;

        let blocked = false;
        setState(prev => {
            if (prev.isTyping || prev.done) {
                blocked = true;
                return prev;
            }
            return {
                ...prev,
                messages: [
                    ...prev.messages,
                    {
                        role: 'user',
                        content: trimmed,
                        timestamp: new Date().toISOString(),
                    },
                ],
                isTyping: true,
            };
        });
        if (blocked) return;

        try {
            const res = await api.post<{
                conversation_id: string;
                reply: string;
                done: boolean;
            }>('/api/v1/chat/briefing', {
                message: trimmed,
                conversation_id: conversationIdRef.current,
            });

            conversationIdRef.current = res.data.conversation_id;
            const replyText = (res.data.reply || '').trim();
            if (!replyText) {
                throw new Error('empty_reply');
            }

            const assistantMsg: ChatMessage = {
                role: 'assistant',
                content: replyText,
                timestamp: new Date().toISOString(),
            };

            setState(prev => ({
                ...prev,
                conversationId: res.data.conversation_id,
                messages: [...prev.messages, assistantMsg],
                isTyping: false,
                done: res.data.done,
            }));

            if (res.data.done) {
                void queryClient.invalidateQueries({ queryKey: ['brand-profile'] });
                toast.success('Perfil da marca criado com sucesso!');
            }
        } catch (err) {
            setState(prev => ({
                ...prev,
                messages: prev.messages.filter(
                    (m, i) => !(i === prev.messages.length - 1 && m.role === 'user' && m.content === trimmed),
                ),
                isTyping: false,
            }));
            toast.error(errorMessage(err));
        }
    }, [queryClient]);

    const clearChat = useCallback(() => {
        conversationIdRef.current = null;
        setState({
            conversationId: null,
            messages: [],
            isTyping: false,
            done: false,
        });
    }, []);

    return {
        messages: state.messages,
        isTyping: state.isTyping,
        done: state.done,
        sendMessage,
        clearChat,
    };
}
