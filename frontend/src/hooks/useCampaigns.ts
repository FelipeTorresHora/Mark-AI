import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { type CampaignSummary, type CampaignDetail, type PaginatedResponse } from '../types';

export function useCampaigns(page = 0, limit = 20) {
    return useQuery({
        queryKey: ['campaigns', page, limit],
        queryFn: async (): Promise<PaginatedResponse<CampaignSummary>> => {
            const skip = page * limit;
            const res = await api.get(`/api/v1/campaigns?skip=${skip}&limit=${limit}`);
            return res.data;
        },
    });
}

export function useCampaign(campaignId: string) {
    return useQuery({
        queryKey: ['campaigns', campaignId],
        queryFn: async (): Promise<CampaignDetail> => {
            const res = await api.get(`/api/v1/campaigns/${campaignId}`);
            return res.data;
        },
        enabled: !!campaignId,
    });
}

export function useDeleteCampaign() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (campaignId: string) => {
            await api.delete(`/api/v1/campaigns/${campaignId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        },
    });
}
