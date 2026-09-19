export type ProductAudience = 'mei' | 'founder' | 'faceless';

export type OnboardingStep = 'audience' | 'accounts' | 'goals';

export interface OnboardingState {
    completed: boolean;
    audience: ProductAudience | null;
    completedAt?: string;
}

const STORAGE_KEY = 'mark_onboarding_v1';

export const AUDIENCE_OPTIONS: {
    id: ProductAudience;
    title: string;
    description: string;
    tone: string;
}[] = [
    {
        id: 'mei',
        title: 'MEI, loja ou liberal',
        description: 'Confiança local, ofertas claras e prova social na região.',
        tone: 'Próximo e direto',
    },
    {
        id: 'founder',
        title: 'Founder de startup',
        description: 'Tração, autoridade e narrativa de produto para investidores e usuários.',
        tone: 'Ambicioso e técnico',
    },
    {
        id: 'faceless',
        title: 'Faceless',
        description: 'Conteúdo sem rosto — valor da marca, não identidade pessoal.',
        tone: 'Anônimo e consistente',
    },
];

export interface OnboardingGoal {
    id: string;
    label: string;
    hint?: string;
}

export function getGoalsForAudience(audience: ProductAudience, hasConnectedAccount: boolean): OnboardingGoal[] {
    const connectLabel = hasConnectedAccount ? 'Conectar primeira conta' : 'Conectar primeira conta';
    const shared: Record<ProductAudience, OnboardingGoal[]> = {
        mei: [
            { id: 'connect', label: connectLabel, hint: hasConnectedAccount ? 'Concluído' : 'Próximo passo' },
            { id: 'first_generation', label: 'Primeira rodada de geração', hint: 'Hábito no painel de metas' },
            { id: 'first_post', label: 'Aprovar o primeiro post' },
            { id: 'week_posts', label: 'Publicar 3 posts em 7 dias' },
        ],
        founder: [
            { id: 'connect', label: connectLabel, hint: hasConnectedAccount ? 'Concluído' : 'Próximo passo' },
            { id: 'first_generation', label: 'Primeira rodada de geração', hint: 'Hábito no painel de metas' },
            { id: 'first_post', label: 'Aprovar o primeiro post' },
            { id: 'two_channels', label: 'Estar em 2 canais conectados' },
        ],
        faceless: [
            { id: 'connect', label: connectLabel, hint: hasConnectedAccount ? 'Concluído' : 'Próximo passo' },
            { id: 'first_generation', label: 'Primeira rodada de geração', hint: 'Hábito no painel de metas' },
            { id: 'first_faceless', label: 'Aprovar o primeiro post faceless' },
            { id: 'consistency', label: '7 dias de consistência' },
        ],
    };
    return shared[audience];
}

function readAll(): Record<string, OnboardingState> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        return JSON.parse(raw) as Record<string, OnboardingState>;
    } catch {
        return {};
    }
}

function writeAll(data: Record<string, OnboardingState>) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getOnboardingState(userId: string | undefined): OnboardingState {
    if (!userId) {
        return { completed: false, audience: null };
    }
    return readAll()[userId] ?? { completed: false, audience: null };
}

export function isOnboardingComplete(userId: string | undefined): boolean {
    return getOnboardingState(userId).completed;
}

export function saveOnboardingAudience(userId: string, audience: ProductAudience) {
    const all = readAll();
    const current = all[userId] ?? { completed: false, audience: null };
    all[userId] = { ...current, audience };
    writeAll(all);
}

export function completeOnboarding(userId: string) {
    const all = readAll();
    const current = all[userId] ?? { completed: false, audience: null };
    all[userId] = {
        ...current,
        completed: true,
        completedAt: new Date().toISOString(),
    };
    writeAll(all);
}

export const OAUTH_RETURN_KEY = 'mark_onboarding_oauth_return';

export function setOAuthReturnToOnboarding() {
    sessionStorage.setItem(OAUTH_RETURN_KEY, '/onboarding?step=accounts');
}

export function consumeOAuthReturnPath(): string | null {
    const path = sessionStorage.getItem(OAUTH_RETURN_KEY);
    sessionStorage.removeItem(OAUTH_RETURN_KEY);
    return path;
}
