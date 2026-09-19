import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isPublicAppPath, bootstrapAuthSession } from '../authBootstrap';
import { useAppStore } from '../../store/useAppStore';

vi.mock('axios', () => {
    const post = vi.fn();
    const get = vi.fn();
    return {
        default: {
            create: () => ({ post, get }),
        },
        __mocks: { post, get },
    };
});

describe('isPublicAppPath', () => {
    it('treats landing as public', () => {
        expect(isPublicAppPath('/')).toBe(true);
    });

    it('treats login as public', () => {
        expect(isPublicAppPath('/login')).toBe(true);
    });

    it('treats dashboard as protected', () => {
        expect(isPublicAppPath('/posts')).toBe(false);
    });
});

describe('bootstrapAuthSession', () => {
    beforeEach(() => {
        useAppStore.setState({ user: null, accessToken: null, isAuthLoading: true });
    });

    it('sets auth when refresh returns user payload', async () => {
        const axios = await import('axios');
        const mocks = (axios as unknown as { __mocks: { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> } }).__mocks;
        mocks.post.mockResolvedValue({
            data: { access_token: 'tok', user: { id: 'u1', email: 'a@b.com' } },
        });

        await bootstrapAuthSession();

        const state = useAppStore.getState();
        expect(state.accessToken).toBe('tok');
        expect(state.user?.email).toBe('a@b.com');
        expect(state.isAuthLoading).toBe(false);
    });

    it('clears auth when refresh fails', async () => {
        const axios = await import('axios');
        const mocks = (axios as unknown as { __mocks: { post: ReturnType<typeof vi.fn> } }).__mocks;
        mocks.post.mockRejectedValue(new Error('401'));

        await bootstrapAuthSession();

        const state = useAppStore.getState();
        expect(state.accessToken).toBeNull();
        expect(state.isAuthLoading).toBe(false);
    });
});
