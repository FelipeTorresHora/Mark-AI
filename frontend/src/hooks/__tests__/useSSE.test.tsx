import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import axios from 'axios';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import { useSSE, sseStreamKey } from '../useSSE';

function sseResponse(packets: unknown[], { hang = false, fail = false } = {}) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            if (fail) {
                controller.error(new Error('network'));
                return;
            }
            for (const packet of packets) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(packet)}\n\n`));
            }
            if (!hang) {
                controller.close();
            }
        },
    });
    return new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
    });
}

describe('sseStreamKey', () => {
    it('ignores token query param', () => {
        expect(
            sseStreamKey('http://test/api/v1/generate/abc/stream?token=old'),
        ).toBe('http://test/api/v1/generate/abc/stream');
    });
});

describe('useSSE', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAppStore.getState().setAuth({ id: '1', email: 'a@b.c' }, 'store-token');
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('connects and receives events', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            sseResponse([
                {
                    event: 'writer_start',
                    platform: 'X',
                    data: { post_id: '1', variant_index: 1, platform_total: 3 },
                },
            ], { hang: true }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const { result } = renderHook(() => useSSE('http://test/stream'));

        await waitFor(() => {
            expect(result.current.events).toHaveLength(1);
        });
        expect(fetchMock).toHaveBeenCalled();
        const init = fetchMock.mock.calls[0][1] as RequestInit;
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer store-token');
        expect(result.current.events[0].event).toBe('writer_start');
        expect(result.current.platformStatus.X).toBe('writing');
        expect(result.current.platformProgress.X.started).toBe(1);
        expect(result.current.platformProgress.X.total).toBe(3);
    });

    it('marks platform as done', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                sseResponse([
                    {
                        event: 'writer_start',
                        platform: 'X',
                        data: { post_id: '1', variant_index: 1, platform_total: 1 },
                    },
                    {
                        event: 'writer_done',
                        platform: 'X',
                        data: { post_id: '1', content: 'Test post', variant_index: 1, platform_total: 1 },
                    },
                ], { hang: true }),
            ),
        );

        const { result } = renderHook(() => useSSE('http://test/stream'));
        await waitFor(() => {
            expect(result.current.platformStatus.X).toBe('done');
        });
        expect(result.current.platformProgress.X.done).toBe(1);
    });

    it('detects generation complete', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                sseResponse([
                    {
                        event: 'generation_complete',
                        platform: null,
                        data: { campaign_id: 'camp-1' },
                    },
                ]),
            ),
        );

        const { result } = renderHook(() => useSSE('http://test/stream'));
        await waitFor(() => {
            expect(result.current.isComplete).toBe(true);
        });
        expect(result.current.error).toBeNull();
    });

    it('debounces connection error until recovery is exhausted', async () => {
        vi.useFakeTimers();
        vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh failed'));
        vi.spyOn(api, 'get').mockRejectedValue(new Error('poll failed'));
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

        const { result } = renderHook(() =>
            useSSE('http://test/api/v1/generate/camp-1/stream'),
        );

        await act(async () => {
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

    it('does not reconnect when only the token query changes', async () => {
        const fetchMock = vi.fn().mockResolvedValue(sseResponse([], { hang: true }));
        vi.stubGlobal('fetch', fetchMock);

        const { rerender } = renderHook(
            ({ url }) => useSSE(url),
            {
                initialProps: {
                    url: 'http://test/api/v1/generate/camp-1/stream?token=token-a',
                },
            },
        );

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        rerender({
            url: 'http://test/api/v1/generate/camp-1/stream?token=token-b',
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
