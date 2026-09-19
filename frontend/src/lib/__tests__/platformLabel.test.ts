import { describe, it, expect } from 'vitest';
import { platformLabel } from '../platformLabel';

describe('platformLabel', () => {
    it('labels X', () => {
        expect(platformLabel('X')).toBe('Twitter / X');
    });

    it('labels Instagram', () => {
        expect(platformLabel('INSTAGRAM')).toBe('Instagram');
    });

    it('defaults to LinkedIn', () => {
        expect(platformLabel('LINKEDIN')).toBe('LinkedIn');
    });
});
