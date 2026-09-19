import { describe, it, expect } from 'vitest';
import { cn, formatScheduledAt, getErrorMessage, isDatetimeLocalBeforeNow, isNotFoundError } from '../utils';

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

    it('formats tomorrow', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 15, 0, 0);
        const result = formatScheduledAt(tomorrow.toISOString());
        expect(result).toContain('Amanhã');
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

describe('getErrorMessage', () => {
    it('reads string errors', () => {
        expect(getErrorMessage('falhou')).toBe('falhou');
    });

    it('reads Error.message', () => {
        expect(getErrorMessage(new Error('boom'))).toBe('boom');
    });

    it('reads axios-style response detail', () => {
        expect(
            getErrorMessage({ response: { data: { detail: 'Não autorizado' } } }),
        ).toBe('Não autorizado');
    });

    it('uses fallback', () => {
        expect(getErrorMessage({})).toBe('Erro desconhecido');
    });
});

describe('isNotFoundError', () => {
    it('detects 404', () => {
        expect(isNotFoundError({ response: { status: 404 } })).toBe(true);
        expect(isNotFoundError({ response: { status: 500 } })).toBe(false);
    });
});

describe('isDatetimeLocalBeforeNow', () => {
    it('compares against fixed timestamp', () => {
        const now = new Date('2026-09-19T12:00:00').getTime();
        expect(isDatetimeLocalBeforeNow('2026-09-19T11:00', now)).toBe(true);
        expect(isDatetimeLocalBeforeNow('2026-09-19T13:00', now)).toBe(false);
    });
});
