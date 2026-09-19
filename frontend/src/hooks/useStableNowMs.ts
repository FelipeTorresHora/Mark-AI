import { useState } from 'react';

/** Wall-clock ms captured once on mount — safe for render-time schedule comparisons. */
export function useStableNowMs(): number {
    return useState(() => Date.now())[0];
}
