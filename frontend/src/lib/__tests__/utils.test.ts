import { describe, it, expect } from 'vitest';
import { cn, formatScheduledAt } from '../utils';

describe('cn()', () => {
    it('combines classes correctly', () => {
        expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
    });

    it('merges conflicting tailwind classes', () => {
        expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('handles conditional classes', () => {
        const isActive = true;
        const isInactive = false;
        const result = cn('base', isActive && 'active', isInactive && 'inactive');
        expect(result).toBe('base active');
    });
});

describe('formatScheduledAt()', () => {
    it('formats today date with time', () => {
        const today = new Date();
        today.setHours(14, 30, 0, 0);
        const result = formatScheduledAt(today.toISOString());
        expect(result).toContain('Hoje');
        expect(result).toContain('14:30');
    });

    it('formats date for non-today', () => {
        const past = new Date();
        past.setDate(past.getDate() - 5);
        past.setHours(10, 0, 0, 0);
        const result = formatScheduledAt(past.toISOString());
        expect(result).not.toContain('Hoje');
        expect(result).not.toContain('Amanhã');
        expect(result).toContain('10:00');
    });
});
