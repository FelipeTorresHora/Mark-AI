import { describe, expect, it } from 'vitest';
import { starterBrandContext, toCampaignAudience } from '../brandContext';

describe('brandContext', () => {
    it('maps API audience to campaign audience', () => {
        expect(toCampaignAudience('mei_loja_liberal')).toBe('mei');
        expect(toCampaignAudience('founder')).toBe('founder');
        expect(toCampaignAudience('faceless')).toBe('faceless');
        expect(toCampaignAudience(undefined)).toBeUndefined();
    });

    it('builds a starter profile so generation can start without Empresa', () => {
        const profile = starterBrandContext(
            'mei_loja_liberal',
            'Lotar a agenda da clínica com posts locais',
        );
        expect(profile.name).toBe('Minha empresa');
        expect(profile.tone).toBe('Profissional');
        expect(profile.unique_value).toContain('agenda da clínica');
        expect(profile.target_audience.length).toBeGreaterThan(10);
    });
});
