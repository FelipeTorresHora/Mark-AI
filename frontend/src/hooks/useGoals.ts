import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { AudienceType } from '../data/goalsCopy';

export interface GoalItem {
    key: string;
    title: string;
    description: string;
    featured: boolean;
    completed: boolean;
    completed_at: string | null;
    current: number;
    target: number;
    progress_percent: number;
}

export interface GoalsPayload {
    audience: AudienceType;
    primary_objective: string | null;
    goals: GoalItem[];
    completed_count: number;
    total_count: number;
}

export function useGoals() {
    return useQuery({
        queryKey: ['goals'],
        queryFn: async (): Promise<GoalsPayload> => {
            const res = await api.get('/api/v1/goals');
            return res.data;
        },
    });
}

export function useUpdateGoalsAudience() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (audience: AudienceType) => {
            const res = await api.patch('/api/v1/goals/audience', { audience });
            return res.data as GoalsPayload;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['goals'], data);
        },
    });
}

export function useUpdatePrimaryObjective() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (objective: string) => {
            const res = await api.patch('/api/v1/goals/objective', { objective });
            return res.data as GoalsPayload;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['goals'], data);
        },
    });
}
