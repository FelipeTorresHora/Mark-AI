import { type StateCreator } from 'zustand';

export type Theme = 'light' | 'dark';

const KEY = 'markai-theme';

function getInitial(): Theme {
    try {
        const s = localStorage.getItem(KEY);
        if (s === 'dark' || s === 'light') return s;
    } catch {
        // localStorage blocked (private browsing, etc.)
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(t: Theme) {
    document.documentElement.classList.toggle('dark', t === 'dark');
    try {
        localStorage.setItem(KEY, t);
    } catch {
        // ignore
    }
}

export interface ThemeSlice {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (t: Theme) => void;
}

export const createThemeSlice: StateCreator<ThemeSlice, [], [], ThemeSlice> = (set, get) => {
    const initial = getInitial();
    apply(initial);
    return {
        theme: initial,
        toggleTheme: () => {
            const next: Theme = get().theme === 'light' ? 'dark' : 'light';
            apply(next);
            set({ theme: next });
        },
        setTheme: (t: Theme) => {
            apply(t);
            set({ theme: t });
        },
    };
};
