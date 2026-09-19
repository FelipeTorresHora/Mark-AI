import { useEffect, useState } from 'react';

/** Stable clock for schedule validation without calling Date.now() during render. */
export function useCurrentTimeMs(updateIntervalMs = 60_000): number {
    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
        const id = window.setInterval(() => setNowMs(Date.now()), updateIntervalMs);
        return () => window.clearInterval(id);
    }, [updateIntervalMs]);

    return nowMs;
}
