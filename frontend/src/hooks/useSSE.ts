import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import type { Platform } from '../types';
import { api } from '../lib/api';
import { useAppStore } from '../store/useAppStore';

interface VariantEventData {
    post_id: string;
    variant_index: number;
    platform_total: number;
}

export type GenerationEvent =
    | { event: 'writer_start'; platform: Platform; data: VariantEventData }
    | { event: 'writer_done'; platform: Platform; data: VariantEventData & { content: string } }
    | { event: 'generation_complete'; platform: null; data: { campaign_id: string; awaiting_review?: boolean; resumed?: boolean } }
    | { event: 'error'; platform: Platform | null; data: Partial<VariantEventData> & { message: string } };

export type PlatformStatus = 'idle' | 'writing' | 'done' | 'error';

export interface PlatformProgress {
    total: number;
    started: number;
    done: number;
    errors: number;
}

export interface SSEState {
    events: GenerationEvent[];
    platformStatus: Record<Platform, PlatformStatus>;
    platformProgress: Record<Platform, PlatformProgress>;
    isConnected: boolean;
    isComplete: boolean;
    error: string | null;
}

const TERMINAL_CAMPAIGN_STATUSES = new Set(['AWAITING_REVIEW', 'DONE', 'FAILED']);
const MAX_RECONNECT_ATTEMPTS = 8;
const ERROR_DEBOUNCE_MS = 4000;

function createInitialPlatformProgress(): Record<Platform, PlatformProgress> {
    return {
        X: { total: 0, started: 0, done: 0, errors: 0 },
        LINKEDIN: { total: 0, started: 0, done: 0, errors: 0 },
        INSTAGRAM: { total: 0, started: 0, done: 0, errors: 0 },
    };
}

function createInitialState(): SSEState {
    return {
        events: [],
        platformStatus: { X: 'idle', LINKEDIN: 'idle', INSTAGRAM: 'idle' },
        platformProgress: createInitialPlatformProgress(),
        isConnected: false,
        isComplete: false,
        error: null,
    };
}

function getPlatformStatus(progress: PlatformProgress): PlatformStatus {
    if (progress.errors > 0) return 'error';
    if (progress.total > 0 && progress.done >= progress.total) return 'done';
    if (progress.started > 0) return 'writing';
    return 'idle';
}

/** Stable key for the stream URL without JWT (token refresh must not reset progress). */
export function sseStreamKey(endpoint: string | null): string | null {
    if (!endpoint) return null;
    try {
        const url = new URL(endpoint);
        url.searchParams.delete('token');
        return url.toString();
    } catch {
        return endpoint.replace(/([?&])token=[^&]*/g, '').replace(/[?&]$/, '');
    }
}

function parseCampaignId(endpoint: string | null): string | null {
    if (!endpoint) return null;
    const match = endpoint.match(/\/generate\/([^/]+)\/stream/);
    return match?.[1] ?? null;
}

function applyPacket(prev: SSEState, packet: GenerationEvent): SSEState {
    const events = [...prev.events, packet];
    const platformProgress = {
        X: { ...prev.platformProgress.X },
        LINKEDIN: { ...prev.platformProgress.LINKEDIN },
        INSTAGRAM: { ...prev.platformProgress.INSTAGRAM },
    };
    const platformStatus = { ...prev.platformStatus };

    if (packet.platform) {
        const next = platformProgress[packet.platform];
        next.total = packet.data.platform_total ?? next.total;

        if (packet.event === 'writer_start') {
            next.started = Math.min(next.total, next.started + 1);
        } else if (packet.event === 'writer_done') {
            next.done = Math.min(next.total, next.done + 1);
        } else if (packet.event === 'error') {
            next.errors = Math.min(next.total || next.errors + 1, next.errors + 1);
        }

        platformStatus[packet.platform] = getPlatformStatus(next);
    }

    const isComplete = packet.event === 'generation_complete';

    return { ...prev, events, platformProgress, platformStatus, isComplete, error: null };
}

async function refreshAccessTokenForSse(): Promise<string | null> {
    try {
        const res = await axios.post(
            `${api.defaults.baseURL}/api/v1/auth/refresh`,
            {},
            { withCredentials: true },
        );
        const newToken: string = res.data.access_token;
        const currentUser = useAppStore.getState().user;
        if (currentUser) {
            useAppStore.getState().setAuth(currentUser, newToken);
        }
        return newToken;
    } catch {
        return null;
    }
}

async function pollCampaignTerminal(campaignId: string): Promise<boolean> {
    try {
        const res = await api.get<{ status: string }>(`/api/v1/campaigns/${campaignId}`);
        return TERMINAL_CAMPAIGN_STATUSES.has(res.data.status);
    } catch {
        return false;
    }
}

export function useSSE(endpoint: string | null): SSEState {
    const [state, setState] = useState<SSEState>(() => createInitialState());
    const streamKey = sseStreamKey(endpoint);
    const [trackedStreamKey, setTrackedStreamKey] = useState(streamKey);
    const completedRef = useRef(false);
    const reconnectAttemptsRef = useRef(0);
    const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearErrorTimer = useCallback(() => {
        if (errorTimerRef.current) {
            clearTimeout(errorTimerRef.current);
            errorTimerRef.current = null;
        }
    }, []);

    if (streamKey !== trackedStreamKey) {
        setTrackedStreamKey(streamKey);
        setState(createInitialState());
        completedRef.current = false;
        reconnectAttemptsRef.current = 0;
        clearErrorTimer();
    }

    useEffect(() => {
        if (!endpoint) return;

        completedRef.current = false;
        reconnectAttemptsRef.current = 0;
        clearErrorTimer();

        let es: EventSource | null = new EventSource(endpoint);
        let disposed = false;

        const scheduleTerminalError = (message: string) => {
            clearErrorTimer();
            errorTimerRef.current = setTimeout(() => {
                if (disposed || completedRef.current) return;
                setState(prev => ({
                    ...prev,
                    isConnected: false,
                    error: message,
                }));
            }, ERROR_DEBOUNCE_MS);
        };

        const connectWithUrl = (url: string) => {
            if (disposed) return;
            es?.close();
            es = new EventSource(url);
            wireEventSource(es);
        };

        const tryRecoverConnection = async () => {
            if (disposed || completedRef.current) return;

            const campaignId = parseCampaignId(endpoint);
            if (campaignId && (await pollCampaignTerminal(campaignId))) {
                completedRef.current = true;
                clearErrorTimer();
                setState(prev => ({
                    ...prev,
                    isComplete: true,
                    isConnected: false,
                    error: null,
                }));
                es?.close();
                return;
            }

            if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                scheduleTerminalError('Conexão SSE perdida. A geração pode ainda estar em andamento — recarregue a página.');
                es?.close();
                return;
            }

            reconnectAttemptsRef.current += 1;
            const freshToken = await refreshAccessTokenForSse();
            if (disposed || completedRef.current) return;

            if (freshToken && campaignId) {
                const base = sseStreamKey(endpoint);
                if (base) {
                    connectWithUrl(`${base}?token=${encodeURIComponent(freshToken)}`);
                    return;
                }
            }

            scheduleTerminalError('Conexão SSE perdida');
        };

        const wireEventSource = (source: EventSource) => {
            source.onopen = () => {
                reconnectAttemptsRef.current = 0;
                clearErrorTimer();
                setState(prev => ({ ...prev, isConnected: true, error: null }));
            };

            source.onmessage = (e) => {
                try {
                    const packet: GenerationEvent = JSON.parse(e.data);
                    if (packet.event === 'error' && !packet.platform && packet.data.message) {
                        completedRef.current = true;
                        source.close();
                        setState(prev => ({
                            ...applyPacket(prev, packet),
                            error: packet.data.message,
                            isConnected: false,
                        }));
                        return;
                    }

                    setState(prev => applyPacket(prev, packet));

                    if (packet.event === 'generation_complete') {
                        completedRef.current = true;
                        clearErrorTimer();
                        source.close();
                    }
                } catch {
                    // ignorar pacotes malformados
                }
            };

            source.onerror = () => {
                if (completedRef.current) {
                    source.close();
                    return;
                }

                setState(prev => ({ ...prev, isConnected: false }));

                if (source.readyState === EventSource.CONNECTING) {
                    return;
                }

                void tryRecoverConnection();
            };
        };

        wireEventSource(es);

        return () => {
            disposed = true;
            clearErrorTimer();
            es?.close();
        };
    }, [endpoint, clearErrorTimer]);

    return state;
}
