import type { PostTemplate } from '../../data/postTemplates';

export function extractPlaceholders(body: string): readonly string[] {
    const matches = [...body.matchAll(/\{\{(\w+)\}\}/g)];
    return [...new Set(matches.map((m) => m[1]))];
}

export function placeholderLabel(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function fillTemplate(body: string, values: Record<string, string>): string {
    return body.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? `{{${key}}}`);
}

export function formatPlatformLabel(platform: PostTemplate['platform']): string {
    switch (platform) {
        case 'X':
            return 'X';
        case 'LINKEDIN':
            return 'LinkedIn';
        case 'AMBOS':
            return 'X + LinkedIn';
        default:
            return platform;
    }
}

/** First lines of body for card scanning — placeholders shown as labels. */
export function templateTeaser(body: string, maxLen = 140): string {
    const normalized = body
        .replace(/\{\{(\w+)\}\}/g, (_, key) => `[${placeholderLabel(key)}]`)
        .replace(/\s+/g, ' ')
        .trim();
    if (normalized.length <= maxLen) return normalized;
    return `${normalized.slice(0, maxLen).trim()}…`;
}

export function filterTemplates(
    templates: readonly PostTemplate[],
    query: string,
): PostTemplate[] {
    const q = query.trim().toLowerCase();
    if (!q) return [...templates];
    return templates.filter((t) => {
        const haystack = [
            t.title,
            t.previewText,
            t.bodyTemplate,
            ...t.placeholders,
        ]
            .join(' ')
            .toLowerCase();
        return haystack.includes(q);
    });
}
