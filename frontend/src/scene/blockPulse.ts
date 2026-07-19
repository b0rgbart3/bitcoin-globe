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

// Atmosphere dim that rides right after the heartbeat finishes.
// Returns a brightness multiplier: 1.0 = normal, dips to DIM_FLOOR at the midpoint.
// Tune DIM_FLOOR (0–1) and DIM_DURATION (seconds) to taste.
const DIM_FLOOR = 0.15;    // how deep the dip goes (0 = black, 1 = no dip)
const DIM_DURATION = 4.0;  // seconds the dim lasts
const DIM_OVERLAP = 3.0;   // seconds before heartbeat ends that the dim begins

export function atmosphereDimMultiplier(now: number, pulseDuration: number): number {
  const t = now - pulseStart - (pulseDuration - DIM_OVERLAP);
  if (t < 0 || t > DIM_DURATION) return 1.0;
  return 1.0 - (1.0 - DIM_FLOOR) * Math.sin((t / DIM_DURATION) * Math.PI);
}
