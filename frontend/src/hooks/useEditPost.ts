import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { toast } from '../lib/toast';

interface EditPostPayload {
    id: string;
    content?: string;
    scheduled_at?: string | null;
}

export function useEditPost() {
    const queryClient = useQueryClient();

    const editMutation = useMutation({
        mutationFn: async ({ id, content, scheduled_at }: EditPostPayload) => {
            const response = await api.patch(`/api/v1/posts/${id}`, { content, scheduled_at });
            return response.data;
        },
        onSuccess: () => {
            toast.success('Post atualizado!');
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        },
        onError: () => toast.error('Erro ao atualizar o post.'),
    });

    return {
        editPost: (payload: EditPostPayload) => editMutation.mutateAsync(payload),
        isEditing: editMutation.isPending,
    };
}
