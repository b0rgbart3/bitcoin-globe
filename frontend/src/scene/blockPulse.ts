// ============================================================================
// frontend/src/scene/blockPulse.ts
// One shared clock for the block heartbeat. Both the shockwave shell and the
// node flare read from this, so they fire on the exact same instant.
//
// Module-level (not React state) on purpose: this is per-frame animation data,
// read inside useFrame — it must never trigger a re-render.
// ============================================================================

let pulseStart = -Infinity;

// Call when a new block arrives (or on the dev keypress).
export function firePulse(now: number): void {
  pulseStart = now;
}

// 0 -> 1 progress through the pulse; returns null when no pulse is active.
export function pulseProgress(now: number, duration: number): number | null {
  const t = now - pulseStart;
  if (t < 0 || t > duration) return null;
  return t / duration;
}
