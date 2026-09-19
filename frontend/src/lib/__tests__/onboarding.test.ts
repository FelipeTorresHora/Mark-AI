import { describe, it, expect, beforeEach } from 'vitest';
import {
    completeOnboarding,
    getGoalsForAudience,
    getOnboardingState,
    isOnboardingComplete,
    MIN_PRIMARY_OBJECTIVE_LENGTH,
    saveOnboardingAudience,
} from '../onboarding';

describe('onboarding storage', () => {
    beforeEach(() => {
        localStorage.clear();
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
    });

    it('requires minimum length for primary objective', () => {
        expect(MIN_PRIMARY_OBJECTIVE_LENGTH).toBeGreaterThanOrEqual(20);
    });
});
