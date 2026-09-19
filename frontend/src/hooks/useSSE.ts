import { useState, useEffect, useRef } from 'react';
import type { Platform } from '../types';

interface VariantEventData {
    post_id: string;
    variant_index: number;
    platform_total: number;
}

export type GenerationEvent =
    | { event: 'generation_plan'; platform: null; data: { platforms: Partial<Record<Platform, number>> } }
    | { event: 'writer_start'; platform: Platform; data: VariantEventData }
    | { event: 'writer_done'; platform: Platform; data: VariantEventData & { content: string } }
    | { event: 'platform_skipped'; platform: Platform; data: VariantEventData & { message: string } }
    | { event: 'generation_complete'; platform: null; data: { campaign_id: string; awaiting_review?: boolean } }
    | { event: 'error'; platform: Platform | null; data: Partial<VariantEventData> & { message: string } };

export type PlatformStatus = 'idle' | 'writing' | 'done' | 'error' | 'skipped';

export interface PlatformProgress {
    total: number;
    started: number;
    done: number;
    errors: number;
    skipped: number;
}

export interface SSEState {
    events: GenerationEvent[];
    activePlatforms: Platform[];
    platformStatus: Record<Platform, PlatformStatus>;
    platformProgress: Record<Platform, PlatformProgress>;
    isConnected: boolean;
    isComplete: boolean;
    error: string | null;
}

function createInitialPlatformProgress(): Record<Platform, PlatformProgress> {
    return {
        X: { total: 0, started: 0, done: 0, errors: 0, skipped: 0 },
        LINKEDIN: { total: 0, started: 0, done: 0, errors: 0, skipped: 0 },
        INSTAGRAM: { total: 0, started: 0, done: 0, errors: 0, skipped: 0 },
    };
}

function createInitialState(): SSEState {
    return {
        events: [],
        activePlatforms: [],
        platformStatus: { X: 'idle', LINKEDIN: 'idle', INSTAGRAM: 'idle' },
        platformProgress: createInitialPlatformProgress(),
        isConnected: false,
        isComplete: false,
        error: null,
    };
}

function getPlatformStatus(progress: PlatformProgress): PlatformStatus {
    if (progress.skipped > 0) return 'skipped';
    if (progress.errors > 0) return 'error';
    if (progress.total > 0 && progress.done >= progress.total) return 'done';
    if (progress.started > 0) return 'writing';
    if (progress.total > 0 && progress.done + progress.errors + progress.skipped >= progress.total) {
        return progress.errors > 0 ? 'error' : 'done';
    }
    return 'idle';
}

function platformsFromPlan(plan: Partial<Record<Platform, number>>): Platform[] {
    const order: Platform[] = ['X', 'LINKEDIN', 'INSTAGRAM'];
    return order.filter((p) => (plan[p] ?? 0) > 0);
}

export function useSSE(endpoint: string | null): SSEState {
    const [state, setState] = useState<SSEState>(() => createInitialState());
    const [trackedEndpoint, setTrackedEndpoint] = useState(endpoint);
    const esRef = useRef<EventSource | null>(null);

    if (endpoint !== trackedEndpoint) {
        setTrackedEndpoint(endpoint);
        setState(createInitialState());
    }

    useEffect(() => {
        if (!endpoint) return;

        const es = new EventSource(endpoint);
        esRef.current = es;

        es.onopen = () => {
            setState(prev => ({ ...prev, isConnected: true, error: null }));
        };

        es.onerror = () => {
            setState(prev => ({
                ...prev,
                isConnected: false,
                error: 'Conexão SSE perdida',
            }));
            es.close();
        };

        es.onmessage = (e) => {
            try {
                const packet: GenerationEvent = JSON.parse(e.data);

                setState(prev => {
                    const events = [...prev.events, packet];
                    const platformProgress = {
                        X: { ...prev.platformProgress.X },
                        LINKEDIN: { ...prev.platformProgress.LINKEDIN },
                        INSTAGRAM: { ...prev.platformProgress.INSTAGRAM },
                    };
                    const platformStatus = { ...prev.platformStatus };
                    let activePlatforms = [...prev.activePlatforms];

                    if (packet.event === 'generation_plan') {
                        activePlatforms = platformsFromPlan(packet.data.platforms);
                        for (const platform of activePlatforms) {
                            const total = packet.data.platforms[platform] ?? 0;
                            platformProgress[platform].total = total;
                            platformStatus[platform] = getPlatformStatus(platformProgress[platform]);
                        }
                    }

                    if (packet.platform) {
                        const next = platformProgress[packet.platform];
                        if (!activePlatforms.includes(packet.platform)) {
                            activePlatforms = [...activePlatforms, packet.platform];
                        }
                        next.total = packet.data.platform_total ?? next.total;

                        if (packet.event === 'writer_start') {
                            next.started = Math.min(next.total, next.started + 1);
                        } else if (packet.event === 'writer_done') {
                            next.done = Math.min(next.total, next.done + 1);
                        } else if (packet.event === 'platform_skipped') {
                            next.skipped = Math.min(next.total || 1, next.skipped + 1);
                        } else if (packet.event === 'error') {
                            next.errors = Math.min(next.total || next.errors + 1, next.errors + 1);
                        }

                        platformStatus[packet.platform] = getPlatformStatus(next);
                    }

                    const isComplete = packet.event === 'generation_complete';

                    return {
                        ...prev,
                        events,
                        activePlatforms,
                        platformProgress,
                        platformStatus,
                        isComplete,
                    };
                });

                if (packet.event === 'generation_complete') {
                    es.close();
                }
            } catch {
                // ignorar pacotes malformados
            }
        };

        return () => {
            es.close();
            esRef.current = null;
        };
    }, [endpoint]);

    return state;
}
