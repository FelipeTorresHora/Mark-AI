import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { getErrorMessage } from '../lib/utils';

interface XPostPayload {
    content: string;
}

interface XSchedulePayload extends XPostPayload {
    scheduled_at: string;
}

export function usePublishXPost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: XPostPayload) =>
            api.post('/api/v1/x-posts/publish', payload).then((r) => r.data),
        onSuccess: () => {
            toast.success('Post publicado no X.');
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err, 'Erro ao publicar no X.')),
    });
}

export function useScheduleXPost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: XSchedulePayload) =>
            api.post('/api/v1/x-posts/schedule', payload).then((r) => r.data),
        onSuccess: () => {
            toast.success('Post agendado.');
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err, 'Erro ao agendar post.')),
    });
}

export function useCancelXPost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (postId: string) =>
            api.post(`/api/v1/x-posts/${postId}/cancel`).then((r) => r.data),
        onSuccess: () => {
            toast.info('Agendamento cancelado.');
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err, 'Erro ao cancelar post.')),
    });
}
