import type { AudienceType } from '../data/goalsCopy';
import type { ProductAudience } from './onboarding';

export function mapProductAudienceToApi(audience: ProductAudience): AudienceType {
    if (audience === 'mei') return 'mei_loja_liberal';
    return audience;
}
