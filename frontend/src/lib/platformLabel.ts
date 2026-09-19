import type { Platform } from '../types';

export function platformLabel(platform: Platform): string {
    switch (platform) {
        case 'X':
            return 'Twitter / X';
        case 'INSTAGRAM':
            return 'Instagram';
        default:
            return 'LinkedIn';
    }
}
