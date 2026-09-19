import { useEffect, useState } from 'react';

/** Live clock for schedule validation without calling Date.now() during render. */
export function useLiveNowMs(intervalMs = 1000): number {
    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
        const id = window.setInterval(() => setNowMs(Date.now()), intervalMs);
        return () => window.clearInterval(id);
    }, [intervalMs]);

    return nowMs;
}
