import type { LucideIcon } from 'lucide-react';
import { Rocket, Star, BookOpen } from 'lucide-react';

export type TemplateCategory = 'launch' | 'testimonial' | 'educational';

export interface PostTemplate {
    readonly id: string;
    readonly category: TemplateCategory;
    readonly title: string;
    readonly previewText: string;
    readonly bodyTemplate: string;
    readonly platform: 'X' | 'LINKEDIN' | 'AMBOS';
    readonly placeholders: readonly string[];
}

export interface TemplateCategoryMeta {
    readonly id: TemplateCategory;
    readonly label: string;
    readonly description: string;
    readonly icon: LucideIcon;
    readonly count: number;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function extractPlaceholders(body: string): readonly string[] {
    const matches = [...body.matchAll(/\{\{(\w+)\}\}/g)];
    return [...new Set(matches.map((m) => m[1]))];
}

function t(
    id: string,
    category: TemplateCategory,
    title: string,
    previewText: string,
    bodyTemplate: string,
    platform: PostTemplate['platform'],
): PostTemplate {
    return Object.freeze({
        id,
        category,
        title,
        previewText,
        bodyTemplate,
        platform,
        placeholders: extractPlaceholders(bodyTemplate),
    });
}

// ─── mock data ───────────────────────────────────────────────────────────────

export const POST_TEMPLATES: readonly PostTemplate[] = Object.freeze([

    // ── Lançamento de Produto (5) ────────────────────────────────────────────

    t(
        'launch-01',
        'launch',
        'Anúncio de Lançamento',
        'Post direto anunciando o lançamento com benefício principal e CTA.',
        `Apresentamos {{nome_produto}}! 🚀\n\n{{beneficio_principal}} — pensado para {{publico_alvo}}.\n\nEstamos no ar. Conheça agora: {{link_ou_cta}}`,
        'AMBOS',
    ),

    t(
        'launch-02',
        'launch',
        'Lançamento com Problema-Solução',
        'Enquadra a dor do público e posiciona o produto como solução direta.',
        `Cansado de {{problema_do_cliente}}?\n\n{{nome_produto}} resolve isso.\n\n✅ {{beneficio_1}}\n✅ {{beneficio_2}}\n✅ {{beneficio_3}}\n\nSaiba mais: {{link_ou_cta}}`,
        'AMBOS',
    ),

    t(
        'launch-03',
        'launch',
        'Contagem Regressiva (D-1)',
        'Cria antecipação para o lançamento no dia seguinte.',
        `Falta 1 dia. ⏳\n\nAmanhã {{nome_produto}} chega oficialmente para {{publico_alvo}}.\n\nJá está na sua lista? {{link_ou_cta}}`,
        'X',
    ),

    t(
        'launch-04',
        'launch',
        'Lançamento com Prova Social',
        'Usa número de early adopters ou beta testers para validar o produto.',
        `{{numero_usuarios}} pessoas já testaram {{nome_produto}} antes de todo mundo.\n\nO feedback? {{frase_de_impacto}}.\n\nAgora é a sua vez: {{link_ou_cta}}`,
        'LINKEDIN',
    ),

    t(
        'launch-05',
        'launch',
        'Bastidores do Lançamento',
        'Humaniza a marca compartilhando o processo por trás do produto.',
        `{{tempo_desenvolvimento}} construindo {{nome_produto}}.\n\nAprendemos que {{aprendizado_principal}}.\n\nHoje finalmente abrimos para {{publico_alvo}}. Obrigado a cada um que acreditou antes de ver.\n\n{{link_ou_cta}}`,
        'LINKEDIN',
    ),

    // ── Depoimento de Cliente (3) ────────────────────────────────────────────

    t(
        'testimonial-01',
        'testimonial',
        'Depoimento Direto com Resultado',
        'Cita o cliente e o resultado concreto alcançado com o produto.',
        `"{{frase_do_cliente}}" — {{nome_cliente}}, {{cargo_ou_empresa}}\n\nEsse resultado veio após {{periodo}}  usando {{nome_produto}}.\n\nQuer o mesmo? {{link_ou_cta}}`,
        'AMBOS',
    ),

    t(
        'testimonial-02',
        'testimonial',
        'Transformação Antes/Depois',
        'Mostra o contraste entre a situação anterior e o resultado atual do cliente.',
        `Antes de {{nome_produto}}: {{situacao_antes}}.\n\nDepois: {{situacao_depois}}.\n\nÉ o que {{nome_cliente}} de {{empresa_cliente}} viveu em {{periodo}}.\n\n{{link_ou_cta}}`,
        'LINKEDIN',
    ),

    t(
        'testimonial-03',
        'testimonial',
        'Mini Case de Sucesso',
        'Conta a história resumida de um cliente com métrica de impacto.',
        `{{nome_cliente}} tinha um desafio: {{desafio}}.\n\nUsando {{nome_produto}}, conseguiu {{resultado_mensuravel}} em {{periodo}}.\n\nVeja como: {{link_ou_cta}}`,
        'AMBOS',
    ),

    // ── Dica Educativa (4) ───────────────────────────────────────────────────

    t(
        'educational-01',
        'educational',
        'Lista de Dicas Rápidas',
        'Formato de lista numerada com dicas acionáveis sobre um tema.',
        `{{numero_dicas}} dicas para {{objetivo_do_publico}}:\n\n1. {{dica_1}}\n2. {{dica_2}}\n3. {{dica_3}}\n\nSalva para não perder. 📌`,
        'X',
    ),

    t(
        'educational-02',
        'educational',
        'Mito vs. Verdade',
        'Derruba um equívoco comum do nicho e posiciona a marca como referência.',
        `Mito: {{mito_do_nicho}}.\n\nVerdade: {{verdade_real}}.\n\nPor que isso importa para {{publico_alvo}}? {{explicacao_breve}}.\n\nSeguiu? Compartilha com quem precisa ouvir isso.`,
        'AMBOS',
    ),

    t(
        'educational-03',
        'educational',
        'Pergunta + Resposta (FAQ em post)',
        'Responde uma dúvida frequente do público de forma direta.',
        `"{{pergunta_frequente}}"\n\nResposta rápida: {{resposta_direta}}.\n\nMais detalhes:\n• {{detalhe_1}}\n• {{detalhe_2}}\n\nTem mais dúvidas? Comenta aqui.`,
        'AMBOS',
    ),

    t(
        'educational-04',
        'educational',
        'Dado + Insight',
        'Ancora uma informação com dado real e tira um insight prático.',
        `{{dado_estatistico}} — e isso muda tudo para {{publico_alvo}}.\n\nO que esse número significa na prática: {{insight_principal}}.\n\nComo aproveitar isso? {{acao_recomendada}}.`,
        'LINKEDIN',
    ),
]);

// ─── category metadata ───────────────────────────────────────────────────────

export const TEMPLATE_CATEGORIES: readonly TemplateCategoryMeta[] = Object.freeze([
    {
        id: 'launch' as const,
        label: 'Lançamento de Produto',
        description: 'Posts para anunciar novos produtos, features ou serviços.',
        icon: Rocket,
        count: POST_TEMPLATES.filter((t) => t.category === 'launch').length,
    },
    {
        id: 'testimonial' as const,
        label: 'Depoimento de Cliente',
        description: 'Transforma histórias de clientes em prova social.',
        icon: Star,
        count: POST_TEMPLATES.filter((t) => t.category === 'testimonial').length,
    },
    {
        id: 'educational' as const,
        label: 'Dica Educativa',
        description: 'Conteúdo de valor que posiciona a marca como referência.',
        icon: BookOpen,
        count: POST_TEMPLATES.filter((t) => t.category === 'educational').length,
    },
]);
