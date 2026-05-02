import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { type Post, type PostStatus, type PaginatedResponse } from '../types';

export function usePosts(status?: PostStatus, campaignId?: string, page = 0, limit = 20) {
    return useQuery({
        queryKey: ['posts', { status, campaignId, page, limit }],
        queryFn: async (): Promise<PaginatedResponse<Post>> => {
            const params = new URLSearchParams();
            if (status) params.set('status', status);
            if (campaignId) params.set('campaign_id', campaignId);
            params.set('skip', String(page * limit));
            params.set('limit', String(limit));
            const res = await api.get(`/api/v1/posts?${params}`);
            return res.data;
        },
    });
}

export function useConversations() {
    return useQuery({
        queryKey: ['conversations'],
        queryFn: async () => {
            const res = await api.get('/api/v1/conversations');
            return res.data;
        },
    });
}
