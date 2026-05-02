import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { type ChatMessage } from '../types';

interface ChatBriefingState {
    conversationId: string | null;
    messages: ChatMessage[];
    isTyping: boolean;
    done: boolean;
}

export function useChatBriefing() {
    const [state, setState] = useState<ChatBriefingState>({
        conversationId: null,
        messages: [],
        isTyping: false,
        done: false,
    });

    const sendMessage = useCallback(async (message: string) => {
        if (!message.trim() || state.isTyping) return;

        // Optimistic user message
        const userMsg: ChatMessage = {
            role: 'user',
            content: message.trim(),
            timestamp: new Date().toISOString(),
        };

        setState(prev => ({
            ...prev,
            messages: [...prev.messages, userMsg],
            isTyping: true,
        }));

        try {
            const res = await api.post('/api/v1/chat/briefing', {
                message: message.trim(),
                conversation_id: state.conversationId,
            });

            const assistantMsg: ChatMessage = {
                role: 'assistant',
                content: res.data.reply,
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
                toast.success('Perfil da marca criado com sucesso! 🎉');
            }
        } catch {
            setState(prev => ({
                ...prev,
                isTyping: false,
            }));
            toast.error('Erro ao enviar mensagem. Tente novamente.');
        }
    }, [state.conversationId, state.isTyping]);

    const clearChat = useCallback(() => {
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
