import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createPostSlice, type PostSlice } from './postSlice';
import { createAuthSlice, type AuthSlice } from './authSlice';
import { createThemeSlice, type ThemeSlice } from './themeSlice';

export type AppState = PostSlice & AuthSlice & ThemeSlice;

export const useAppStore = create<AppState>()(
    devtools(
        (...a) => ({
            ...createPostSlice(...a),
            ...createAuthSlice(...a),
            ...createThemeSlice(...a),
        }),
        { name: 'AppStore' }
    )
);
