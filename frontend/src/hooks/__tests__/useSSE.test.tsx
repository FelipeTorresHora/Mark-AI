import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSSE } from '../useSSE';

describe('useSSE', () => {
    const MockEventSource = vi.fn(function EventSourceMock(url: string) {
        return createMockES(url);
    });

    beforeAll(() => {
        vi.stubGlobal('EventSource', MockEventSource);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function createMockES(url: string) {
        let handler: ((e: MessageEvent) => void) | null = null;
        let openHandler: ((e: Event) => void) | null = null;
        let errorHandler: (() => void) | null = null;
        return {
            close: vi.fn(),
            set onmessage(h: (e: MessageEvent) => void) { handler = h; },
            set onerror(h: () => void) { errorHandler = h; },
            set onopen(h: (e: Event) => void) { openHandler = h; },
            _triggerMessage(data: unknown) {
                handler?.({ data: JSON.stringify(data) } as MessageEvent);
            },
            _triggerOpen() {
                openHandler?.({} as Event);
            },
            _triggerError() {
                errorHandler?.();
            },
            url,
        };
    }

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('connects and receives events', async () => {
        const { result } = renderHook(() => useSSE('http://test/stream?token=abc'));
        const mockEs = MockEventSource.mock.results[0]?.value;

        expect(MockEventSource).toHaveBeenCalledWith('http://test/stream?token=abc');

        act(() => {
            mockEs._triggerOpen();
        });

        act(() => {
            mockEs._triggerMessage({
                event: 'writer_start',
                platform: 'X',
                data: { post_id: '1', variant_index: 1, platform_total: 3 },
            });
        });

        expect(result.current.events).toHaveLength(1);
        expect(result.current.events[0].event).toBe('writer_start');
        expect(result.current.platformStatus.X).toBe('writing');
        expect(result.current.platformProgress.X.started).toBe(1);
        expect(result.current.platformProgress.X.total).toBe(3);
    });

    it('marks platform as done', async () => {
        const { result } = renderHook(() => useSSE('http://test/stream?token=abc'));
        const mockEs = MockEventSource.mock.results[0]?.value;

        act(() => {
            mockEs._triggerMessage({
                event: 'writer_start',
                platform: 'X',
                data: { post_id: '1', variant_index: 1, platform_total: 1 },
            });
        });

        act(() => {
            mockEs._triggerMessage({
                event: 'writer_done',
                platform: 'X',
                data: { post_id: '1', content: 'Test post', variant_index: 1, platform_total: 1 },
            });
        });

        expect(result.current.platformStatus.X).toBe('done');
        expect(result.current.platformProgress.X.done).toBe(1);
    });

    it('detects generation complete and closes connection', async () => {
        const { result } = renderHook(() => useSSE('http://test/stream?token=abc'));
        const mockEs = MockEventSource.mock.results[0]?.value;

        act(() => {
            mockEs._triggerMessage({
                event: 'generation_complete',
                platform: null,
                data: { campaign_id: 'camp-1' },
            });
        });

        expect(result.current.isComplete).toBe(true);
        expect(mockEs.close).toHaveBeenCalled();
    });

    it('handles connection error', async () => {
        const { result } = renderHook(() => useSSE('http://test/stream?token=abc'));
        const mockEs = MockEventSource.mock.results[0]?.value;

        act(() => {
            mockEs._triggerError();
        });

        expect(result.current.isConnected).toBe(false);
        expect(result.current.error).toBe('Conexão SSE perdida');
        expect(mockEs.close).toHaveBeenCalled();
    });

    it('returns initial state when no endpoint', () => {
        const { result } = renderHook(() => useSSE(null));
        expect(result.current.events).toEqual([]);
        expect(result.current.isConnected).toBe(false);
        expect(result.current.isComplete).toBe(false);
    });
});
