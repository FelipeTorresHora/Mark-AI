import { z } from 'zod';

export const BrandContextSchema = z.object({
    name: z.string().min(2, 'O nome da marca deve ter pelo menos 2 caracteres'),
    niche: z.string().min(5, 'O nicho deve ter pelo menos 5 caracteres'),
    tone: z.enum(['Autêntico', 'Profissional', 'Descolado', 'Inspirador']),
    targetAudience: z.string().min(10, 'Descreva o público alvo com pelo menos 10 caracteres'),
    uniqueValue: z.string().min(15, 'A proposta de valor deve ter pelo menos 15 caracteres'),
});

export type BrandContextFormData = z.infer<typeof BrandContextSchema>;

export const GenerateRequestSchema = z.object({
    topic: z.string().min(20, 'O tópico deve ser descrito com pelo menos 20 caracteres'),
    conversationId: z.uuid().optional(),
    brandContext: BrandContextSchema,
});

export type GenerateRequestFormData = z.infer<typeof GenerateRequestSchema>;

export const PostEditSchema = z.object({
    content: z.string().min(1, 'O conteúdo não pode estar vazio'),
    scheduled_at: z.string().nullable().optional().refine((value) => {
        if (!value) return true;
        return new Date(value).getTime() > Date.now();
    }, 'O agendamento deve ser no futuro'),
});

export type PostEditFormData = z.infer<typeof PostEditSchema>;
