import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import type { Post } from '../types';

export interface PostRedoRequest {
    instruction: string;
}

export type PostRedoResponse = Post;

/** Refazer conteúdo com instrução do usuário (compatível com resume LangGraph `redo`). */
export function usePostRedo() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async ({ postId, instruction }: { postId: string; instruction: string }) => {
            const response = await api.post<PostRedoResponse>(
                `/api/v1/posts/${postId}/redo`,
                { instruction: instruction.trim() } satisfies PostRedoRequest,
            );
            return response.data;
        },
        onSuccess: () => {
            toast.success('Conteúdo refeito com sua instrução.');
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        },
        onError: () => toast.error('Erro ao refazer o post. Tente novamente.'),
    });

    return {
        redoPost: (postId: string, instruction: string) =>
            mutation.mutateAsync({ postId, instruction }),
        isRedoing: mutation.isPending,
    };
}
