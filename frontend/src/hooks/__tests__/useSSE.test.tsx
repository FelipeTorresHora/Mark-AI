import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import axios from 'axios';
import { api } from '../../lib/api';
import { useSSE, sseStreamKey } from '../useSSE';

describe('sseStreamKey', () => {
    it('ignores token query param', () => {
        expect(
            sseStreamKey('http://test/api/v1/generate/abc/stream?token=old'),
        ).toBe('http://test/api/v1/generate/abc/stream');
    });
});

describe('useSSE', () => {
    const MockEventSource = vi.fn(function EventSourceMock(url: string) {
        return createMockES(url);
    });

    beforeAll(() => {
        vi.stubGlobal('EventSource', MockEventSource);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    function createMockES(url: string) {
        let handler: ((e: MessageEvent) => void) | null = null;
        let openHandler: ((e: Event) => void) | null = null;
        let errorHandler: (() => void) | null = null;
        return {
            close: vi.fn(),
            readyState: 1,
            set onmessage(h: (e: MessageEvent) => void) { handler = h; },
            set onerror(h: () => void) { errorHandler = h; },
            set onopen(h: (e: Event) => void) { openHandler = h; },
            _triggerMessage(data: unknown) {
                handler?.({ data: JSON.stringify(data) } as MessageEvent);
            },
            _triggerOpen() {
                openHandler?.({} as Event);
            },
            _triggerError(readyState = 2) {
                Object.defineProperty(this, 'readyState', { value: readyState, configurable: true });
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
        expect(result.current.error).toBeNull();
        expect(mockEs.close).toHaveBeenCalled();
    });

    it('does not show lost connection after successful complete', async () => {
        const { result } = renderHook(() => useSSE('http://test/stream?token=abc'));
        const mockEs = MockEventSource.mock.results[0]?.value;

        act(() => {
            mockEs._triggerMessage({
                event: 'generation_complete',
                platform: null,
                data: { campaign_id: 'camp-1' },
            });
            mockEs._triggerError();
        });

        expect(result.current.isComplete).toBe(true);
        expect(result.current.error).toBeNull();
    });

    it('debounces connection error until recovery is exhausted', async () => {
        vi.useFakeTimers();
        vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh failed'));
        vi.spyOn(api, 'get').mockRejectedValue(new Error('poll failed'));

        const { result } = renderHook(() =>
            useSSE('http://test/api/v1/generate/camp-1/stream?token=abc'),
        );
        const mockEs = MockEventSource.mock.results[0]?.value;

        await act(async () => {
            mockEs._triggerError(2);
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(result.current.error).toBeNull();

        await act(async () => {
            vi.advanceTimersByTime(4000);
        });

        expect(result.current.error).toContain('Conexão SSE perdida');
    });

    it('returns initial state when no endpoint', () => {
        const { result } = renderHook(() => useSSE(null));
        expect(result.current.events).toEqual([]);
        expect(result.current.isConnected).toBe(false);
        expect(result.current.isComplete).toBe(false);
    });

    it('does not open a new EventSource when only the token query changes', async () => {
        const { rerender } = renderHook(
            ({ url }) => useSSE(url),
            {
                initialProps: {
                    url: 'http://test/api/v1/generate/camp-1/stream?token=token-a',
                },
            },
        );

        expect(MockEventSource).toHaveBeenCalledTimes(1);

        rerender({
            url: 'http://test/api/v1/generate/camp-1/stream?token=token-b',
        });

        expect(MockEventSource).toHaveBeenCalledTimes(1);
    });
});
