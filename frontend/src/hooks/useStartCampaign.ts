import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import type { BrandProfileSnapshot, CampaignAudience } from '../lib/brandContext';
import type { PostsPerPlatform } from '../types';

export type { BrandProfileSnapshot } from '../lib/brandContext';

export interface StartCampaignInput {
    /** Campaign-specific focus (maps to API `topic`). */
    campaignFocus: string;
    /** Strategic brand objective saved during onboarding (maps to API `objective`). */
    brandObjective?: string;
    audience?: CampaignAudience;
    brandContext: BrandProfileSnapshot;
    postsPerPlatform: PostsPerPlatform;
}

export interface StartCampaignResponse {
    campaign_id: string;
    post_ids: string[];
}

/** Starts generation; maps user-facing objective to API `topic`. */
export function useStartCampaign() {
    const navigate = useNavigate();

    const mutation = useMutation({
        mutationFn: async (input: StartCampaignInput): Promise<StartCampaignResponse> => {
            const res = await api.post('/api/v1/generate', {
                topic: input.campaignFocus.trim(),
                objective: input.brandObjective?.trim() || undefined,
                audience: input.audience,
                brand_context: {
                    name: input.brandContext.name,
                    niche: input.brandContext.niche,
                    tone: input.brandContext.tone,
                    target_audience: input.brandContext.target_audience,
                    unique_value: input.brandContext.unique_value,
                },
                posts_per_platform: input.postsPerPlatform,
            });
            return res.data;
        },
        onSuccess: (response) => {
            navigate(`/campanhas/${response.campaign_id}/gerando`);
        },
        onError: () => toast.error('Erro ao iniciar geração. Tente novamente.'),
    });

    return {
        startCampaign: mutation.mutate,
        startCampaignAsync: mutation.mutateAsync,
        isStarting: mutation.isPending,
    };
}
