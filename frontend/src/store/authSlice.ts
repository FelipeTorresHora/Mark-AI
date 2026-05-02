import { type StateCreator } from 'zustand';

export interface AuthUser {
    id: string;
    email: string;
}

export interface AuthSlice {
    user: AuthUser | null;
    accessToken: string | null;
    isAuthLoading: boolean;
    setAuth: (user: AuthUser, token: string) => void;
    clearAuth: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (set) => ({
    user: null,
    accessToken: null,
    isAuthLoading: true, // true until silentRefresh resolves on mount
    setAuth: (user, token) => set({ user, accessToken: token, isAuthLoading: false }),
    clearAuth: () => set({ user: null, accessToken: null, isAuthLoading: false }),
});
