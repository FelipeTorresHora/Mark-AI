import { type StateCreator } from 'zustand';
import { type PostStatus, type Post } from '../types';

export interface PostSlice {
    posts: Record<string, Post>; // Usando Record para facilitar buscas por ID
    addPost: (post: Post) => void;
    updatePost: (id: string, updates: Partial<Post>) => void;
    getPostsByStatus: (status: PostStatus) => Post[];
    setInitialPosts: (posts: Post[]) => void;
    clearPosts: () => void;
}

export const createPostSlice: StateCreator<PostSlice, [], [], PostSlice> = (set, get) => ({
    posts: {},
    addPost: (post) => set((state) => ({
        posts: { ...state.posts, [post.id]: post }
    })),
    updatePost: (id, updates) => set((state) => {
        const existing = state.posts[id];
        if (!existing) return state;
        return {
            posts: {
                ...state.posts,
                [id]: { ...existing, ...updates }
            }
        };
    }),
    getPostsByStatus: (status) => {
        const { posts } = get();
        return Object.values(posts).filter(p => p.status === status);
    },
    setInitialPosts: (postsList) => set(() => {
        const postsMap: Record<string, Post> = {};
        postsList.forEach(p => { postsMap[p.id] = p; });
        return { posts: postsMap };
    }),
    clearPosts: () => set({ posts: {} }),
});
