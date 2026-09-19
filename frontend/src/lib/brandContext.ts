import { productAudienceFromApi, type ProductAudience } from './onboarding';

export type CampaignAudience = 'mei' | 'founder' | 'faceless';

export interface BrandProfileSnapshot {
    name: string;
    niche: string;
    tone: string;
    target_audience: string;
    unique_value: string;
}

const STARTER_BY_AUDIENCE: Record<
    ProductAudience,
    Omit<BrandProfileSnapshot, 'unique_value'>
> = {
    mei: {
        name: 'Minha empresa',
        niche: 'Negócio local e serviços',
        tone: 'Profissional',
        target_audience: 'Clientes da região que buscam confiança e oferta clara',
    },
    founder: {
        name: 'Minha startup',
        niche: 'Produto digital e tração',
        tone: 'Profissional',
        target_audience: 'Early adopters, time e investidores que precisam de clareza',
    },
    faceless: {
        name: 'Minha marca',
        niche: 'Conteúdo de valor sem aparecer',
        tone: 'Profissional',
        target_audience: 'Público que acompanha o nicho, sem foco em identidade pessoal',
    },
};

export function toCampaignAudience(raw?: string | null): CampaignAudience | undefined {
    const product = productAudienceFromApi(raw);
    return product ?? undefined;
}

/** Brand context so generation can start before Empresa is filled. */
export function starterBrandContext(
    audience: string | null | undefined,
    uniqueValue: string,
): BrandProfileSnapshot {
    const key = productAudienceFromApi(audience) ?? 'mei';
    const value = uniqueValue.trim() || 'Gerar conteúdo consistente alinhado à marca';
    return {
        ...STARTER_BY_AUDIENCE[key],
        unique_value: value,
    };
}
