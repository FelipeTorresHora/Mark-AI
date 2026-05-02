import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { toast } from '../lib/toast';

export function usePostActions() {
    const queryClient = useQueryClient();

    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await api.patch(`/api/v1/posts/${id}`, { status: 'FINAL' });
            return response.data;
        },
        onSuccess: () => {
            toast.success('Post aprovado!');
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        },
        onError: () => toast.error('Erro ao aprovar o post.'),
    });

    const rejectMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await api.patch(`/api/v1/posts/${id}`, { status: 'REJECTED' });
            return response.data;
        },
        onSuccess: () => {
            toast.info('Post rejeitado.');
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        },
        onError: () => toast.error('Erro ao rejeitar o post.'),
    });

    return {
        approvePost: (id: string) => approveMutation.mutateAsync(id),
        rejectPost: (id: string) => rejectMutation.mutateAsync(id),
        isApproving: approveMutation.isPending,
        isRejecting: rejectMutation.isPending,
    };
}
