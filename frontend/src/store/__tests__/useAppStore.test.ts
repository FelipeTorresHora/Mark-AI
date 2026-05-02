import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../useAppStore';
import type { Post } from '../../types';

describe('useAppStore — PostSlice', () => {
    beforeEach(() => {
        useAppStore.getState().clearPosts();
    });

    it('should add and retrieve a post', () => {
        const post: Post = {
            id: 'abc-123',
            platform: 'X',
            status: 'APPROVED',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        useAppStore.getState().addPost(post);
        expect(useAppStore.getState().posts['abc-123']).toEqual(post);
    });

    it('should update a post status', () => {
        const post: Post = {
            id: 'abc-456',
            platform: 'LINKEDIN',
            status: 'APPROVED',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        useAppStore.getState().addPost(post);
        useAppStore.getState().updatePost('abc-456', { status: 'FINAL' });
        expect(useAppStore.getState().posts['abc-456'].status).toBe('FINAL');
    });

    it('should filter posts by status', () => {
        const p1: Post = { id: '1', platform: 'X', status: 'FINAL', created_at: '', updated_at: '' };
        const p2: Post = { id: '2', platform: 'LINKEDIN', status: 'REJECTED', created_at: '', updated_at: '' };
        useAppStore.getState().setInitialPosts([p1, p2]);
        const approved = useAppStore.getState().getPostsByStatus('FINAL');
        expect(approved).toHaveLength(1);
        expect(approved[0].id).toBe('1');
    });
});
