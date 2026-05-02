import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { XAccountStatus } from '../types';

export function useXIntegrationStatus() {
    return useQuery<XAccountStatus>({
        queryKey: ['x-integration-status'],
        queryFn: () => api.get('/api/v1/integrations/x/status').then((r) => r.data),
    });
}

export function useStartXConnect() {
    return useMutation({
        mutationFn: async () => {
            const response = await api.get('/api/v1/integrations/x/connect-url');
            return response.data as { authorization_url: string };
        },
    });
}

export function useDisconnectX() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => api.post('/api/v1/integrations/x/disconnect'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['x-integration-status'] });
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        },
    });
}
