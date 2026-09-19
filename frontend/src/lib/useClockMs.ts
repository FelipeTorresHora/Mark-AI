import { useSyncExternalStore } from 'react';

/** Stable clock for schedule validation without impure Date.now() during render. */
export function useClockMs(intervalMs = 60_000): number {
    return useSyncExternalStore(
        (onStoreChange) => {
            const id = window.setInterval(onStoreChange, intervalMs);
            return () => window.clearInterval(id);
        },
        () => Date.now(),
        () => Date.now(),
    );
}
