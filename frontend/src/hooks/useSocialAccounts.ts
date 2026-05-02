import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { SocialAccount } from '../types';

export function useSocialAccounts() {
    return useQuery<SocialAccount[]>({
        queryKey: ['social-accounts'],
        queryFn: () => api.get('/api/v1/social/accounts').then((r) => r.data),
    });
}

export function useDisconnectSocial() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (platform: string) =>
            api.delete(`/api/v1/social/accounts/${platform}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
        },
    });
}

export function usePublishPost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (postId: string) =>
            api.post(`/api/v1/social/posts/${postId}/publish`).then((r) => r.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        },
    });
}

export function useStartSocialConnect() {
    return useMutation({
        mutationFn: async (platform: string) => {
            const response = await api.get(`/api/v1/social/connect/${platform.toLowerCase()}/url`);
            return response.data as { authorization_url: string };
        },
    });
}
