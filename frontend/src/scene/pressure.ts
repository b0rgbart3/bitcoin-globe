// ~vBytes of pending mempool that reads as "high pressure". Tune to taste:

import type { MempoolState } from "@btcglobe/shared/types";

// lower = the atmosphere reacts sooner; higher = only real congestion lights it.
const MEMPOOL_REF_VBYTES = 90_000_000; // ~50 vMB

export function pressureFromMempool(m: MempoolState | null): number {
    if (!m) return 0;
    const level = Math.min(m.pendingVBytes / MEMPOOL_REF_VBYTES, 1); // slow tide
    const flow = Math.min(m.intakeVBytesPerSec / 2500, 1); // fast chop
    return level * 0.6 + flow * 0.4;
}

