import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { createThemeSlice, type ThemeSlice } from '../themeSlice';

describe('themeSlice', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('dark');
        vi.spyOn(window, 'matchMedia').mockReturnValue({
            matches: false,
            media: '',
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        } as MediaQueryList);
    });

    it('toggles theme and persists', () => {
        const useStore = create<ThemeSlice>()((...args) => createThemeSlice(...args));
        expect(useStore.getState().theme).toBe('light');

        useStore.getState().toggleTheme();
        expect(useStore.getState().theme).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(localStorage.getItem('markai-theme')).toBe('dark');

        useStore.getState().setTheme('light');
        expect(useStore.getState().theme).toBe('light');
    });
});
