import type { AudienceType } from '../data/goalsCopy';

export type ProductAudience = 'mei' | 'founder' | 'faceless';

export type OnboardingStep = 'audience' | 'accounts' | 'goals';

/** Maps onboarding UI ids to the API / user.audience enum. */
export function productAudienceToApi(audience: ProductAudience): AudienceType {
    if (audience === 'mei') return 'mei_loja_liberal';
    return audience;
}

export function productAudienceFromApi(raw: string | null | undefined): ProductAudience | null {
    if (raw === 'mei_loja_liberal' || raw === 'mei') return 'mei';
    if (raw === 'founder' || raw === 'faceless') return raw;
    return null;
}

export interface OnboardingState {
    completed: boolean;
    audience: ProductAudience | null;
    completedAt?: string;
}

const STORAGE_KEY = 'mark_onboarding_v1';
const PENDING_AUDIENCE_KEY = 'mark_onboarding_pending_audience';

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
            { id: 'objective', label: 'Definir o objetivo', hint: 'Ex.: lotar agenda da clínica' },
            { id: 'first_post', label: 'Aprovar o primeiro post' },
            { id: 'week_posts', label: 'Publicar 3 posts em 7 dias' },
        ],
        founder: [
            { id: 'connect', label: connectLabel, hint: hasConnectedAccount ? 'Concluído' : 'Próximo passo' },
            { id: 'objective', label: 'Definir o objetivo', hint: 'Ex.: lançar feature ou MRR' },
            { id: 'first_post', label: 'Aprovar o primeiro post' },
            { id: 'two_channels', label: 'Estar em 2 canais conectados' },
        ],
        faceless: [
            { id: 'connect', label: connectLabel, hint: hasConnectedAccount ? 'Concluído' : 'Próximo passo' },
            { id: 'objective', label: 'Definir o objetivo', hint: 'Ex.: crescer sem aparecer' },
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

export function getPendingAudience(): ProductAudience | null {
    try {
        const raw = sessionStorage.getItem(PENDING_AUDIENCE_KEY);
        if (raw === 'mei' || raw === 'founder' || raw === 'faceless') return raw;
    } catch {
        /* ignore */
    }
    return null;
}

export function setPendingAudience(audience: ProductAudience) {
    try {
        sessionStorage.setItem(PENDING_AUDIENCE_KEY, audience);
    } catch {
        /* ignore */
    }
}

export function clearPendingAudience() {
    try {
        sessionStorage.removeItem(PENDING_AUDIENCE_KEY);
    } catch {
        /* ignore */
    }
}

/** Audience for the current onboarding session (localStorage per user + session fallback). */
export function resolveOnboardingAudience(
    userId: string | undefined,
    localAudience: ProductAudience | null,
): ProductAudience | null {
    if (localAudience) return localAudience;
    if (userId) {
        const stored = getOnboardingState(userId).audience;
        if (stored) return stored;
    }
    return getPendingAudience();
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
    clearPendingAudience();
}

/** Flush session-only audience into per-user storage once auth user id is known. */
export function flushPendingAudienceForUser(userId: string): ProductAudience | null {
    const pending = getPendingAudience();
    const stored = getOnboardingState(userId).audience;
    if (stored) {
        clearPendingAudience();
        return stored;
    }
    if (pending) {
        saveOnboardingAudience(userId, pending);
        return pending;
    }
    return null;
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
