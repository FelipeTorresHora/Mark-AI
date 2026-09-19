import { describe, it, expect, beforeEach } from 'vitest';
import {
    completeOnboarding,
    flushPendingAudienceForUser,
    getGoalsForAudience,
    getOnboardingState,
    getPendingAudience,
    isOnboardingComplete,
    MIN_PRIMARY_OBJECTIVE_LENGTH,
    productAudienceFromApi,
    productAudienceToApi,
    resolveOnboardingAudience,
    saveOnboardingAudience,
    setPendingAudience,
} from '../onboarding';

describe('onboarding storage', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('tracks audience and completion per user', () => {
        saveOnboardingAudience('user-1', 'founder');
        expect(getOnboardingState('user-1').audience).toBe('founder');
        expect(isOnboardingComplete('user-1')).toBe(false);

        completeOnboarding('user-1');
        expect(isOnboardingComplete('user-1')).toBe(true);
    });

    it('returns audience-specific goals', () => {
        const goals = getGoalsForAudience('faceless', false);
        expect(goals.some((g) => g.label.includes('faceless'))).toBe(true);
        expect(goals.some((g) => g.id === 'objective')).toBe(true);
        expect(goals.some((g) => g.label.toLowerCase().includes('campanha'))).toBe(false);
    });

    it('maps product audience to API enum', () => {
        expect(productAudienceToApi('mei')).toBe('mei_loja_liberal');
        expect(productAudienceFromApi('mei_loja_liberal')).toBe('mei');
    });

    it('keeps pending audience until user id is known', () => {
        setPendingAudience('founder');
        expect(resolveOnboardingAudience(undefined, null)).toBe('founder');
        expect(getPendingAudience()).toBe('founder');

        const flushed = flushPendingAudienceForUser('user-2');
        expect(flushed).toBe('founder');
        expect(getOnboardingState('user-2').audience).toBe('founder');
        expect(getPendingAudience()).toBeNull();
    });

    it('requires minimum length for primary objective', () => {
        expect(MIN_PRIMARY_OBJECTIVE_LENGTH).toBeGreaterThanOrEqual(20);
    });
});
