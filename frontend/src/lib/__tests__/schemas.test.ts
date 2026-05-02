import { describe, it, expect } from 'vitest';
import { BrandContextSchema, PostEditSchema, GenerateRequestSchema } from '../schemas';

describe('BrandContextSchema', () => {
    it('accepts valid data', () => {
        const result = BrandContextSchema.safeParse({
            name: 'Acme Corp',
            niche: 'Tecnologia Sustentável',
            tone: 'Profissional',
            targetAudience: 'Gestores de TI buscando otimização',
            uniqueValue: 'Solução mais barata do mercado',
        });
        expect(result.success).toBe(true);
    });

    it('rejects short name', () => {
        const result = BrandContextSchema.safeParse({
            name: 'A',
            niche: 'Tecnologia Sustentável',
            tone: 'Profissional',
            targetAudience: 'Gestores de TI buscando otimização',
            uniqueValue: 'Solução mais barata do mercado',
        });
        expect(result.success).toBe(false);
    });

    it('rejects invalid tone', () => {
        const result = BrandContextSchema.safeParse({
            name: 'Acme Corp',
            niche: 'Tecnologia Sustentável',
            tone: 'Invalido',
            targetAudience: 'Gestores de TI buscando otimização',
            uniqueValue: 'Solução mais barata do mercado',
        });
        expect(result.success).toBe(false);
    });
});

describe('PostEditSchema', () => {
    it('accepts valid content', () => {
        const result = PostEditSchema.safeParse({ content: 'Post content here' });
        expect(result.success).toBe(true);
    });

    it('rejects empty content', () => {
        const result = PostEditSchema.safeParse({ content: '' });
        expect(result.success).toBe(false);
    });

    it('accepts null scheduled_at', () => {
        const result = PostEditSchema.safeParse({ content: 'Post', scheduled_at: null });
        expect(result.success).toBe(true);
    });
});

describe('GenerateRequestSchema', () => {
    it('accepts valid data', () => {
        const result = GenerateRequestSchema.safeParse({
            topic: 'Lançamento do novo produto de automação para pequenas empresas',
            brandContext: {
                name: 'Acme Corp',
                niche: 'Tecnologia Sustentável',
                tone: 'Profissional',
                targetAudience: 'Gestores de TI buscando otimização',
                uniqueValue: 'Solução mais barata do mercado',
            },
        });
        expect(result.success).toBe(true);
    });

    it('rejects short topic', () => {
        const result = GenerateRequestSchema.safeParse({
            topic: 'Curto',
            brandContext: {
                name: 'Acme Corp',
                niche: 'Tecnologia Sustentável',
                tone: 'Profissional',
                targetAudience: 'Gestores de TI buscando otimização',
                uniqueValue: 'Solução mais barata do mercado',
            },
        });
        expect(result.success).toBe(false);
    });
});
