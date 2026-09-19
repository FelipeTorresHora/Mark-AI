import { describe, it, expect, vi, beforeEach } from 'vitest';

const success = vi.fn();
const error = vi.fn();
const info = vi.fn();
const warning = vi.fn();

vi.mock('sonner', () => ({
    toast: { success, error, info, warning },
}));

describe('toast helpers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('delegates to sonner', async () => {
        const { toast, showSuccess, showError } = await import('../toast');
        showSuccess('ok');
        showError('bad');
        toast.info('i');
        toast.scoreAchieved(90, 'X');
        toast.maxIterations('LINKEDIN');

        expect(success).toHaveBeenCalled();
        expect(error).toHaveBeenCalled();
        expect(info).toHaveBeenCalled();
        expect(warning).toHaveBeenCalled();
    });
});
