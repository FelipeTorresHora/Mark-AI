import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { isNotFoundError } from '../lib/utils';

export interface BrandProfile {
    id: string;
    name: string;
    niche: string;
    tone: string;
    target_audience: string;
    unique_value: string;
}

export function useBrandProfile() {
    return useQuery({
        queryKey: ['brand-profile'],
        queryFn: async (): Promise<BrandProfile> => {
            const res = await api.get('/api/v1/brand-profile');
            return res.data;
        },
        // 404 = perfil ainda não criado; outros erros = erro real
        retry: (failureCount, err) => !isNotFoundError(err) && failureCount < 2,
    });
}
