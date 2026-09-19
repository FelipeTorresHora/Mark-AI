import { describe, it, expect, vi, afterEach } from 'vitest';
import { isDatetimeLocalInPast } from '../schedule';

describe('isDatetimeLocalInPast', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns false for empty value', () => {
        expect(isDatetimeLocalInPast('')).toBe(false);
    });

    it('detects past datetime', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-19T12:00:00'));
        expect(isDatetimeLocalInPast('2026-09-19T10:00')).toBe(true);
    });

    it('detects future datetime', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-19T12:00:00'));
        expect(isDatetimeLocalInPast('2026-09-19T14:00')).toBe(false);
    });
});
